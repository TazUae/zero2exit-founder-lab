export const BP_SECTIONS = [
  {
    key: 'executive_summary',
    title: 'Executive Summary',
    sortOrder: 1,
    description: 'A concise overview of the entire business plan — problem, solution, market, traction, ask.',
    autoFillSources: ['m01.ideaValidation', 'onboarding.ideaDescription'],
  },
  {
    key: 'problem_solution',
    title: 'Problem & Solution',
    sortOrder: 2,
    description: 'Define the core pain point and how your product uniquely solves it.',
    autoFillSources: ['m01.objections', 'onboarding.ideaDescription'],
  },
  {
    key: 'market_opportunity',
    title: 'Market Opportunity',
    sortOrder: 3,
    description: 'TAM, SAM, SOM with supporting data and growth trends.',
    autoFillSources: ['m01.marketSizing'],
  },
  {
    key: 'business_model',
    title: 'Business Model',
    sortOrder: 4,
    description: 'How the company makes money — pricing, revenue streams, unit economics.',
    autoFillSources: ['onboarding.businessModel', 'onboarding.revenue'],
  },
  {
    key: 'go_to_market',
    title: 'Go-To-Market Strategy',
    sortOrder: 5,
    description: 'Customer acquisition channels, launch strategy, sales motion.',
    autoFillSources: ['gtm.compiledDocument'],
  },
  {
    key: 'team',
    title: 'Team',
    sortOrder: 6,
    description: 'Founders, key hires, advisors and why this team can execute.',
    autoFillSources: ['onboarding.teamSize'],
  },
  {
    key: 'traction_milestones',
    title: 'Traction & Milestones',
    sortOrder: 7,
    description: 'Current traction, 12-month roadmap, and key milestones.',
    autoFillSources: ['m01.scorecard'],
  },
] as const

export type BpSectionKey = typeof BP_SECTIONS[number]['key']
