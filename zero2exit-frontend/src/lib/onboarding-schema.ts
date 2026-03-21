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

export type TextQuestion = BaseQuestion & {
  kind: "text"
  placeholder?: string
}

export type TextareaQuestion = BaseQuestion & {
  kind: "textarea"
  placeholder?: string
  minLength?: number
}

export type Question = SingleSelectQuestion | MultiSelectQuestion | TextQuestion | TextareaQuestion

// ─── Schema & defaults ──────────────────────────────────────────────────────

export const onboardingSchema = z.object({
  idea_description:   z.string().min(50, "Please describe your idea in at least 50 characters"),
  business_name:      z.string().default(""),
  industry:           z.string().min(1, "Please select an industry"),
  business_model:     z.string().min(1, "Please select a business model"),
  target_customer:    z.array(z.string()).min(1, "Please select at least one"),
  primary_country:    z.string().min(1, "Please select your primary country"),
  geographic_focus:   z.array(z.string()).min(1, "Please select at least one"),
  stage:              z.string().min(1, "Please select your stage"),
  revenue:            z.string().min(1, "Please select your revenue range"),
  team_size:          z.string().min(1, "Please select your team size"),
  funding:            z.string().min(1, "Please select your funding status"),
  actively_fundraising: z.boolean().default(false),
  known_competitors:  z.string().default(""),
  challenges:         z.array(z.string()).min(1, "Please select at least one"),
  preferred_language: z.string().min(1, "Please select a language"),
})

export type OnboardingFormValues = z.infer<typeof onboardingSchema>

export const ONBOARDING_DEFAULTS: OnboardingFormValues = {
  idea_description:   "",
  business_name:      "",
  industry:           "",
  business_model:     "",
  target_customer:    [],
  primary_country:    "",
  geographic_focus:   [],
  stage:              "",
  revenue:            "",
  team_size:          "",
  funding:            "",
  actively_fundraising: false,
  known_competitors:  "",
  challenges:         [],
  preferred_language: "",
}

// ─── Question configuration ─────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  // Q1
  {
    id: "idea_description",
    kind: "textarea",
    label: "In 1–2 sentences, what does your startup do and what problem does it solve?",
    placeholder: "e.g. We help dental clinics automate patient follow-ups using AI, reducing no-shows by 40%",
    minLength: 50,
  },
  // Q2
  {
    id: "business_name",
    kind: "text",
    label: "What's the working name for your startup?",
    placeholder: "e.g. DentaFlow, NovaMed... leave blank if undecided",
  },
  // Q3
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
  // Q4
  {
    id: "business_model",
    kind: "single",
    label: "How does your startup primarily make money?",
    options: [
      { value: "saas_subscriptions",   label: "SaaS subscriptions" },
      { value: "transaction_fees",     label: "Transaction / marketplace fees" },
      { value: "enterprise_contracts", label: "Enterprise contracts" },
      { value: "ads_or_affiliate",     label: "Advertising / affiliate" },
      { value: "hardware_or_services", label: "Hardware / services" },
      { value: "other",                label: "Other" },
    ],
  },
  // Q5
  {
    id: "target_customer",
    kind: "multi",
    label: "Who are you primarily building for?",
    maxSelections: 3,
    options: [
      { value: "consumers",        label: "Consumers (B2C)" },
      { value: "smb",              label: "Small & medium businesses" },
      { value: "enterprise",       label: "Large enterprises" },
      { value: "developers",       label: "Developers / technical teams" },
      { value: "creators",         label: "Creators / freelancers" },
      { value: "gov_or_nonprofit", label: "Government / non‑profits" },
    ],
  },
  // Q6
  {
    id: "primary_country",
    kind: "single",
    label: "Where is your company primarily based or planned to be incorporated?",
    options: [
      { value: "uae",     label: "UAE" },
      { value: "saudi",   label: "Saudi Arabia" },
      { value: "egypt",   label: "Egypt" },
      { value: "bahrain", label: "Bahrain" },
      { value: "kuwait",  label: "Kuwait" },
      { value: "qatar",   label: "Qatar" },
      { value: "oman",    label: "Oman" },
      { value: "jordan",  label: "Jordan" },
      { value: "lebanon", label: "Lebanon" },
      { value: "uk",      label: "UK" },
      { value: "usa",     label: "USA" },
      { value: "other",   label: "Other" },
    ],
  },
  // Q7
  {
    id: "geographic_focus",
    kind: "multi",
    label: "Where are you primarily focusing your market today?",
    options: [
      { value: "local",               label: "Local market only" },
      { value: "regional",            label: "Regional (e.g. MENA, EU, APAC)" },
      { value: "global_english",      label: "Global, English‑speaking first" },
      { value: "global_multilingual", label: "Global, multilingual from day one" },
    ],
  },
  // Q8
  {
    id: "stage",
    kind: "single",
    label: "Which best describes your current stage?",
    options: [
      { value: "idea",     label: "Idea / pre‑product" },
      { value: "pre_seed", label: "Pre‑seed (MVP, few users)" },
      { value: "seed",     label: "Seed (paying customers, growing)" },
      { value: "growth",   label: "Growth (scaling revenue)" },
      { value: "scale",    label: "Scale‑up (multi‑team org)" },
    ],
  },
  // Q9
  {
    id: "revenue",
    kind: "single",
    label: "What best describes your current annual revenue run‑rate?",
    options: [
      { value: "none",     label: "No revenue yet" },
      { value: "<10k",     label: "< $10k" },
      { value: "10k_100k", label: "$10k – $100k" },
      { value: "100k_1m",  label: "$100k – $1m" },
      { value: "1m_5m",    label: "$1m – $5m" },
      { value: "5m_plus",  label: "$5m+" },
    ],
  },
  // Q10
  {
    id: "team_size",
    kind: "single",
    label: "How big is your core team (including founders)?",
    options: [
      { value: "solo",    label: "Solo founder" },
      { value: "2_3",     label: "2–3 people" },
      { value: "4_10",    label: "4–10 people" },
      { value: "11_25",   label: "11–25 people" },
      { value: "26_plus", label: "26+ people" },
    ],
  },
  // Q11
  {
    id: "funding",
    kind: "single",
    label: "What is your current funding status?",
    options: [
      { value: "bootstrapped",     label: "Bootstrapped" },
      { value: "friends_family",   label: "Friends & family" },
      { value: "angel",            label: "Angel funded" },
      { value: "vc_pre_seed_seed", label: "VC‑backed (pre‑seed/seed)" },
      { value: "vc_series_a_plus", label: "VC‑backed (Series A+)" },
    ],
    extraCheckbox: {
      id: "actively_fundraising",
      label: "We are actively fundraising right now",
    },
  },
  // Q12
  {
    id: "known_competitors",
    kind: "text",
    label: "Name 1–3 main competitors or similar players",
    placeholder: "e.g. Salesforce, HubSpot, Zoho (leave blank if none)",
  },
  // Q13
  {
    id: "challenges",
    kind: "multi",
    label: "What are your biggest near‑term challenges?",
    maxSelections: 3,
    options: [
      { value: "idea_clarity",      label: "Clarifying the idea & focus" },
      { value: "finding_customers", label: "Finding early customers" },
      { value: "retention",         label: "Improving retention / engagement" },
      { value: "hiring",            label: "Hiring / building the team" },
      { value: "fundraising",       label: "Fundraising strategy" },
      { value: "execution",         label: "Execution & prioritisation" },
    ],
  },
  // Q14
  {
    id: "preferred_language",
    kind: "single",
    label: "Preferred platform language",
    options: [
      { value: "en",   label: "English" },
      { value: "ar",   label: "Arabic" },
      { value: "both", label: "Both" },
    ],
  },
]
