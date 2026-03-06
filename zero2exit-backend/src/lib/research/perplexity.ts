import fetch from "node-fetch"
import { logger } from '../logger.js'

const PERPLEXITY_MODELS = ["sonar", "sonar-pro"]

const PERPLEXITY_TIMEOUT_MS = Number(process.env.PERPLEXITY_TIMEOUT_MS) || 60_000

export async function perplexitySearch(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not set")
  }

  for (const model of PERPLEXITY_MODELS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS)

    try {
      logger.info({ model }, 'perplexity_search_attempt')

      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a research analyst. Provide factual information with sources.",
              },
              {
                role: "user",
                content: query,
              },
            ],
            temperature: 0.2,
          }),
          signal: controller.signal,
        },
      )

      clearTimeout(timeoutId)

      const text = await response.text()

      if (!response.ok) {
        logger.warn({ model, status: response.status }, 'perplexity_model_failed')
        continue
      }

      let data: { choices?: { message?: { content?: string } }[] }
      try {
        data = JSON.parse(text) as {
          choices?: { message?: { content?: string } }[]
        }
      } catch {
        logger.warn({ model }, 'perplexity_response_parse_failed')
        continue
      }

      const content = data?.choices?.[0]?.message?.content
      if (content) {
        logger.info({ model, chars: content.length }, 'perplexity_search_success')
        return content
      }

      logger.warn({ model }, 'perplexity_empty_response')
    } catch (err) {
      clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === "AbortError"
      if (isAbort) {
        throw new Error(
          `Perplexity request timed out after ${PERPLEXITY_TIMEOUT_MS / 1000}s`,
        )
      }
      logger.warn({ err, model }, 'perplexity_model_error')
    }
  }

  throw new Error("All Perplexity models failed")
}
