import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc.js'
import { getStartupGraph } from '../../services/knowledge-graph.service.js'
import { logger } from '../../lib/logger.js'

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

      try {
        return await getStartupGraph(founderId)
      } catch (err) {
        logger.error({ err, founderId }, 'knowledge.getGraph failed')
        return { nodes: [], edges: [] }
      }
    }),
})

