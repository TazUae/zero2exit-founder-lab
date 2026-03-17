import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { logger } from '../logger.js'
import type { LLMTask } from './router.js'

/**
 * Strip markdown code fences from raw LLM output.
 */
export function stripCodeFences(text: string): string {
  let s = text.trim()
  const fenceMatch = s.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n?\s*```|$)/)
  if (fenceMatch && fenceMatch[1].trim()) return fenceMatch[1].trim()
  if (s.startsWith('```')) {
    const firstNewline = s.indexOf('\n')
    if (firstNewline !== -1) s = s.slice(firstNewline + 1)
  }
  if (s.endsWith('```')) s = s.slice(0, s.lastIndexOf('```'))
  return s.trim()
}

/**
 * Convert single-quoted JSON (Python/JS-style) to double-quoted JSON while
 * preserving apostrophes inside string values.
 *
 * Heuristic: when inside a single-quoted string and we encounter a `'`,
 * peek ahead past whitespace. If the next non-space char is a JSON structural
 * character (`,`, `}`, `]`, `:`) or end-of-string, treat it as the closing
 * delimiter. Otherwise treat it as an apostrophe and keep it as-is.
 */
export function fixSingleQuotedJSON(text: string): string {
  let result = ''
  let i = 0
  let inString = false
  let usingSingleQuotes = false

  while (i < text.length) {
    const ch = text[i]

    // Pass escape sequences through unchanged
    if (inString && ch === '\\') {
      result += text[i] + (text[i + 1] ?? '')
      i += 2
      continue
    }

    if (!inString) {
      if (ch === "'") {
        inString = true
        usingSingleQuotes = true
        result += '"'
      } else if (ch === '"') {
        inString = true
        usingSingleQuotes = false
        result += '"'
      } else {
        result += ch
      }
    } else if (!usingSingleQuotes) {
      // Inside double-quoted string: standard handling
      if (ch === '"') {
        inString = false
        result += '"'
      } else {
        result += ch
      }
    } else {
      // Inside single-quoted string
      if (ch === "'") {
        // Peek ahead past whitespace to decide: closing delimiter or apostrophe?
        let j = i + 1
        while (j < text.length && text[j] === ' ') j++
        const nextNonSpace = text[j] ?? ''
        if (',}]:'.includes(nextNonSpace) || j >= text.length) {
          // Looks like end of the string value
          inString = false
          result += '"'
        } else {
          // Apostrophe inside a string (e.g. "it's", "the 'idea' stage")
          result += "'"
        }
      } else if (ch === '"') {
        // Unescaped double-quote inside single-quoted string — escape it
        result += '\\"'
      } else {
        result += ch
      }
    }
    i++
  }

  return result
}

/**
 * Attempt to repair truncated JSON from LLM output by closing open
 * brackets/braces and removing incomplete trailing entries.
 */
export function repairTruncatedJSON(text: string): string {
  let repaired = text.replace(/,\s*"[^"]*"?\s*:\s*"[^"]*$/, '')
  repaired = repaired.replace(/,\s*\{[^}]*$/, '')

  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let escape = false
  for (const ch of repaired) {
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') openBraces++
    else if (ch === '}') openBraces--
    else if (ch === '[') openBrackets++
    else if (ch === ']') openBrackets--
  }

  if (inString) repaired += '"'
  repaired = repaired.replace(/,\s*$/, '')
  while (openBrackets > 0) { repaired += ']'; openBrackets-- }
  while (openBraces > 0) { repaired += '}'; openBraces-- }
  repaired = repaired.replace(/,\s*([}\]])/g, '$1')

  return repaired
}

/**
 * Extract and parse JSON from raw LLM text output.
 * Handles code fences, trailing commas, single quotes, and truncated output.
 */
export function extractJSON(raw: string): unknown {
  let text = stripCodeFences(raw)

  const braceStart = text.indexOf('{')
  const bracketStart = text.indexOf('[')
  let start = -1
  let end = -1

  if (braceStart !== -1 && (bracketStart === -1 || braceStart < bracketStart)) {
    start = braceStart
    end = text.lastIndexOf('}')
  } else if (bracketStart !== -1) {
    start = bracketStart
    end = text.lastIndexOf(']')
  }

  if (start !== -1 && end > start) {
    text = text.slice(start, end + 1)
  } else if (start !== -1) {
    text = text.slice(start)
  }

  try {
    return JSON.parse(text)
  } catch {
    // Remove trailing commas, then fix single-quoted JSON using the heuristic
    // converter (preserves apostrophes inside string values).
    let cleaned = fixSingleQuotedJSON(text.replace(/,\s*([}\]])/g, '$1'))
    try {
      return JSON.parse(cleaned)
    } catch {
      cleaned = repairTruncatedJSON(cleaned)
      try {
        return JSON.parse(cleaned)
      } catch (e) {
        logger.error({ text: text.slice(0, 500) }, 'extractJSON failed after cleanup+repair')
        throw e
      }
    }
  }
}

/**
 * Parse raw LLM text as JSON, optionally validate against a Zod schema.
 * Throws a controlled TRPCError on parse or validation failure.
 */
export function parseLLMResponse<T = unknown>(
  raw: string,
  task: LLMTask,
  label: string,
  schema?: z.ZodType<T>,
): T {
  let parsed: unknown
  try {
    parsed = extractJSON(raw)
  } catch (err) {
    logger.error({
      task,
      label,
      error: err instanceof Error ? err.message : String(err),
      rawLength: raw.length,
      rawSnippet: raw.slice(0, 500),
    }, 'LLM JSON parse failure')
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `LLM response parsing failed for ${label}. Please try again.`,
    })
  }

  if (!schema) return parsed as T

  const result = schema.safeParse(parsed)
  if (!result.success) {
    logger.error({
      task,
      label,
      issues: result.error.issues,
      parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : null,
    }, 'LLM output schema validation failure')
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `LLM response validation failed for ${label}. Please try again.`,
    })
  }

  return result.data
}
