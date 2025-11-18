import { NextRequest } from 'next/server'
import { count, isNull, isNotNull, gt, lt, and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys, tokenPool } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses } from '@/lib/responses'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession()
    if (!adminSession) {
      return ErrorResponses.unauthorized()
    }

    // Get tokens remaining (unassigned)
    const tokensRemainingResult = await db
      .select({ count: count() })
      .from(tokenPool)
      .where(isNull(tokenPool.assignedTo))

    const tokensRemaining = tokensRemainingResult[0]?.count || 0

    // Get tokens assigned
    const tokensAssignedResult = await db
      .select({ count: count() })
      .from(tokenPool)
      .where(isNotNull(tokenPool.assignedTo))

    const tokensAssigned = tokensAssignedResult[0]?.count || 0

    // Get active users (not expired and active)
    const usersActiveResult = await db
      .select({ count: count() })
      .from(keys)
      .where(
        and(
          eq(keys.isActive, true),
          gt(keys.expiresAt, new Date())
        )
      )

    const usersActive = usersActiveResult[0]?.count || 0

    // Get expired users (either inactive or past expiration date)
    const usersExpiredResult = await db
      .select({ count: count() })
      .from(keys)
      .where(
        and(
          eq(keys.isActive, false)
        )
      )

    // Also count keys that are active but expired by date
    const usersExpiredByDateResult = await db
      .select({ count: count() })
      .from(keys)
      .where(
        and(
          eq(keys.isActive, true),
          lt(keys.expiresAt, new Date())
        )
      )

    const usersExpired = (usersExpiredResult[0]?.count || 0) + (usersExpiredByDateResult[0]?.count || 0)

    return successResponse({
      tokensRemaining,
      tokensAssigned,
      usersActive,
      usersExpired,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return ErrorResponses.internalError()
  }
}

export async function POST() {
  return ErrorResponses.methodNotAllowed()
}

export async function PUT() {
  return ErrorResponses.methodNotAllowed()
}

export async function DELETE() {
  return ErrorResponses.methodNotAllowed()
}

export async function PATCH() {
  return ErrorResponses.methodNotAllowed()
}
