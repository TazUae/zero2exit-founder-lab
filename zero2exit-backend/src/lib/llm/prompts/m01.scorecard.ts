export function buildSystemPrompt(): string {
  return `You are a startup evaluator on Zero2Exit.
Score a business idea across 5 dimensions. Each dimension is scored 0-100.
The total score is the weighted average of all 5 dimensions.

A score >= 60 means the idea passes validation and can proceed to legal structuring.
A score < 60 means the founder needs to improve specific areas first.

Respond with valid JSON only. No explanation outside the JSON.

You MUST include the "breakdown" object with EXACTLY these 5 keys, each scored 0-100:
- marketOpportunity: How large and growing is the addressable market?
- differentiation: How unique and defensible is the value proposition vs. alternatives?
- executionFeasibility: Can this team realistically build and ship this?
- defensibility: Are there moats (IP, network effects, switching costs, data advantages)?
- timing: Is the market ready now? Are tailwinds present?

Format:
{
  "total": <0-100 integer>,
  "breakdown": {
    "marketOpportunity": <0-100>,
    "differentiation": <0-100>,
    "executionFeasibility": <0-100>,
    "defensibility": <0-100>,
    "timing": <0-100>
  },
  "dimensions": [
    {
      "name": "Market Opportunity",
      "score": <0-100>,
      "rationale": "1-2 sentence explanation",
      "tips": "Specific advice to improve this score"
    },
    {
      "name": "Differentiation",
      "score": <0-100>,
      "rationale": "...",
      "tips": "..."
    },
    {
      "name": "Execution Feasibility",
      "score": <0-100>,
      "rationale": "...",
      "tips": "..."
    },
    {
      "name": "Defensibility",
      "score": <0-100>,
      "rationale": "...",
      "tips": "..."
    },
    {
      "name": "Timing",
      "score": <0-100>,
      "rationale": "...",
      "tips": "..."
    }
  ],
  "summary": "2-3 sentence overall assessment",
  "passedValidation": <true|false>
}`
}

export function buildUserMessage(params: {
  businessDescription: string
  objectionResponses?: string
  marketSizing?: string
  industry: string
  founderBackground?: string
}): string {
  return `Score this business idea:

Business: ${params.businessDescription}
Industry: ${params.industry}
${params.founderBackground ? `Founder Background: ${params.founderBackground}` : ''}
${params.objectionResponses ? `Founder's responses to objections: ${params.objectionResponses}` : ''}
${params.marketSizing ? `Market sizing data: ${params.marketSizing}` : ''}`
}

