import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../../trpc.js'
import { generateFounderRoadmap } from '../../services/agent-orchestrator.service.js'
import { appendFileSync } from 'node:fs'

type Json = unknown

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

      // #region agent log
      try {
        appendFileSync(
          'c:\\Users\\Lenovo\\Dev\\Zero2Exit-Founder-Lab-main\\.cursor\\debug.log',
          JSON.stringify({
            id: `log_${Date.now()}_startup_generateRoadmap_start`,
            timestamp: Date.now(),
            location: 'startup.router.ts:generateRoadmap',
            message: 'startup.generateRoadmap called',
            runId: 'pre-fix',
            hypothesisId: 'H2',
            data: {
              founderId,
              hasIdea: !!input.ideaDescription,
              ideaLength: input.ideaDescription.length,
              industry: input.industry,
              hasGeography: !!input.geography,
              hasJurisdiction: !!input.jurisdiction,
            },
          }) + '\n',
        )
      } catch {
        // ignore debug log errors
      }
      // #endregion agent log

      let result
      try {
        result = await generateFounderRoadmap({
          ...input,
          founderId,
        })
      } catch (err) {
        // #region agent log
        try {
          appendFileSync(
            'c:\\Users\\Lenovo\\Dev\\Zero2Exit-Founder-Lab-main\\.cursor\\debug.log',
            JSON.stringify({
              id: `log_${Date.now()}_startup_generateRoadmap_error`,
              timestamp: Date.now(),
              location: 'startup.router.ts:generateRoadmap',
              message: 'generateFounderRoadmap threw',
              runId: 'pre-fix',
              hypothesisId: 'H2',
              data: {
                errorMessage: err instanceof Error ? err.message : String(err),
                errorName: err instanceof Error ? err.name : 'non-error',
              },
            }) + '\n',
          )
        } catch {
          // ignore debug log errors
        }
        // #endregion agent log

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
          roadmap: result.roadmap as Json,
        },
      })

      // Store revision history for inspection
      await Promise.all(
        result.revisions.map(rev =>
          db.roadmapRevision.create({
            data: {
              roadmapId: created.id,
              version: rev.version,
              data: rev.data as Json,
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

