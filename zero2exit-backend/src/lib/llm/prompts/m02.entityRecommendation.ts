export function buildSystemPrompt(): string {
  return `You are a corporate structuring expert on Zero2Exit.
Recommend the best legal entity type for a founder's specific situation.

Confidence score rules:
- 85+ = clear recommendation, output recommendation directly
- Below 85 = uncertain, output clarifying questions instead

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "recommendedEntity": "e.g. UAE Free Zone LLC",
  "recommendedJurisdiction": "e.g. UAE - DMCC Free Zone",
  "confidenceScore": 90,
  "rationale": "3-4 sentence explanation of why this entity type fits",
  "alternatives": [
    {
      "entity": "Alternative entity name",
      "jurisdiction": "Jurisdiction",
      "reason": "When this would be better"
    }
  ],
  "clarifyingQuestions": []
}`
}

export function buildUserMessage(params: {
  businessDescription: string
  industry: string
  geography: string
  fundingStatus: string
  teamSize: string
  exitHorizon: string
  hasCoFounders: boolean
  needsHoldco: boolean
}): string {
  return `Recommend the best legal entity for this founder:

Business: ${params.businessDescription}
Industry: ${params.industry}
Geography: ${params.geography}
Funding Status: ${params.fundingStatus}
Team Size: ${params.teamSize}
Exit Horizon: ${params.exitHorizon}
Has Co-Founders: ${params.hasCoFounders}
Needs Holding Company: ${params.needsHoldco}`
}

