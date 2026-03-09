import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { getFounderContext } from '../lib/context/founderContext.js'
import { writeAuditLog } from '../lib/audit.js'
import { logger } from '../lib/logger.js'
import {
  buildSystemPrompt,
  buildProactiveSuggestionPrompt,
} from '../lib/llm/prompts/coach.conversation.js'

const MAX_HISTORY_MESSAGES = 20 // Keep last 20 messages for context window

export const coachRouter = router({
  // Send a message to the AI coach
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(4000),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      // Load founder context for personalisation
      const context = await getFounderContext(founderId)

      // Get or create coach session
      let session = input.sessionId
        ? await db.coachSession.findFirst({
            where: { id: input.sessionId, founderId },
          })
        : null

      if (!session) {
        session = await db.coachSession.create({
          data: {
            founderId,
            messages: [],
            language: context.language,
          },
        })
      }

      // Build message history for context
      const history =
        (session.messages as { role: string; content: string }[]) ?? []
      const recentHistory = history.slice(-MAX_HISTORY_MESSAGES)

      // Add current message to history
      const updatedHistory = [
        ...recentHistory,
        { role: 'user', content: input.message },
      ]

      // Call Kimi with full founder context
      const response = await llmCall(
        'coach.conversation',
        updatedHistory.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        buildSystemPrompt(context, context.language ?? 'en'),
      )

      // Save updated history including AI response
      const finalHistory = [
        ...updatedHistory,
        { role: 'assistant', content: response },
      ]

      await db.coachSession.update({
        where: { id: session.id },
        data: {
          messages: finalHistory,
        },
      })

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'coach.message_sent',
        resourceType: 'coach_session',
        resourceId: session.id,
      })

      return {
        response,
        sessionId: session.id,
        messageCount: finalHistory.length,
      }
    }),

  // Get session history
  getSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const session = await db.coachSession.findFirst({
        where: { id: input.sessionId, founderId },
      })

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      return session
    }),

  // List all sessions for a founder
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    const sessions = await db.coachSession.findMany({
      where: { founderId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        language: true,
      },
    })

    return { sessions }
  }),

  // Get proactive suggestions based on founder state
  getProactiveSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const { founderId } = ctx

    const context = await getFounderContext(founderId)

    const raw = await llmCall(
      'coach.proactiveSuggestion',
      [
        {
          role: 'user',
          content: buildProactiveSuggestionPrompt(context),
        },
      ],
      'You are a startup advisor. Generate specific, actionable suggestions based on the founder context provided. Respond with valid JSON only.',
    )

    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    let suggestions: {
      title: string
      description: string
      priority: string
      moduleId: string | null
    }[] = []
    try {
      const parsed = JSON.parse(cleaned)
      suggestions = parsed.suggestions ?? []
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn({ err }, 'Failed to parse proactive suggestions')
      }
    }

    return { suggestions }
  }),
})

