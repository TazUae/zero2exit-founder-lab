import { router } from '../trpc.js'
import { gatewayRouter } from './gateway.js'
import { m01Router } from './m01.js'
import { m02Router } from './m02.js'
import { coachRouter } from './coach.js'
import { documentsRouter } from './documents.js'
import { paymentsRouter } from './payments.js'
import { founderRouter } from './founder.js'
import { dashboardRouter } from './dashboard.js'
import { startupRouter } from '../modules/startup/startup.router.js'
import { knowledgeRouter } from '../modules/knowledge/knowledge.router.js'
import { gtmRouter } from '../modules/gtm/gtm.router.js'
import { brandRouter } from './brand.js'
import { bpRouter } from '../modules/bp/bp.router.js'

export const appRouter = router({
  gateway: gatewayRouter,
  m01: m01Router,
  m02: m02Router,
  coach: coachRouter,
  documents: documentsRouter,
  payments: paymentsRouter,
  founder: founderRouter,
  dashboard: dashboardRouter,
  knowledge: knowledgeRouter,
  startup: startupRouter,
  gtm: gtmRouter,
  brand: brandRouter,
  bp: bpRouter,
})

export type AppRouter = typeof appRouter

