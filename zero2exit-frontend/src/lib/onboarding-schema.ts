import { z } from "zod"

type BaseQuestion = {
  id: keyof OnboardingFormValues
  label: string
}

type Option = {
  value: string
  label: string
}

export type SingleSelectQuestion = BaseQuestion & {
  kind: "single"
  options: Option[]
  extraCheckbox?: {
    id: keyof OnboardingFormValues
    label: string
  }
}

export type MultiSelectQuestion = BaseQuestion & {
  kind: "multi"
  options: Option[]
  maxSelections?: number
}

export type Question = SingleSelectQuestion | MultiSelectQuestion

// ─── Schema & defaults ─────────────────────────────────────────────────────────

export const onboardingSchema = z.object({
  business_model: z.string().min(1),
  industry: z.string().min(1),
  target_customer: z.array(z.string()).min(1),
  stage: z.string().min(1),
  revenue: z.string().min(1),
  team_size: z.string().min(1),
  funding_status: z.string().min(1),
  actively_fundraising: z.boolean().default(false),
  exit_plan: z.string().min(1),
  competitors: z.array(z.string()).min(1),
  advantage: z.array(z.string()).min(1),
  challenge: z.array(z.string()).min(1),
  geographic_focus: z.array(z.string()).min(1),
})

// Infer the form values from the schema so the resolver and form stay in sync
export type OnboardingFormValues = z.infer<typeof onboardingSchema>

export const ONBOARDING_DEFAULTS: OnboardingFormValues = {
  business_model: "",
  industry: "",
  target_customer: [],
  stage: "",
  revenue: "",
  team_size: "",
  funding_status: "",
  actively_fundraising: false,
  exit_plan: "",
  competitors: [],
  advantage: [],
  challenge: [],
  geographic_focus: [],
}

// ─── Question configuration ─────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  {
    id: "business_model",
    kind: "single",
    label: "How does your startup primarily make money?",
    options: [
      { value: "saas_subscriptions", label: "SaaS subscriptions" },
      { value: "transaction_fees", label: "Transaction / marketplace fees" },
      { value: "enterprise_contracts", label: "Enterprise contracts" },
      { value: "ads_or_affiliate", label: "Advertising / affiliate" },
      { value: "hardware_or_services", label: "Hardware / services" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "industry",
    kind: "single",
    label: "What industry are you building in?",
    options: [
      { value: "fintech",     label: "FinTech / Payments" },
      { value: "healthtech",  label: "HealthTech / MedTech" },
      { value: "edtech",      label: "EdTech" },
      { value: "ecommerce",   label: "E-commerce / Retail" },
      { value: "saas",        label: "SaaS / B2B Software" },
      { value: "marketplace", label: "Marketplace" },
      { value: "proptech",    label: "Real Estate / PropTech" },
      { value: "logistics",   label: "Logistics / Supply Chain" },
      { value: "media",       label: "Media / Content" },
      { value: "ai_data",     label: "AI / Data" },
      { value: "other",       label: "Other" },
    ],
  },
  {
    id: "target_customer",
    kind: "multi",
    label: "Who are you primarily building for?",
    maxSelections: 3,
    options: [
      { value: "consumers", label: "Consumers (B2C)" },
      { value: "smb", label: "Small & medium businesses" },
      { value: "enterprise", label: "Large enterprises" },
      { value: "developers", label: "Developers / technical teams" },
      { value: "creators", label: "Creators / freelancers" },
      { value: "gov_or_nonprofit", label: "Government / non‑profits" },
    ],
  },
  {
    id: "stage",
    kind: "single",
    label: "Which best describes your current stage?",
    options: [
      { value: "idea", label: "Idea / pre‑product" },
      { value: "pre_seed", label: "Pre‑seed (MVP, few users)" },
      { value: "seed", label: "Seed (paying customers, growing)" },
      { value: "growth", label: "Growth (scaling revenue)" },
      { value: "scale", label: "Scale‑up (multi‑team org)" },
    ],
  },
  {
    id: "revenue",
    kind: "single",
    label: "What best describes your current annual revenue run‑rate?",
    options: [
      { value: "none", label: "No revenue yet" },
      { value: "<10k", label: "< $10k" },
      { value: "10k_100k", label: "$10k – $100k" },
      { value: "100k_1m", label: "$100k – $1m" },
      { value: "1m_5m", label: "$1m – $5m" },
      { value: "5m_plus", label: "$5m+" },
    ],
  },
  {
    id: "team_size",
    kind: "single",
    label: "How big is your core team (including founders)?",
    options: [
      { value: "solo", label: "Solo founder" },
      { value: "2_3", label: "2–3 people" },
      { value: "4_10", label: "4–10 people" },
      { value: "11_25", label: "11–25 people" },
      { value: "26_plus", label: "26+ people" },
    ],
  },
  {
    id: "funding_status",
    kind: "single",
    label: "What is your current funding status?",
    options: [
      { value: "bootstrapped", label: "Bootstrapped" },
      { value: "friends_family", label: "Friends & family" },
      { value: "angel", label: "Angel funded" },
      { value: "vc_pre_seed_seed", label: "VC‑backed (pre‑seed/seed)" },
      { value: "vc_series_a_plus", label: "VC‑backed (Series A+)" },
    ],
    extraCheckbox: {
      id: "actively_fundraising",
      label: "We are actively fundraising right now",
    },
  },
  {
    id: "exit_plan",
    kind: "single",
    label: "Do you have a preferred long‑term exit path?",
    options: [
      { value: "undecided", label: "Undecided / too early" },
      { value: "acquisition", label: "Likely acquisition" },
      { value: "ipo", label: "IPO ambition" },
      { value: "cash_cow", label: "Profitable, long‑term cash‑flow" },
    ],
  },
  {
    id: "competitors",
    kind: "multi",
    label: "How crowded is your competitive landscape?",
    options: [
      { value: "no_direct", label: "No obvious direct competitors" },
      { value: "few", label: "A few clear competitors" },
      { value: "many", label: "Many players in this space" },
      { value: "category_leaders", label: "Well‑funded category leaders" },
    ],
  },
  {
    id: "advantage",
    kind: "multi",
    label: "Where is your strongest unfair advantage today?",
    maxSelections: 3,
    options: [
      { value: "founder_experience", label: "Founder / domain experience" },
      { value: "proprietary_data", label: "Proprietary data / insights" },
      { value: "technology", label: "Technology / product quality" },
      { value: "distribution", label: "Distribution / audience access" },
      { value: "pricing", label: "Pricing / business model" },
      { value: "brand", label: "Brand / community" },
    ],
  },
  {
    id: "challenge",
    kind: "multi",
    label: "What are your biggest near‑term challenges?",
    maxSelections: 3,
    options: [
      { value: "idea_clarity", label: "Clarifying the idea & focus" },
      { value: "finding_customers", label: "Finding early customers" },
      { value: "retention", label: "Improving retention / engagement" },
      { value: "hiring", label: "Hiring / building the team" },
      { value: "fundraising", label: "Fundraising strategy" },
      { value: "execution", label: "Execution & prioritisation" },
    ],
  },
  {
    id: "geographic_focus",
    kind: "multi",
    label: "Where are you primarily focusing your market today?",
    options: [
      { value: "local", label: "Local market only" },
      { value: "regional", label: "Regional (e.g. MENA, EU, APAC)" },
      { value: "global_english", label: "Global, English‑speaking first" },
      { value: "global_multilingual", label: "Global, multilingual from day one" },
    ],
  },
]

