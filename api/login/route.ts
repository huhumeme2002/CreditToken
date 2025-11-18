import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys } from '@/db/schema'
import { setUserSession } from '@/lib/auth'
import { successResponse, errorResponse, ErrorResponses, validateHeaders } from '@/lib/responses'

export const runtime = 'edge'

const loginSchema = z.object({
  key: z.string().min(1, 'Key is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Validate headers for CSRF protection
    if (!validateHeaders(request)) {
      return errorResponse('INVALID_REQUEST', 400, 'Missing required headers')
    }

    // Parse and validate request body
    const body = await request.json()
    const { key } = loginSchema.parse(body)

    // Find the key in database
    const keyRecord = await db
      .select()
      .from(keys)
      .where(
        and(
          eq(keys.key, key),
          eq(keys.isActive, true),
          gt(keys.expiresAt, new Date())
        )
      )
      .limit(1)

    if (keyRecord.length === 0) {
      return ErrorResponses.keyInvalidOrExpired()
    }

    const userKey = keyRecord[0]

    // Set user session
    await setUserSession(userKey.id)

    return successResponse({ ok: true })
  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors[0]?.message)
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
