import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq, count, ilike, desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys, deliveries } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { maskKey, isValidUUID } from '@/lib/utils'

export const runtime = 'nodejs'

const createKeySchema = z.object({
  key: z.string().min(1, 'Key is required'),
  expiresAt: z.string().datetime('Invalid expiration date'),
  creditCents: z.number().int().nonnegative().optional(),
})

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 100),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
})

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession()
    if (!adminSession) {
      return ErrorResponses.unauthorized()
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      q: searchParams.get('q') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })

    // Build where clause for search
    let whereClause = undefined
    if (query.q) {
      whereClause = ilike(keys.key, `%${query.q}%`)
    }

    // Get keys with pagination
    const keysList = await db
      .select({
        id: keys.id,
        key: keys.key,
        expiresAt: keys.expiresAt,
        isActive: keys.isActive,
        lastTokenAt: keys.lastTokenAt,
        createdAt: keys.createdAt,
        creditCents: keys.creditCents,
      })
      .from(keys)
      .where(whereClause)
      .orderBy(desc(keys.createdAt))
      .limit(Math.min(query.limit, 200)) // Cap at 200
      .offset(query.offset)

    // Get assigned count for each key
    const keysWithCounts = await Promise.all(
      keysList.map(async (key) => {
        const assignedCountResult = await db
          .select({ count: count() })
          .from(deliveries)
          .where(eq(deliveries.keyId, key.id))

        return {
          id: key.id,
          keyMask: maskKey(key.key),
          expiresAt: key.expiresAt.toISOString(),
          isActive: key.isActive,
          lastTokenAt: key.lastTokenAt?.toISOString() || null,
          createdAt: key.createdAt.toISOString(),
          assignedCount: assignedCountResult[0]?.count || 0,
          creditCents: key.creditCents ?? 0,
        }
      })
    )

    return successResponse({
      keys: keysWithCounts,
      total: keysWithCounts.length,
      hasMore: keysWithCounts.length === query.limit,
    })
  } catch (error) {
    console.error('Get admin keys error:', error)
    
    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors[0]?.message)
    }
    
    return ErrorResponses.internalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate headers for CSRF protection
    if (!validateHeaders(request)) {
      return ErrorResponses.unauthorized()
    }

    // Verify admin session
    const adminSession = await getAdminSession()
    if (!adminSession) {
      return ErrorResponses.unauthorized()
    }

    // Parse and validate request body
    const body = await request.json()
    const { key, expiresAt, creditCents } = createKeySchema.parse(body)

    // Check if key already exists
    const existingKey = await db
      .select({ id: keys.id })
      .from(keys)
      .where(eq(keys.key, key))
      .limit(1)

    if (existingKey.length > 0) {
      return ErrorResponses.invalidInput('Key already exists')
    }

    // Create the key
    const newKey = await db
      .insert(keys)
      .values({
        key,
        expiresAt: new Date(expiresAt),
        lastTokenAt: null,
        createdAt: new Date(),
        creditCents: typeof creditCents === 'number' ? creditCents : 0,
      })
      .returning({
        id: keys.id,
        key: keys.key,
        expiresAt: keys.expiresAt,
        isActive: keys.isActive,
        createdAt: keys.createdAt,
        creditCents: keys.creditCents,
      })

    const createdKey = newKey[0]

    return successResponse({
      id: createdKey.id,
      keyMask: maskKey(createdKey.key),
      expiresAt: createdKey.expiresAt.toISOString(),
      isActive: createdKey.isActive,
      createdAt: createdKey.createdAt.toISOString(),
      assignedCount: 0,
      creditCents: createdKey.creditCents ?? 0,
    })
  } catch (error) {
    console.error('Create key error:', error)
    
    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors[0]?.message)
    }
    
    return ErrorResponses.internalError()
  }
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
