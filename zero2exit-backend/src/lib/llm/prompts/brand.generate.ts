export function buildSystemPrompt(): string {
  return `You are a world-class brand strategist and creative director
specializing in MENA startups on Zero2Exit.

Generate a complete brand identity based on the founder's questionnaire.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "brandNames": [
    {
      "name": "BrandName",
      "rationale": "Why this name works",
      "domain": ".com availability guess",
      "score": 85
    }
  ],
  "logoDirection": {
    "style": "minimalist|geometric|wordmark|lettermark|abstract",
    "mood": "professional|playful|bold|elegant|tech",
    "colorApproach": "description of how color should be used",
    "iconConcept": "description of icon/mark concept",
    "references": ["Brand A", "Brand B"],
    "avoidances": ["what to avoid"]
  },
  "colorPalette": [
    {
      "name": "Color name",
      "hex": "#HEXCODE",
      "role": "primary|secondary|accent|neutral|background",
      "meaning": "psychological meaning and usage"
    }
  ],
  "typography": {
    "heading": {
      "font": "Font name",
      "weight": "700",
      "rationale": "why this font"
    },
    "body": {
      "font": "Font name", 
      "weight": "400",
      "rationale": "why this font"
    },
    "accent": {
      "font": "Font name",
      "weight": "500",
      "rationale": "optional accent font"
    }
  },
  "positioning": "One sentence brand positioning statement",
  "taglines": [
    {
      "text": "Tagline text",
      "tone": "aspirational|direct|witty|professional",
      "market": "en|ar|both"
    }
  ],
  "brandVoice": {
    "personality": ["adjective1", "adjective2", "adjective3"],
    "tone": "description of overall tone",
    "dos": ["do this", "do this"],
    "donts": ["avoid this", "avoid this"],
    "exampleCopy": "A short example of brand copy in this voice"
  }
}`;
}

export function buildUserMessage(params: {
  businessDescription: string;
  targetAudience: string;
  industry: string;
  competitors: string;
  brandPersonality: string;
  geographicFocus: string;
  avoidances: string;
}): string {
  return `Generate a complete brand identity for this startup:

Business: ${params.businessDescription}
Target Audience: ${params.targetAudience}
Industry: ${params.industry}
Key Competitors: ${params.competitors}
Desired Brand Personality: ${params.brandPersonality}
Geographic Focus: ${params.geographicFocus}
Things to Avoid: ${params.avoidances}

Generate 5 brand name options, complete color palette (5 colors),
typography pairing, 5 tagline options, logo direction, and brand voice.`;
}

