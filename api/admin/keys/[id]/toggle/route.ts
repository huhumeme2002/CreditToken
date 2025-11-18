import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys } from '@/db/schema'
import { getAdminSession, verifyAdminSessionFromRequest } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { isValidUUID } from '@/lib/utils'

export const runtime = 'edge'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate headers for CSRF protection
    if (!validateHeaders(request)) {
      return ErrorResponses.unauthorized()
    }

    // Verify admin session (from the incoming request cookie)
    const adminSession = await verifyAdminSessionFromRequest(request)
    if (!adminSession) {
      return ErrorResponses.unauthorized()
    }

    // Validate key ID
    if (!isValidUUID(params.id)) {
      return ErrorResponses.invalidInput('Invalid key ID')
    }

    // Get current key status
    const keyRecord = await db
      .select({ id: keys.id, isActive: keys.isActive })
      .from(keys)
      .where(eq(keys.id, params.id))
      .limit(1)

    if (keyRecord.length === 0) {
      return ErrorResponses.notFound()
    }

    const currentKey = keyRecord[0]

    // Toggle the active status
    const updatedKey = await db
      .update(keys)
      .set({ isActive: !currentKey.isActive })
      .where(eq(keys.id, params.id))
      .returning({
        id: keys.id,
        isActive: keys.isActive,
      })

    if (updatedKey.length === 0) {
      return ErrorResponses.internalError()
    }

    return successResponse({
      id: updatedKey[0].id,
      isActive: updatedKey[0].isActive,
    })
  } catch (error) {
    console.error('Toggle key error:', error)
    return ErrorResponses.internalError()
  }
}

export async function GET() {
  return ErrorResponses.methodNotAllowed()
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
