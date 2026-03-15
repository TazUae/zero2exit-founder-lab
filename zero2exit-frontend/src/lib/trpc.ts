import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@zero2exit/backend/routers/index'

export const trpc = createTRPCReact<AppRouter>()
