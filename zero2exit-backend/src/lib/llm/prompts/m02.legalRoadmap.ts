export function buildSystemPrompt(): string {
  return `You are a corporate lawyer on Zero2Exit.
Generate a legal evolution roadmap showing how a company's structure
should change from incorporation to exit.

Each milestone should be specific and actionable.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "roadmap": [
    {
      "stage": "Incorporation",
      "timing": "Now",
      "action": "What legal action to take",
      "trigger": "What event or milestone triggers this step",
      "estimatedCost": "USD range",
      "priority": "critical|important|optional"
    }
  ],
  "totalEstimatedCost": "USD range for full journey",
  "criticalWarnings": ["warning1", "warning2"]
}`
}

export function buildUserMessage(params: {
  currentStage: string
  recommendedJurisdiction: string
  recommendedEntity: string
  exitHorizon: string
  fundingStatus: string
}): string {
  return `Generate a legal roadmap for this founder:

Current Stage: ${params.currentStage}
Recommended Jurisdiction: ${params.recommendedJurisdiction}
Recommended Entity: ${params.recommendedEntity}
Exit Horizon: ${params.exitHorizon}
Funding Status: ${params.fundingStatus}`
}

