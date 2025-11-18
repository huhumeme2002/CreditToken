import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { isValidUUID } from '@/lib/utils'

export const runtime = 'nodejs'

const updateCreditSchema = z.object({
  keyId: z.string().uuid('Invalid key ID'),
  creditCents: z.number().int().nonnegative('Credit must be >= 0'),
})

export async function PATCH(request: NextRequest) {
  try {
    if (!validateHeaders(request)) {
      return ErrorResponses.unauthorized()
    }

    const admin = await getAdminSession()
    if (!admin) {
      return ErrorResponses.unauthorized()
    }

    const body = await request.json()

    // Accept both strict UUID validation and fallback to util
    if (!body?.keyId || !isValidUUID(body.keyId)) {
      return ErrorResponses.invalidInput('Invalid key ID')
    }

    const { keyId, creditCents } = updateCreditSchema.parse({
      keyId: body.keyId,
      creditCents: body.creditCents,
    })

    const updated = await db
      .update(keys)
      .set({ creditCents })
      .where(eq(keys.id, keyId))
      .returning({ id: keys.id, creditCents: keys.creditCents })

    if (updated.length === 0) {
      return ErrorResponses.notFound()
    }

    return successResponse(updated[0])
  } catch (error) {
    console.error('Admin update key credit error:', error)

    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors[0]?.message)
    }

    return ErrorResponses.internalError()
  }
}

export async function GET() { return ErrorResponses.methodNotAllowed() }
export async function POST() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
