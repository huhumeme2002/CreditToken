import { NextResponse } from 'next/server'

export interface ApiError {
  error: string
  message?: string
  details?: any
}

export interface ApiSuccess<T = any> {
  ok: true
  data?: T
}

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data?: T, status: number = 200): NextResponse {
  const response: ApiSuccess<T> = { ok: true }
  if (data !== undefined) {
    response.data = data
  }
  
  return NextResponse.json(response, { status })
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  error: string,
  status: number = 400,
  message?: string,
  details?: any
): NextResponse {
  const response: ApiError = { error }
  if (message) response.message = message
  if (details) response.details = details
  
  return NextResponse.json(response, { status })
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  unauthorized: () => errorResponse('UNAUTHORIZED', 401, 'Authentication required'),
  forbidden: () => errorResponse('FORBIDDEN', 403, 'Access denied'),
  notFound: () => errorResponse('NOT_FOUND', 404, 'Resource not found'),
  methodNotAllowed: () => errorResponse('METHOD_NOT_ALLOWED', 405, 'Method not allowed'),
  rateLimited: (nextAvailableAt: Date) => errorResponse(
    'RATE_LIMITED', 
    429, 
    'Rate limit exceeded',
    { blockedUntil: nextAvailableAt.toISOString() }
  ),
  outOfStock: () => errorResponse('OUT_OF_STOCK', 409, 'No tokens available'),
  invalidInput: (message?: string) => errorResponse('INVALID_INPUT', 400, message || 'Invalid input'),
  keyInvalidOrExpired: () => errorResponse('KEY_INVALID_OR_EXPIRED', 400, 'Key is invalid or expired'),
  adminAuthFailed: () => errorResponse('ADMIN_AUTH_FAILED', 401, 'Admin authentication failed'),
  internalError: () => errorResponse('INTERNAL_ERROR', 500, 'Internal server error'),
}

/**
 * Validate required headers (CSRF protection)
 */
export function validateHeaders(request: Request): boolean {
  const requestedWith = request.headers.get('X-Requested-With')
  return requestedWith === 'XMLHttpRequest'
}

/**
 * Middleware to validate headers on API requests
 */
export function withHeaderValidation(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    if (!validateHeaders(request)) {
      return errorResponse('INVALID_REQUEST', 400, 'Missing required headers')
    }
    
    return handler(request, ...args)
  }
}
