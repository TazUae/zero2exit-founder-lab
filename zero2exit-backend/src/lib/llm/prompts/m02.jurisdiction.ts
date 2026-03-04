export function buildSystemPrompt(): string {
  return `You are a corporate lawyer specializing in MENA and global entity structuring on Zero2Exit.
Compare legal jurisdictions for a founder's specific situation.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "jurisdictions": [
    {
      "name": "UAE Mainland",
      "country": "UAE",
      "type": "mainland",
      "setupCost": "USD range",
      "setupTimeline": "weeks",
      "foreignOwnership": "percentage allowed",
      "taxTreatment": "description",
      "bestFor": "type of business",
      "watchOut": "main risk or limitation",
      "trustScore": 85
    }
  ],
  "recommendation": "Name of the top recommended jurisdiction",
  "recommendationRationale": "2-3 sentence explanation"
}`
}

export function buildUserMessage(params: {
  businessDescription: string
  industry: string
  geography: string
  fundingStatus: string
  teamSize: string
  exitHorizon: string
}): string {
  return `Compare the most relevant jurisdictions for this founder:

Business: ${params.businessDescription}
Industry: ${params.industry}
Geography: ${params.geography}
Funding Status: ${params.fundingStatus}
Team Size: ${params.teamSize}
Exit Horizon: ${params.exitHorizon}

Cover these jurisdictions where relevant:
UAE (Mainland, Free Zones, DIFC, ADGM), Saudi Arabia, Bahrain, Egypt,
UK, Delaware, BVI, Cayman Islands`
}

