export const GTM_SECTION_KEYS = [
  "product_overview",
  "target_customer",
  "market_problem",
  "value_proposition",
  "positioning",
  "buyer_persona",
  "competitive_landscape",
  "pricing_strategy",
  "distribution_channels",
  "marketing_strategy",
  "sales_strategy",
  "launch_plan_90_day",
  "kpis_metrics",
] as const;

export type GtmSectionKey = (typeof GTM_SECTION_KEYS)[number];

export const GTM_SECTION_LABELS: Record<GtmSectionKey, string> = {
  product_overview: "Product Overview",
  target_customer: "Target Customer",
  market_problem: "Market Problem",
  value_proposition: "Value Proposition",
  positioning: "Positioning",
  buyer_persona: "Buyer Persona",
  competitive_landscape: "Competitive Landscape",
  pricing_strategy: "Pricing Strategy",
  distribution_channels: "Distribution Channels",
  marketing_strategy: "Marketing Strategy",
  sales_strategy: "Sales Strategy",
  launch_plan_90_day: "90-Day Launch Plan",
  kpis_metrics: "KPIs & Metrics",
};

export type DefaultGtmSection = {
  key: GtmSectionKey;
  title: string;
  sortOrder: number;
};

export const DEFAULT_GTM_SECTIONS: DefaultGtmSection[] = GTM_SECTION_KEYS.map((key, idx) => ({
  key,
  title: GTM_SECTION_LABELS[key],
  sortOrder: idx + 1,
}));

export function getDefaultGtmSections(): DefaultGtmSection[] {
  return DEFAULT_GTM_SECTIONS.map((s) => ({ ...s }));
}
