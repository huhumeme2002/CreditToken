import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys } from '@/db/schema'
import { verifyAdminSessionFromRequest } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { isValidUUID } from '@/lib/utils'

export const runtime = 'nodejs'

// Alternative toggle route: PATCH /api/admin/keys/toggle
// Accepts key ID in request body: { "keyId": "uuid" }
export async function PATCH(request: NextRequest) {
  try {
    if (!validateHeaders(request)) return ErrorResponses.unauthorized()

    const admin = await verifyAdminSessionFromRequest(request)
    if (!admin) return ErrorResponses.unauthorized()

    const body = await request.json()
    const keyId = body?.keyId

    if (!keyId || !isValidUUID(keyId)) {
      return ErrorResponses.invalidInput('Invalid key ID')
    }

    const current = await db
      .select({ id: keys.id, isActive: keys.isActive })
      .from(keys)
      .where(eq(keys.id, keyId))
      .limit(1)

    if (current.length === 0) return ErrorResponses.notFound()

    const updated = await db
      .update(keys)
      .set({ isActive: !current[0].isActive })
      .where(eq(keys.id, keyId))
      .returning({ id: keys.id, isActive: keys.isActive })

    return successResponse(updated[0])
  } catch (error) {
    console.error('PATCH /api/admin/keys/toggle error', error)
    return ErrorResponses.internalError()
  }
}

export async function GET() { return ErrorResponses.methodNotAllowed() }
export async function POST() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
