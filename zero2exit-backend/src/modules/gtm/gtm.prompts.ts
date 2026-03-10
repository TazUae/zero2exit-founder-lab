import type { GtmSectionKey } from './gtm.types.js'
import { GTM_SECTION_LABELS } from './gtm.constants.js'

export type GtmPromptContext = {
  founderId: string
  founder: {
    name?: string | null
    email?: string
    language?: string
    stage?: string | null
    plan?: string
  }
  startup: Record<string, unknown>
  knowledgeSummary?: Record<string, unknown>
}

type PromptParts = {
  system: string
  user: string
}

/** Unmissable instruction: model MUST return parseable JSON only. */
const CRITICAL_JSON_ONLY = `CRITICAL: Your entire response must be exactly one JSON object. No markdown code blocks (no \`\`\`), no explanation before or after, no other text. Start with { and end with }. The response will be parsed by JSON.parse() — anything else will break the system.`

const JSON_ONLY_RULES = `You must respond with valid JSON only.
- Do not wrap JSON in markdown fences. Do not include explanations or markdown.
- All numeric fields must be numbers, not strings (e.g. tam: 3000000000 not "3B").
- Keep it concise, specific, and non-hype. Prefer concrete assumptions over generic claims.`

const VISUAL_PAYLOAD_SCHEMA = `
Base shape (always include):
  "title": "Section Title",
  "content": "2-4 strong paragraphs (plain text, no markdown)",
  "summary": "1-2 sentence summary",
  "bullets": ["3-7 crisp bullets"]

When required for this section (see below), also include exactly one of:
  "marketSizing": { "tam": number, "sam": number, "som": number }  — TAM >= SAM >= SOM; dollars (e.g. 3000000000).
  "competitors": [{ "name": string, "priceScore": number (0-100), "featureScore": number (0-100) }]
  "timeline": [{ "phase": string, "weeks": string }]
  "kpis": [{ "label": string, "value": string }]
  "investorReadiness": { "score": number (0-100), "strengths": string[], "risks": string[], "recommendation": string }

Numeric rules: TAM >= SAM >= SOM; all scores 0-100.`

function baseSystemPrompt(requiredVisualHint?: string): string {
  const hint = requiredVisualHint
    ? `\nThis section MUST include the following visual payload: ${requiredVisualHint}\n`
    : ''
  return `${CRITICAL_JSON_ONLY}

You are a go-to-market (GTM) strategist helping a founder produce a practical, investor-grade GTM document.
Write in professional startup strategy language. Avoid hype and vague claims.

Return ONLY valid JSON with this shape:
{
  "title": "Section Title",
  "content": "2-4 strong paragraphs (plain text, no markdown)",
  "summary": "1-2 sentence summary",
  "bullets": ["3-7 crisp bullets"]${requiredVisualHint ? ',\n  plus the required visual field(s) for this section (see below)' : ''}
}
${hint}
${VISUAL_PAYLOAD_SCHEMA}
${JSON_ONLY_RULES}`
}

function formatContext(ctx: GtmPromptContext): string {
  return `Founder:
${JSON.stringify(ctx.founder)}

Startup context (compact JSON):
${JSON.stringify(ctx.startup)}

Knowledge summary (compact JSON):
${JSON.stringify(ctx.knowledgeSummary ?? {})}`
}

export function buildProductOverviewPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.product_overview}" section.
Focus on what it is, who it is for, key workflow, and why it wins.
Avoid feature lists unless they support the value proposition.

${formatContext(ctx)}`,
  }
}

export function buildTargetCustomerPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt('marketSizing (tam, sam, som as numbers in dollars; TAM >= SAM >= SOM)'),
    user: `Write the "${GTM_SECTION_LABELS.target_customer}" section.
Define primary ICP and secondary ICPs, buyer vs user, firmographics/behaviors, triggers, and constraints.
Be explicit about who is NOT the target customer.

Your JSON MUST include this key (numbers in dollars, TAM >= SAM >= SOM):
"marketSizing": { "tam": 3000000000, "sam": 400000000, "som": 50000000 }

${formatContext(ctx)}`,
  }
}

export function buildMarketProblemPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.market_problem}" section.
Focus exclusively on the PROBLEM — not the solution or product.
Describe the job-to-be-done, current painful alternatives, switching costs, and why urgency is high now.
Include 2-3 concrete example scenarios and measurable consequences (lost time, lost revenue, compliance risk, etc.).
Do NOT describe what the product does. Do NOT overlap with the Value Proposition section.

${formatContext(ctx)}`,
  }
}

export function buildValuePropositionPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.value_proposition}" section.
Focus exclusively on the SOLUTION and the outcomes it delivers — not the problem itself.
State the value prop as measurable outcomes (time saved, revenue gained, risk reduced).
Call out 2-3 specific differentiators and credible proof points.
Do NOT re-describe the problem. Do NOT overlap with the Market Problem section.

${formatContext(ctx)}`,
  }
}

export function buildPositioningPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.positioning}" section.
Use the Geoffrey Moore positioning template as a framework:
"For [target customer], who [has a problem/need], [product name] is a [category] that [key benefit]. Unlike [alternatives], our product [differentiator]."

Then expand on:
1. Market position: where this product sits in the competitive landscape (niche, challenger, leader)
2. Mind-share target: the one thing we want buyers to associate with this brand
3. Positioning narrative: 2-3 sentences an investor or customer would use to describe us

Do NOT repeat the value proposition or feature list. Focus on WHERE and HOW the product is positioned relative to alternatives and in the buyer's mind.

${formatContext(ctx)}`,
  }
}

export function buildBuyerPersonaPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.buyer_persona}" section.
Create 2-3 detailed buyer personas. For each persona include:
- Name, title, company size/type
- Primary goal (what success looks like for them)
- Core frustrations with current solutions
- Buying criteria (top 3 things they evaluate)
- Typical objections and how to counter them
- Buying journey stage where we engage them

Go deeper than demographics — focus on psychology, decision drivers, and the buying process.
Do NOT repeat target customer firmographics from the Target Customer section. This section is about the buyer's mindset, not headcount or industry.

${formatContext(ctx)}`,
  }
}

export function buildCompetitiveLandscapePrompt(ctx: GtmPromptContext): PromptParts {
  const startup = ctx.startup ?? {}
  const ideaValidation =
    startup && typeof startup === 'object' && 'ideaValidation' in startup
      ? (startup as Record<string, unknown>).ideaValidation
      : undefined
  const competitiveMap =
    ideaValidation && typeof ideaValidation === 'object' && 'competitiveMap' in ideaValidation
      ? (ideaValidation as Record<string, unknown>).competitiveMap
      : undefined
  const hasCompetitiveMap =
    competitiveMap != null &&
    (Array.isArray(competitiveMap)
      ? competitiveMap.length > 0
      : Object.keys(competitiveMap as Record<string, unknown>).length > 0)

  const competitiveMapBlock = hasCompetitiveMap
    ? `Known competitors from market validation (M01 competitiveMap):
${JSON.stringify(competitiveMap)}`
    : 'No prior competitive data available from M01 (competitiveMap is null or empty). You must derive competitors from the industry context and business description.'

  return {
    system: baseSystemPrompt('competitors array: each { name, priceScore (0-100), featureScore (0-100) }'),
    user: `Write the "${GTM_SECTION_LABELS.competitive_landscape}" section.
Use the existing market validation work as your PRIMARY source of truth for competitors.

${competitiveMapBlock}

You MUST:
- Treat the M01 competitive map (if present) as the primary list of competitors and alternatives.
- Prefer those competitors over any generic industry list.
- Supplement with at most 2-3 additional competitors beyond what M01 provided, only if needed for completeness.
- Avoid inventing detailed competitors when M01 already includes enough names — focus on analyzing the ones provided.

For each competitor you discuss, analyze:
- Positioning: which segment they target, which jobs they solve best.
- Pricing tier: roughly where they sit (budget / mid-market / enterprise) based on context.
- Key strengths: 2-3 things they do very well for the ICP.
- Key weaknesses: 2-3 gaps or tradeoffs.
- Threat level: how dangerous they are to THIS specific business (low / medium / high) and why.

You MUST also explicitly cover:
- "Our differentiated position": a clear explanation of where we sit vs the competitors (segment, value, risk profile).
- "Whitespace opportunities": gaps in the landscape that our product can credibly own (segments underserved, use cases ignored, pricing/packaging gaps, etc.).
- "Competitive moat": what could make this business defensible over time (data, network effects, workflows, integrations, distribution, brand, etc.).

For the visual payload, your JSON MUST include this key (minimum 4 competitors + "Us", maximum 8 entries; priceScore and featureScore are numbers 0-100):
"competitors": [
  { "name": string, "priceScore": number, "featureScore": number }
]

Rules for this array:
- Derive priceScore and featureScore from your narrative analysis — do not assign random scores.
- priceScore = how expensive they are relative to the relevant market (0 = cheapest option, 100 = most expensive / highest ACV).
- featureScore = how feature-rich/capable they are relative to the market (0 = basic / minimal, 100 = most capable / enterprise-grade).
- Always include the founder's own product in this array as either "Us" or the actual product name from the idea validation context.
- Include at least 4 external competitors plus "Us", but never more than 8 total entries.

${formatContext(ctx)}`,
  }
}

export function buildPricingStrategyPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.pricing_strategy}" section.
Recommend packaging + pricing model (e.g. per seat, usage, tiered), anchor to value metric.
Include willingness-to-pay assumptions, initial price ranges, and a plan to validate pricing quickly.

${formatContext(ctx)}`,
  }
}

export function buildDistributionChannelsPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.distribution_channels}" section.
Select 2-4 primary channels and 2 secondary channels. Explain why they fit the ICP and constraints.
Include acquisition loops, expected sales cycle, and channel risks.

${formatContext(ctx)}`,
  }
}

export function buildMarketingStrategyPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.marketing_strategy}" section.
Outline messaging pillars, content strategy, and demand-gen tactics aligned to chosen channels.
Include the first 5-10 concrete campaigns/plays and how we’ll measure them.

${formatContext(ctx)}`,
  }
}

export function buildSalesStrategyPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "${GTM_SECTION_LABELS.sales_strategy}" section.
Define the sales motion (self-serve, inside sales, field, PLG+sales assist), funnel stages, and enablement assets.
Include qualification criteria, objections, and a simple 30/60/90 execution outline.

${formatContext(ctx)}`,
  }
}

export function buildLaunchPlan90DayPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt('timeline array: [{ phase: string, weeks: string }, ...] for each phase'),
    user: `Write the "${GTM_SECTION_LABELS.launch_plan_90_day}" section.
Provide a pragmatic 0-30, 31-60, 61-90 day plan with milestones, experiments, and expected learnings.
Assume limited resources unless the context says otherwise.

Your JSON MUST include this key (at least 3 phases):
"timeline": [ { "phase": "Foundation", "weeks": "Weeks 1-4" }, { "phase": "Launch", "weeks": "Weeks 5-8" }, { "phase": "Scale", "weeks": "Weeks 9-12" } ]

${formatContext(ctx)}`,
  }
}

export function buildKpisMetricsPrompt(ctx: GtmPromptContext): PromptParts {
  return {
    system: baseSystemPrompt('kpis array: [{ label: string, value: string }, ...]'),
    user: `CRITICAL: This is an ENTERPRISE B2B business.
DO NOT use consumer or SMB SaaS benchmarks under any circumstances.
The following consumer/SMB values are FORBIDDEN in your response:
- CAC below $5,000
- LTV below $100,000
- Payback period below 12 months
- MRR targets below $50,000
If you write any of these values, your response is wrong.

Write the "${GTM_SECTION_LABELS.kpis_metrics}" section.
You MUST provide specific numeric targets for every KPI. Do not describe what metrics to track — state the actual target values. Every bullet must contain a number.

Define the KPIs and 90-day targets that matter most for THIS specific business, not generic SaaS metrics.

ENTERPRISE B2B ANCHOR VALUES (use these as starting points and adjust from context):
This business charges $150,000–$500,000 per year per customer. Sales cycles are 6–12 months. A single sales rep can close 3–6 deals per year.
Therefore:
- CAC (fully-loaded including 6–12 months of sales effort) = $20,000–$80,000
- LTV (3-year contract at $200K avg ACV) ≈ $600,000
- LTV:CAC ratio target = 8:1 to 15:1
- Payback period = 12–18 months
Use THESE as your starting anchors. Adjust based on the specific context from the founder's M01 data and onboarding responses.

FORMAT REQUIREMENT (examples of format only — not values):
- Format each KPI as: [Metric Name]: [Target Value] — [Why this target]

Example of CORRECT enterprise KPI format:
{
  'label': 'Customer Acquisition Cost (CAC)',
  'value': '$35,000–$60,000'
},
{
  'label': 'Customer Lifetime Value (LTV)',
  'value': '$480,000 (3yr avg)'
},
{
  'label': 'LTV:CAC Ratio',
  'value': '8:1 target'
},
{
  'label': 'Sales Qualified Leads (90 days)',
  'value': '8–12 institutions'
},
{
  'label': 'Pilot-to-Contract Conversion',
  'value': '40% target'
},
{
  'label': 'Average Sales Cycle',
  'value': '< 8 months'
},
{
  'label': 'Annual Recurring Revenue (Month 12)',
  'value': '$400K–$600K'
},
{
  'label': 'Net Revenue Retention',
  'value': '> 110%'
}

These are EXAMPLES OF FORMAT ONLY. Derive your actual values from the founder's specific business context, pricing data, and M01 validation results. Do not copy these exact numbers — use them as scale references only.

Context you MUST use to infer the right metrics and targets:
- ctx.startup.ideaValidation: business description, ICP, market sizing (TAM/SAM/SOM), traction.
- ctx.startup.onboarding: business model, revenue model, GTM motion (PLG, sales-led, hybrid), stage (idea, MVP, pre-seed, seed, Series A, etc.).
- ctx.startup.legalStructure: entity type and any clues about markets/scale (if present).
- ctx.knowledgeSummary: any prior GTM content you or the system generated, especially pricing, packaging, sales motion, channels, and funnel data.

You MUST first infer the dominant business model from this context, then tailor KPIs and numeric targets accordingly:
- If clearly B2B enterprise / high ACV (e.g. contract values $20k-$500k+/year, multi-stakeholder sales, long cycles):
  - Typical CAC ranges are high: think $5,000–$50,000+ per customer.
  - LTV ranges are high: think $50,000–$500,000+ per customer.
  - Sales cycle is typically 3–12 months.
- If B2B SMB / mid-market:
  - CAC is approximately $500–$5,000 per customer.
  - LTV is approximately $5,000–$50,000.
  - Sales cycle is often 1–6 months.
- If B2C / consumer:
  - CAC is approximately $10–$200.
  - LTV is approximately $100–$2,000.
- If marketplace:
  - Focus less on CAC/LTV and more on GMV, take rate, liquidity metrics (e.g. % of listings that transact, time-to-first-transaction, buyer/seller balance).

From the context, explicitly decide which model applies (B2B enterprise, B2B SMB, B2C, marketplace, or something else) and choose metrics that make sense for that model.

For this section you MUST:
- Derive KPI LABELS that are appropriate for the inferred business model. Do not assume every business uses CAC/LTV if that does not fit.
- Derive KPI VALUES/TARGETS by combining:
  a) Any pricing and packaging data in the GTM document context (e.g. price points, ACV, ARPU, take rate).
  b) Market sizing and scale ambitions from idea validation (TAM/SAM/SOM, segments).
  c) Stage from onboarding — early-stage companies should have modest, learning-focused 90-day targets; later-stage can be more aggressive.
  d) Industry benchmarks for the specific sector, adjusted to the business model and stage.
- Cover a balanced set of 6–10 KPIs across:
  - Acquisition (e.g. leads, demo requests, CAC, conversion rates).
  - Activation (e.g. percentage reaching a key activation event, time-to-first-value).
  - Retention/engagement (e.g. logo retention, churn, product usage frequency).
  - Revenue/monetization (e.g. MRR/ARR, ACV, GMV, take rate, expansion revenue).
  - Efficiency (e.g. payback period, sales efficiency, LTV/CAC, burn multiple) where appropriate.
- Make 90-day targets realistic for the current stage and resource level (for a pre-seed MVP, focus on validating the funnel and hitting a small number of high-quality customers; for seed/Series A, targets can be higher).

HARD REQUIREMENT:
- Your response MUST include at least 8 specific KPIs with numeric 90-day targets.
- If you cannot derive a specific number from the context, you MUST state a justified estimate with your reasoning.
- Do NOT output meta-commentary like "align metrics with pricing" — output the actual metric targets with numbers.

Your JSON MUST include this key (minimum 8 metrics):
"kpis": [
  { "label": string, "value": string }
]

Each "label" should be a clear metric name (e.g. "Enterprise CAC", "Logo retention (6 months)", "Monthly GMV"), and each "value" should be a realistic 90-day target or range expressed as a short human-readable string (e.g. "Target: 3 new enterprise logos in 90 days").

Do NOT use generic SaaS B2C benchmarks unless the business is explicitly B2C in the provided context. Derive all values and ranges from the specific business context plus reasonable industry benchmarks.

${formatContext(ctx)}`,
  }
}

export const GTM_SECTION_PROMPT_BUILDERS: Record<GtmSectionKey, (ctx: GtmPromptContext) => PromptParts> = {
  product_overview: buildProductOverviewPrompt,
  target_customer: buildTargetCustomerPrompt,
  market_problem: buildMarketProblemPrompt,
  value_proposition: buildValuePropositionPrompt,
  positioning: buildPositioningPrompt,
  buyer_persona: buildBuyerPersonaPrompt,
  competitive_landscape: buildCompetitiveLandscapePrompt,
  pricing_strategy: buildPricingStrategyPrompt,
  distribution_channels: buildDistributionChannelsPrompt,
  marketing_strategy: buildMarketingStrategyPrompt,
  sales_strategy: buildSalesStrategyPrompt,
  launch_plan_90_day: buildLaunchPlan90DayPrompt,
  kpis_metrics: buildKpisMetricsPrompt,
}

