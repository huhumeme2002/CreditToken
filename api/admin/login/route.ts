import { NextRequest } from 'next/server'
import { z } from 'zod'
import { setAdminSession } from '@/lib/auth'
import { successResponse, errorResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { env } from '@/lib/env'

export const runtime = 'edge'

const adminLoginSchema = z.object({
  secret: z.string().min(1, 'Admin secret is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Validate headers for CSRF protection
    if (!validateHeaders(request)) {
      return errorResponse('INVALID_REQUEST', 400, 'Missing required headers')
    }

    // Parse and validate request body
    const body = await request.json()
    const { secret } = adminLoginSchema.parse(body)

    // Verify admin secret
    if (secret !== env.ADMIN_SECRET) {
      return ErrorResponses.adminAuthFailed()
    }

    // Set admin session
    await setAdminSession()

    return successResponse({ ok: true })
  } catch (error) {
    console.error('Admin login error:', error)
    
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
