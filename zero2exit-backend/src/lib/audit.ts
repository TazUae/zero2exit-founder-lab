import type { Prisma, PrismaClient } from '@prisma/client'

export async function writeAuditLog(params: {
  db: PrismaClient
  founderId: string
  actorType: 'founder' | 'admin' | 'system' | 'webhook'
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
  ipAddress?: string
}): Promise<void> {
  await params.db.auditLog.create({
    data: {
      founderId: params.founderId,
      actorType: params.actorType,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
    },
  })
}

