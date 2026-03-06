import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc.js'
import { getStartupGraph } from '../../services/knowledge-graph.service.js'

export const knowledgeRouter = router({
  getGraph: protectedProcedure
    .input(
      z
        .object({
          founderId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const founderId = input?.founderId ?? ctx.founderId

      const graph = await getStartupGraph(founderId)

      return graph
    }),
})

