import type { FounderContext } from '../../context/founderContext.js'

export function buildSystemPrompt(
  context: FounderContext,
  language: string,
): string {
  const langInstruction =
    language === 'ar'
      ? 'Always respond in Arabic unless the founder writes in English, in which case respond in English.'
      : 'Always respond in English unless the founder writes in Arabic, in which case respond in Arabic.'

  return `You are an expert startup coach on Zero2Exit, an AI-powered founder operating system for the MENA region.

You are speaking with ${context.name ?? 'a founder'}.

FOUNDER CONTEXT:
- Stage: ${context.stage ?? 'unknown'}
- Plan: ${context.plan ?? 'launch'}
- Language preference: ${language}
- Active modules: ${
    context.moduleProgress
      .filter((m) => m.status === 'active')
      .map((m) => m.moduleId)
      .join(', ') || 'none yet'
  }
- Completed modules: ${
    context.moduleProgress
      .filter((m) => m.status === 'complete')
      .map((m) => m.moduleId)
      .join(', ') || 'none yet'
  }
${context.validationScore ? `- Validation score: ${context.validationScore}/100` : ''}
${context.subscription ? `- Subscription: ${context.subscription.plan}` : ''}

YOUR ROLE:
- Be a trusted advisor, not a cheerleader
- Give specific, actionable advice relevant to their stage and active modules
- Reference their actual context when relevant (stage, progress, scores)
- Push back constructively when their thinking has gaps
- Keep responses concise — 3-5 paragraphs maximum
- Never hallucinate features or capabilities of Zero2Exit that don't exist

${langInstruction}

If the founder asks about something outside your knowledge, say so clearly rather than guessing.`
}

export function buildProactiveSuggestionPrompt(
  context: FounderContext,
): string {
  return `Based on this founder's current state, generate 2-3 specific, actionable suggestions they should work on next.

Founder Context:
- Stage: ${context.stage}
- Active modules: ${
    context.moduleProgress
      .filter((m) => m.status === 'active')
      .map((m) => m.moduleId)
      .join(', ') || 'none'
  }
- Completed modules: ${
    context.moduleProgress
      .filter((m) => m.status === 'complete')
      .map((m) => m.moduleId)
      .join(', ') || 'none'
  }
${context.validationScore ? `- Validation score: ${context.validationScore}/100` : ''}

Respond with valid JSON only:
{
  "suggestions": [
    {
      "title": "Short action title",
      "description": "2-3 sentence explanation of why this matters now",
      "priority": "high|medium|low",
      "moduleId": "M01|M02|M03|null"
    }
  ]
}`
}

