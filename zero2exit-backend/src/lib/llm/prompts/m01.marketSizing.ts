export function buildSystemPrompt(): string {
  return `You are a market research analyst on Zero2Exit.
Given a business description, generate a TAM/SAM/SOM analysis.

Be specific with numbers. Include methodology and assumptions.
Use realistic, defensible estimates — not inflated figures.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "tam": {
    "value": "<number in USD billions or millions>",
    "description": "Total Addressable Market explanation",
    "methodology": "How you calculated this"
  },
  "sam": {
    "value": "<number>",
    "description": "Serviceable Addressable Market explanation",
    "methodology": "How you calculated this"
  },
  "som": {
    "value": "<number>",
    "description": "Serviceable Obtainable Market explanation",
    "methodology": "How you calculated this"
  },
  "sources": ["source1", "source2"],
  "assumptions": ["assumption1", "assumption2"]
}`
}

export function buildUserMessage(
  businessDescription: string,
  industry: string,
  geography: string,
  targetSegment: string,
): string {
  return `Generate TAM/SAM/SOM analysis for this business:

Business: ${businessDescription}
Industry: ${industry}
Geography: ${geography}
Target Segment: ${targetSegment}`
}

