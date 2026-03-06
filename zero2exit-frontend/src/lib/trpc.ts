import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@zero2exit/backend/types/trpc"

export const trpc = createTRPCReact<AppRouter>()

