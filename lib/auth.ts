import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { env } from './env'

const secret = new TextEncoder().encode(env.JWT_SECRET)

export interface UserSessionPayload {
  sub: string // keyId
  iat: number
  exp: number
}

export interface AdminSessionPayload {
  sub: 'admin'
  iat: number
  exp: number
}

// Cookie configurations
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

const userCookieOptions = {
  ...cookieOptions,
  name: 'session',
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

const adminCookieOptions = {
  ...cookieOptions,
  name: 'admin_session',
  maxAge: 60 * 60 * 24 * env.ADMIN_SESSION_TTL_DAYS, // configurable days
}

// User session functions
export async function signUserSession(keyId: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + userCookieOptions.maxAge

  return await new SignJWT({ sub: keyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secret)
}

export async function verifyUserSession(token: string): Promise<UserSessionPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as UserSessionPayload
}

export async function setUserSession(keyId: string): Promise<void> {
  const token = await signUserSession(keyId)
  cookies().set(userCookieOptions.name, token, userCookieOptions)
}

export async function getUserSession(): Promise<UserSessionPayload | null> {
  const token = cookies().get(userCookieOptions.name)?.value
  if (!token) return null

  try {
    return await verifyUserSession(token)
  } catch {
    return null
  }
}

export function clearUserSession(): void {
  cookies().delete(userCookieOptions.name)
}

// Admin session functions
export async function signAdminSession(): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + adminCookieOptions.maxAge

  return await new SignJWT({ sub: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secret)
}

export async function verifyAdminSession(token: string): Promise<AdminSessionPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as AdminSessionPayload
}

export async function setAdminSession(): Promise<void> {
  const token = await signAdminSession()
  cookies().set(adminCookieOptions.name, token, adminCookieOptions)
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const token = cookies().get(adminCookieOptions.name)?.value
  if (!token) return null

  try {
    return await verifyAdminSession(token)
  } catch {
    return null
  }
}

export function clearAdminSession(): void {
  cookies().delete(adminCookieOptions.name)
}

// Middleware helpers
export async function verifyUserSessionFromRequest(request: NextRequest): Promise<UserSessionPayload | null> {
  const token = request.cookies.get(userCookieOptions.name)?.value
  if (!token) return null

  try {
    return await verifyUserSession(token)
  } catch {
    return null
  }
}

export async function verifyAdminSessionFromRequest(request: NextRequest): Promise<AdminSessionPayload | null> {
  const token = request.cookies.get(adminCookieOptions.name)?.value
  if (!token) return null

  try {
    return await verifyAdminSession(token)
  } catch {
    return null
  }
}

// Response helpers for setting cookies
export function setUserSessionCookie(response: NextResponse, keyId: string): Promise<void> {
  return signUserSession(keyId).then(token => {
    response.cookies.set(userCookieOptions.name, token, userCookieOptions)
  })
}

export function setAdminSessionCookie(response: NextResponse): Promise<void> {
  return signAdminSession().then(token => {
    response.cookies.set(adminCookieOptions.name, token, adminCookieOptions)
  })
}

export function clearUserSessionCookie(response: NextResponse): void {
  response.cookies.delete(userCookieOptions.name)
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.delete(adminCookieOptions.name)
}
