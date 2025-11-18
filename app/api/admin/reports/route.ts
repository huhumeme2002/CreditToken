import { NextRequest } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tokenReports, tokenPool, deliveries, keys } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses } from '@/lib/responses'
import { maskKey } from '@/lib/utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession()
    if (!admin) {
      return ErrorResponses.unauthorized()
    }

    const rows = await db
      .select({
        id: tokenReports.id,
        reportedAt: tokenReports.reportedAt,
        reason: tokenReports.reason,
        refundedAt: tokenReports.refundedAt,
        refundAmount: tokenReports.refundAmount,
        tokenValue: tokenPool.value,
        keyId: keys.id,
        keyValue: keys.key,
        deliveredAt: deliveries.deliveredAt,
      })
      .from(tokenReports)
      .leftJoin(tokenPool, eq(tokenReports.tokenId, tokenPool.id))
      .leftJoin(deliveries, eq(tokenReports.tokenId, deliveries.tokenId))
      .leftJoin(keys, eq(tokenReports.keyId, keys.id))
      .orderBy(desc(tokenReports.reportedAt))
      .limit(100)

    const reports = rows.map((r) => ({
      id: r.id,
      token: r.tokenValue,
      keyMask: r.keyValue ? maskKey(r.keyValue) : '',
      deliveredAt: r.deliveredAt ? r.deliveredAt.toISOString() : null,
      reportedAt: r.reportedAt ? r.reportedAt.toISOString() : null,
      reason: r.reason ?? null,
      refundedAt: r.refundedAt ? r.refundedAt.toISOString() : null,
      refundAmount: r.refundAmount ?? null,
    }))

    return successResponse({ reports })
  } catch (error) {
    console.error('Admin get reports error:', error)
    return ErrorResponses.internalError()
  }
}

export async function POST() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
export async function PATCH() { return ErrorResponses.methodNotAllowed() }
