import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signAdminSession } from '@/lib/auth'
import { errorResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

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

    // Generate admin session token
    const token = await signAdminSession()
    
    // Create response with cookie
    const response = NextResponse.json({ ok: true, data: { ok: true } }, { status: 200 })
    
    // Set cookie manually with explicit options
    const cookieValue = `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    response.headers.set('Set-Cookie', cookieValue)

    return response
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
