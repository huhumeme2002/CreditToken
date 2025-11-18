import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys } from '@/db/schema'
import { verifyAdminSessionFromRequest } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { isValidUUID } from '@/lib/utils'

export const runtime = 'edge'

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    if (!validateHeaders(request)) return ErrorResponses.unauthorized()

    const admin = await verifyAdminSessionFromRequest(request)
    if (!admin) return ErrorResponses.unauthorized()

    if (!isValidUUID(params.id)) {
      return ErrorResponses.invalidInput('Invalid key ID')
    }

    const current = await db
      .select({ id: keys.id, isActive: keys.isActive })
      .from(keys)
      .where(eq(keys.id, params.id))
      .limit(1)

    if (current.length === 0) return ErrorResponses.notFound()

    const updated = await db
      .update(keys)
      .set({ isActive: !current[0].isActive })
      .where(eq(keys.id, params.id))
      .returning({ id: keys.id, isActive: keys.isActive })

    return successResponse(updated[0])
  } catch (error) {
    console.error('PATCH /api/admin/keys/:id error', error)
    return ErrorResponses.internalError()
  }
}

export async function GET() { return ErrorResponses.methodNotAllowed() }
export async function POST() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
