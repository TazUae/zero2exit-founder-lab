import type { PrismaClient } from '@prisma/client'

export async function getOrCreateFounder(
  authentikUserId: string,
  db: PrismaClient,
) {
  // clerkUserId is repurposed as a generic external user ID column
  let founder = await db.founder.findUnique({
    where: { clerkUserId: authentikUserId },
  })

  if (!founder) {
    founder = await db.founder.create({
      data: {
        clerkUserId: authentikUserId,
        email: '',
        name: null,
        plan: 'launch',
        language: 'en',
      },
    })
  }

  return founder
}
