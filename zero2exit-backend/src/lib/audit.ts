import type { PrismaClient } from '@prisma/client'
import type { InputJsonValue } from '@prisma/client/runtime/library'

type Json = InputJsonValue

// Compatible with both PrismaClient and Prisma interactive-transaction client
export type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export async function writeAuditLog(params: {
  db: TxClient
  founderId: string
  actorType: 'founder' | 'admin' | 'system' | 'webhook'
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Json | null
  ipAddress?: string
}): Promise<void> {
  await params.db.auditLog.create({
    data: {
      founderId: params.founderId,
      actorType: params.actorType,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata ?? undefined,
      ipAddress: params.ipAddress,
    },
  })
}

