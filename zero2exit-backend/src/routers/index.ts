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
})

export type AppRouter = typeof appRouter

