import { NextRequest } from 'next/server'
import { clearAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Validate headers for CSRF protection
    if (!validateHeaders(request)) {
      return ErrorResponses.unauthorized()
    }

    // Clear admin session cookie
    clearAdminSession()

    return successResponse({ ok: true })
  } catch (error) {
    console.error('Admin logout error:', error)
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
