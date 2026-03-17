import type { PrismaClient } from '@prisma/client'

export async function getOrCreateFounder(
  supabaseUserId: string,
  email: string,
  db: PrismaClient,
) {
  let founder = await db.founder.findUnique({
    where: { userId: supabaseUserId },
  })

  if (!founder) {
    founder = await db.founder.create({
      data: {
        userId: supabaseUserId,
        email,
        name: null,
        plan: 'launch',
        language: 'en',
      },
    })
  }

  return founder
}
