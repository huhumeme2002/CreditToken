import { NextRequest } from 'next/server'
import { clearUserSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Validate headers for CSRF protection
    if (!validateHeaders(request)) {
      return ErrorResponses.unauthorized()
    }

    // Clear user session cookie
    clearUserSession()

    return successResponse({ ok: true })
  } catch (error) {
    console.error('Logout error:', error)
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
