import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tokenPool, deliveries, tokenReports } from '@/db/schema'
import { getUserSession } from '@/lib/auth'
import { successResponse, errorResponse, ErrorResponses, validateHeaders } from '@/lib/responses'

export const runtime = 'nodejs'

const reportSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    if (!validateHeaders(request)) {
      return errorResponse('INVALID_REQUEST', 400, 'Missing required headers')
    }

    const session = await getUserSession()
    if (!session) {
      return ErrorResponses.unauthorized()
    }

    const body = await request.json()
    const { token, reason } = reportSchema.parse(body)

    const tokenRecord = await db
      .select()
      .from(tokenPool)
      .where(eq(tokenPool.value, token))
      .limit(1)

    if (tokenRecord.length === 0) {
      return ErrorResponses.notFound()
    }

    const tokenRow = tokenRecord[0]

    const deliveryRecord = await db
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.keyId, session.sub), eq(deliveries.tokenId, tokenRow.id)))
      .limit(1)

    if (deliveryRecord.length === 0) {
      return ErrorResponses.forbidden()
    }

    await db.insert(tokenReports).values({
      keyId: session.sub,
      tokenId: tokenRow.id,
      reportedAt: new Date(),
      reason: reason && reason.trim().length > 0 ? reason : undefined,
    })

    return successResponse({ ok: true })
  } catch (error) {
    console.error('Report token error:', error)

    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors[0]?.message)
    }

    return ErrorResponses.internalError()
  }
}

export async function GET() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
export async function PATCH() { return ErrorResponses.methodNotAllowed() }
