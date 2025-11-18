import { NextRequest } from 'next/server'
import { eq, and, gt, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys, tokenPool, deliveries } from '@/db/schema'
import { getUserSession } from '@/lib/auth'
import { isRateLimited, getNextAvailableAt } from '@/lib/rateLimit'
import { successResponse, errorResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { env } from '@/lib/env'

// Use Node.js runtime for transaction support with FOR UPDATE SKIP LOCKED
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Validate headers for CSRF protection
    if (!validateHeaders(request)) {
      return errorResponse('INVALID_REQUEST', 400, 'Missing required headers')
    }

    // Get user session
    const session = await getUserSession()
    if (!session) {
      return ErrorResponses.unauthorized()
    }

    const keyId = session.sub

    // Transaction to handle token distribution atomically
    const result = await db.transaction(async (tx) => {
      // First, get current key status
      const keyRecord = await tx
        .select()
        .from(keys)
        .where(eq(keys.id, keyId))
        .limit(1)

      if (keyRecord.length === 0) {
        throw new Error('KEY_NOT_FOUND')
      }

      const userKey = keyRecord[0]

      // Check if key is still active and not expired
      if (!userKey.isActive) {
        throw new Error('KEY_INACTIVE')
      }

      if (userKey.expiresAt <= new Date()) {
        throw new Error('KEY_EXPIRED')
      }

      // Check rate limiting
      const rateLimitCheck = isRateLimited(userKey.lastTokenAt, env.RATE_LIMIT_MINUTES)
      if (rateLimitCheck.limited) {
        throw new Error('RATE_LIMITED')
      }

      // Atomically update last_token_at with cooldown check
      const updateResult = await tx.execute(sql`
        UPDATE keys
        SET last_token_at = now()
        WHERE id = ${keyId}
          AND (
            last_token_at IS NULL OR
            now() >= (last_token_at + (${env.RATE_LIMIT_MINUTES} || ' minutes')::interval)
          )
        RETURNING id, last_token_at;
      `)

      if (updateResult.rowCount === 0) {
        // This means we're in cooldown period (race condition caught)
        const nextAvailableAt = getNextAvailableAt(userKey.lastTokenAt, env.RATE_LIMIT_MINUTES)
        throw new Error('COOLDOWN_RACE_CONDITION')
      }

      const updatedLastTokenAt = (updateResult.rows[0] as { id: string; last_token_at: string }).last_token_at

      // Pick one unassigned token using FOR UPDATE SKIP LOCKED
      const tokenResult = await tx.execute(sql`
        SELECT id, value
        FROM token_pool
        WHERE assigned_to IS NULL
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1;
      `)

      if (tokenResult.rowCount === 0) {
        throw new Error('OUT_OF_STOCK')
      }

      const selectedToken = tokenResult.rows[0] as { id: string; value: string }
      const tokenId = selectedToken.id
      const tokenValue = selectedToken.value

      // Assign the token to the user
      await tx
        .update(tokenPool)
        .set({
          assignedTo: keyId,
          assignedAt: new Date(),
        })
        .where(and(
          eq(tokenPool.id, tokenId),
          isNull(tokenPool.assignedTo)
        ))

      // Create delivery record
      await tx
        .insert(deliveries)
        .values({
          keyId,
          tokenId,
          deliveredAt: new Date(),
        })

      // Calculate next available time
      const nextAvailableAt = getNextAvailableAt(new Date(updatedLastTokenAt), env.RATE_LIMIT_MINUTES)

      return {
        token: tokenValue,
        createdAt: new Date().toISOString(),
        nextAvailableAt: nextAvailableAt?.toISOString() || null,
      }
    })

    return successResponse(result)

  } catch (error) {
    console.error('Token generation error:', error)

    if (error instanceof Error) {
      switch (error.message) {
        case 'KEY_NOT_FOUND':
        case 'KEY_INACTIVE':
        case 'KEY_EXPIRED':
          return ErrorResponses.unauthorized()

        case 'RATE_LIMITED':
        case 'COOLDOWN_RACE_CONDITION':
          // Get current key to calculate nextAvailableAt
          try {
            const keyRecord = await db
              .select()
              .from(keys)
              .where(eq(keys.id, (await getUserSession())?.sub!))
              .limit(1)

            if (keyRecord.length > 0) {
              const nextAvailableAt = getNextAvailableAt(keyRecord[0].lastTokenAt, env.RATE_LIMIT_MINUTES)
              if (nextAvailableAt) {
                return ErrorResponses.rateLimited(nextAvailableAt)
              }
            }
          } catch (e) {
            // Fallback error
          }
          return errorResponse('RATE_LIMITED', 429, 'Too many requests')

        case 'OUT_OF_STOCK':
          return ErrorResponses.outOfStock()

        default:
          return ErrorResponses.internalError()
      }
    }

    return ErrorResponses.internalError()
  }
}

export async function GET() {
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
