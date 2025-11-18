import { NextRequest } from 'next/server'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys, tokenPool, deliveries } from '@/db/schema'
import { getUserSession } from '@/lib/auth'
import { successResponse, errorResponse, ErrorResponses, validateHeaders } from '@/lib/responses'

// Use Node.js runtime for transaction support with FOR UPDATE SKIP LOCKED
export const runtime = 'nodejs'

const TOKEN_COST_CENTS = 250

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

    try {
      const keyRecord = await db
        .select()
        .from(keys)
        .where(eq(keys.id, keyId))
        .limit(1)

      if (keyRecord.length === 0) {
        throw new Error('KEY_NOT_FOUND')
      }

      const userKey = keyRecord[0]

      if (!userKey.isActive) {
        throw new Error('KEY_INACTIVE')
      }

      if (userKey.expiresAt <= new Date()) {
        throw new Error('KEY_EXPIRED')
      }

      const updateResult = await db.execute(sql`
        UPDATE keys
        SET last_token_at = now(),
            credit_cents = credit_cents - ${TOKEN_COST_CENTS}
        WHERE id = ${keyId}
          AND credit_cents >= ${TOKEN_COST_CENTS}
        RETURNING id, last_token_at, credit_cents;
      `)

      if (updateResult.rowCount === 0) {
        throw new Error('INSUFFICIENT_CREDIT')
      }

      const tokenResult = await db.execute(sql`
        SELECT id, value
        FROM token_pool
        WHERE assigned_to IS NULL
        ORDER BY created_at
        LIMIT 1;
      `)

      if (tokenResult.rowCount === 0) {
        throw new Error('OUT_OF_STOCK')
      }

      const selectedToken = tokenResult.rows[0] as { id: string; value: string }
      const tokenId = selectedToken.id
      const tokenValue = selectedToken.value

      await db
        .update(tokenPool)
        .set({
          assignedTo: keyId,
          assignedAt: new Date(),
        })
        .where(and(
          eq(tokenPool.id, tokenId),
          isNull(tokenPool.assignedTo)
        ))

      await db
        .insert(deliveries)
        .values({
          keyId,
          tokenId,
          deliveredAt: new Date(),
        })

      const result = {
        token: tokenValue,
        createdAt: new Date().toISOString(),
        nextAvailableAt: null,
      }

      return successResponse(result)
    } catch (transactionError) {
      throw transactionError
    }

  } catch (error) {
    console.error('Token generation error:', error)

    if (error instanceof Error) {
      switch (error.message) {
        case 'KEY_NOT_FOUND':
        case 'KEY_INACTIVE':
        case 'KEY_EXPIRED':
          return ErrorResponses.unauthorized()

        case 'INSUFFICIENT_CREDIT':
          return errorResponse('INSUFFICIENT_CREDIT', 402, 'Không đủ credit để lấy token')

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
