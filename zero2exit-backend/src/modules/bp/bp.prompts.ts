import type { BpSectionKey } from './bp.sections.js'

export type BpPromptContext = {
  founderId: string
  founder: {
    name?: string | null
    email?: string
    language?: string
    stage?: string | null
    plan?: string
  }
  startup: Record<string, unknown>
}

export type FinancialPromptContext = {
  founder: BpPromptContext['founder']
  startup: Record<string, unknown>
  inputs: Record<string, unknown>
}

type PromptParts = {
  system: string
  user: string
}

const CRITICAL_JSON_ONLY = `CRITICAL: Your entire response must be exactly one JSON object. No markdown code blocks (no \`\`\`), no explanation before or after, no other text. Start with { and end with }.
JSON FORMAT RULES (violations will crash the parser):
- Use double quotes (") for ALL JSON keys and string values. Never use single quotes (') as delimiters.
- Do NOT put apostrophes or single quotes inside string values. Instead of "it's" write "it is".
- Do NOT put unescaped double quotes inside a string value. Use \\\" if you must include one.
The response will be parsed by JSON.parse() — any deviation from these rules breaks the system.`

const JSON_ONLY_RULES = `You must respond with valid JSON only.
- Do not wrap JSON in markdown fences. Do not include explanations or markdown.
- All numeric fields must be numbers, not strings.
- Keep it concise, specific, and non-hype. Prefer concrete assumptions over generic claims.`

const BASE_OUTPUT_SHAPE = `Return ONLY valid JSON with this shape:
{
  "title": "Section Title",
  "content": "2-4 strong paragraphs (plain text, no markdown)",
  "summary": "1-2 sentence summary",
  "bullets": ["3-7 crisp bullets"]
}`

function baseSystemPrompt(): string {
  return `${CRITICAL_JSON_ONLY}

You are a world-class startup advisor writing an investor-ready business plan section.
Write in professional language. Avoid hype and vague claims. Be specific and concrete.

${BASE_OUTPUT_SHAPE}

${JSON_ONLY_RULES}`
}

function formatContext(ctx: BpPromptContext): string {
  return `Founder:
${JSON.stringify(ctx.founder)}

Startup context (compact JSON):
${JSON.stringify(ctx.startup)}`
}

// ── Section prompt builders ───────────────────────────────────────────────────

export function buildExecutiveSummaryPrompt(ctx: BpPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "Executive Summary" section of a business plan.
This is the most important section — it must compel an investor to keep reading.
Cover in order: (1) the problem, (2) the solution and why it wins, (3) market size,
(4) business model and early traction, (5) the ask or next milestone.
Keep it tight — no more than 400 words. Every sentence must earn its place.

${formatContext(ctx)}`,
  }
}

export function buildProblemSolutionPrompt(ctx: BpPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "Problem & Solution" section of a business plan.

PROBLEM (first half): Describe the specific pain point with concrete evidence.
- Who suffers from it, how often, at what cost (time, money, risk)?
- Why do current alternatives fail? What is the workaround pain?
- What makes the timing right now — regulatory, technology, or market shift?

SOLUTION (second half): Describe how the product uniquely solves it.
- The core mechanism — what does the product actually do differently?
- 2-3 concrete differentiators (not generic claims like "AI-powered").
- A crisp value proposition statement the founder could say in 10 seconds.

Do NOT conflate problem and solution. Keep them clearly separate.

${formatContext(ctx)}`,
  }
}

export function buildMarketOpportunityPrompt(ctx: BpPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "Market Opportunity" section of a business plan.
Include:
- TAM (Total Addressable Market): the broadest possible market in dollars/year.
- SAM (Serviceable Addressable Market): the segment this product can realistically reach.
- SOM (Serviceable Obtainable Market): what this company can capture in 3-5 years.
- Key growth drivers: why this market is expanding (regulatory, demographic, technology trends).
- Source your numbers from the idea validation data if available; otherwise use reasonable estimates
  and state the assumptions clearly.

TAM must be >= SAM must be >= SOM. All values in dollars.

${formatContext(ctx)}`,
  }
}

export function buildBusinessModelPrompt(ctx: BpPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "Business Model" section of a business plan.
Cover:
- Primary revenue model (subscription, transaction fee, usage, services, marketplace, hardware).
- Pricing strategy: tiers, pricing metric, anchor price, and rationale.
- Unit economics: estimated CAC, LTV, payback period, and gross margin range.
- Revenue streams: primary + any secondary streams (upsell, expansion, partnerships).
- Scalability narrative: how does margin improve as the business scales?

Use numbers from the startup context wherever available. If data is sparse, state clear assumptions.

${formatContext(ctx)}`,
  }
}

export function buildGoToMarketPrompt(ctx: BpPromptContext): PromptParts {
  const gtmData = (ctx.startup as Record<string, unknown>).gtm
  const hasGtm = Array.isArray(gtmData) && gtmData.length > 0

  const gtmBlock = hasGtm
    ? `Completed GTM strategy sections are available in the startup context under "gtm".
Use them as the primary source of truth for channels, positioning, and launch sequencing.`
    : `No completed GTM module data is available. Derive the go-to-market strategy from
the onboarding responses, idea validation, and business model context.`

  return {
    system: baseSystemPrompt(),
    user: `Write the "Go-To-Market Strategy" section of a business plan.
${gtmBlock}

Cover:
- Target customer segment and ICP (2-3 sentences, not a full persona).
- Primary acquisition channels (2-3) and why they fit this ICP and stage.
- Launch sequencing: the first 30-90 days of customer acquisition.
- Sales motion: self-serve, inside sales, PLG, or hybrid — and why.
- Key partnerships or distribution leverage points if any.

Keep this section concise — the full GTM detail lives in a separate document.
This section should give investors confidence the team knows how to acquire customers.

${formatContext(ctx)}`,
  }
}

export function buildTeamPrompt(ctx: BpPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "Team" section of a business plan.
Cover:
- Founders: name, relevant background, and why they are uniquely qualified to build this.
- Key hires or co-founders: roles and why each is critical.
- Advisors or investors (if mentioned in context): name, affiliation, and value-add.
- Team composition gaps: what key hires are planned in the next 12 months?
- The "why this team" narrative: what unfair advantage does this team have?

If specific team details are not in the context, write a strong template that the founder
should fill in, framed as: "This section should include [X]..."
Do NOT invent specific credentials. Use only what is provided in the context.

${formatContext(ctx)}`,
  }
}

export function buildTractionMilestonesPrompt(ctx: BpPromptContext): PromptParts {
  return {
    system: baseSystemPrompt(),
    user: `Write the "Traction & Milestones" section of a business plan.
Cover:
- Current traction: users, revenue, pilots, letters of intent, partnerships, or notable
  validation signals. Use numbers from the context wherever possible.
- Key milestones achieved to date (product, commercial, technical).
- 12-month roadmap: 3-5 specific milestones with rough timing (Q1, Q2, etc.).
- How each milestone de-risks the business and unlocks the next stage of funding.

If traction data is sparse in the context, focus the section on the milestone roadmap
and frame any early signals as validation (interviews, waitlist, pilots) rather than
falsely claiming revenue or users.

${formatContext(ctx)}`,
  }
}

// ── Financials prompt ─────────────────────────────────────────────────────────

export function buildFinancialsPrompt(ctx: FinancialPromptContext): PromptParts {
  return {
    system: `${CRITICAL_JSON_ONLY}

You are a startup CFO building a 3-year financial projection for an early-stage company.
Use the provided inputs as your base assumptions. Show conservative, base, and optimistic
scenarios only if explicitly asked — otherwise output a single base-case projection.

Return ONLY valid JSON with this exact shape (all revenue/cost fields are annual USD totals):
{
  "revenueY1": number,
  "revenueY2": number,
  "revenueY3": number,
  "customersY1": number,
  "customersY2": number,
  "customersY3": number,
  "costsY1": number,
  "costsY2": number,
  "costsY3": number,
  "grossMarginY1": number,
  "grossMarginY2": number,
  "grossMarginY3": number,
  "breakEvenMonth": number,
  "burnRateMonthly": number,
  "summary": "2-3 sentence plain-text summary of the projection"
}

Rules:
- grossMarginY1/Y2/Y3 are percentages (0-100), not dollar amounts.
- breakEvenMonth is the month number from company start when cumulative revenue >= cumulative costs (1-60).
- burnRateMonthly is the average monthly cash burn in USD before break-even.
- All numbers must be realistic for an early-stage startup. Do not project hockey-stick growth without justification from the inputs.
${JSON_ONLY_RULES}`,
    user: `Generate a 3-year financial projection using these inputs:
${JSON.stringify(ctx.inputs, null, 2)}

Founder context:
${JSON.stringify(ctx.founder)}

Startup context:
${JSON.stringify(ctx.startup)}

Calculation guidance:
- Year 1 revenue = pricePerCustomer * 12 * (targetCustomersY1 growth curve, starting from 0).
  Assume customers ramp linearly through the year, so effective annual revenue ≈ pricePerCustomer * 12 * (targetCustomersY1 / 2).
- Apply churnRate monthly to the customer base when projecting Y2 and Y3.
- Gross margin = (revenue - direct COGS) / revenue. For SaaS, COGS is typically 10-20% of revenue.
- Total annual costs = monthlyCosts * 12 + (cac * new customers acquired that year).
- breakEvenMonth: find the first month where cumulative revenue >= cumulative costs.
- burnRateMonthly: average of monthly (costs - revenue) across pre-break-even months.`,
  }
}

// ── Section prompt builder map ────────────────────────────────────────────────

export const BP_SECTION_PROMPT_BUILDERS: Record<BpSectionKey, (ctx: BpPromptContext) => PromptParts> = {
  executive_summary: buildExecutiveSummaryPrompt,
  problem_solution: buildProblemSolutionPrompt,
  market_opportunity: buildMarketOpportunityPrompt,
  business_model: buildBusinessModelPrompt,
  go_to_market: buildGoToMarketPrompt,
  team: buildTeamPrompt,
  traction_milestones: buildTractionMilestonesPrompt,
}
