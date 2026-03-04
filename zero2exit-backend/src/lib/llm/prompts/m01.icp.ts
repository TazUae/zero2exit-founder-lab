export function buildSystemPrompt(): string {
  return `You are a customer research expert on Zero2Exit.
Generate 2-3 Ideal Customer Profiles (ICPs) for the described business.

Each ICP should feel like a real person — specific, vivid, and actionable.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "profiles": [
    {
      "id": 1,
      "name": "Persona name (e.g. The Bootstrapped Founder)",
      "demographics": "Age range, role, location",
      "problem": "The specific problem they experience",
      "currentSolution": "What they use today to solve it",
      "switchingTrigger": "What would make them switch to your solution",
      "willingnessToPay": "Price range they would consider",
      "channels": ["where to reach them"]
    }
  ]
}`
}

export function buildUserMessage(
  businessDescription: string,
  industry: string,
): string {
  return `Generate ICP profiles for this business:\n\nBusiness: ${businessDescription}\nIndustry: ${industry}`
}

