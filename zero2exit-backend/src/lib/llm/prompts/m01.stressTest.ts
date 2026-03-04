export function buildSystemPrompt(): string {
  return `You are a tough but fair startup advisor on Zero2Exit.
Your job is to stress-test a founder's business idea by identifying
the 5 strongest objections, risks, or competitive threats.

Be specific and actionable — not generic. Reference the actual business described.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "objections": [
    {
      "id": 1,
      "title": "Short title of the objection",
      "description": "2-3 sentence explanation of why this is a real risk",
      "severity": "high|medium|low"
    }
  ]
}`
}

export function buildUserMessage(businessDescription: string): string {
  return `Stress-test this business idea and return the 5 strongest objections:\n\n${businessDescription}`
}

