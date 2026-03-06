import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../../trpc.js'
import { generateFounderRoadmap } from '../../services/agent-orchestrator.service.js'

export const startupRouter = router({
  generateRoadmap: protectedProcedure
    .input(
      z.object({
        ideaDescription: z.string().min(50),
        industry: z.string(),
        geography: z.string().optional(),
        targetSegment: z.string().optional(),
        jurisdiction: z.string().optional(),
        startupType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      let result
      try {
        result = await generateFounderRoadmap({
          ...input,
          founderId,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Roadmap generation failed'
        const isConfig =
          /API_KEY|api key|credentials|timeout|ECONNREFUSED/i.test(message)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isConfig
            ? `Roadmap generation failed: ${message}. Check backend API keys (e.g. NVIDIA_API_KEY) and that the LLM service is reachable.`
            : `Roadmap generation failed: ${message}. Try again or check backend logs.`,
        })
      }

      const created = await db.founderRoadmap.create({
        data: {
          founderId,
          roadmap: result.roadmap as Prisma.InputJsonValue,
        },
      })

      // Store revision history for inspection
      await Promise.all(
        result.revisions.map(rev =>
          db.roadmapRevision.create({
            data: {
              roadmapId: created.id,
              version: rev.version,
              data: rev.data as Prisma.InputJsonValue,
            },
          }),
        ),
      )

      return {
        roadmap: result.roadmap,
        iterationCount: result.iterationCount,
        alignmentScore: result.alignmentScore,
      }
    }),
})

