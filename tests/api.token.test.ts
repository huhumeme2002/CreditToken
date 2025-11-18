import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { keys, tokenPool } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { signUserSession } from '@/lib/auth'

describe('API Token Tests', () => {
  const testKey = 'TEST-TOKEN-KEY-001'
  let keyId: string
  let sessionToken: string
  let tokenIds: string[] = []

  beforeAll(async () => {
    // Create test key
    const keyExpiry = new Date()
    keyExpiry.setDate(keyExpiry.getDate() + 1) // expires tomorrow

    const keyResult = await db
      .insert(keys)
      .values({
        key: testKey,
        expiresAt: keyExpiry,
        isActive: true,
      })
      .returning({ id: keys.id })

    keyId = keyResult[0].id

    // Create session token
    sessionToken = await signUserSession(keyId)

    // Create test tokens in pool
    const testTokens = [
      'TEST-TOKEN-001-ABCD1234567890',
      'TEST-TOKEN-002-EFGH5678901234',
      'TEST-TOKEN-003-IJKL9012345678',
    ]

    for (const tokenValue of testTokens) {
      const tokenResult = await db
        .insert(tokenPool)
        .values({ value: tokenValue })
        .returning({ id: tokenPool.id })
      
      tokenIds.push(tokenResult[0].id)
    }
  })

  afterAll(async () => {
    // Clean up
    for (const tokenId of tokenIds) {
      await db.delete(tokenPool).where(eq(tokenPool.id, tokenId))
    }
    await db.delete(keys).where(eq(keys.id, keyId))
  })

  it('should fail without session', async () => {
    const response = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })

    expect(response.status).toBe(401)
  })

  it('should successfully get token with valid session', async () => {
    const response = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `session=${sessionToken}`,
      },
    })

    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.data.token).toBeDefined()
    expect(data.data.createdAt).toBeDefined()
    expect(data.data.nextAvailableAt).toBeDefined()
    
    // Token should be from our test pool
    expect(data.data.token).toMatch(/^TEST-TOKEN-\d{3}-[A-Z0-9]+$/)
  })

  it('should enforce rate limiting', async () => {
    // Try to get another token immediately (should be rate limited)
    const response = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `session=${sessionToken}`,
      },
    })

    expect(response.status).toBe(429)
    
    const data = await response.json()
    expect(data.error).toBe('RATE_LIMITED')
    expect(data.details.blockedUntil).toBeDefined()
  })

  it('should fail without required headers', async () => {
    const response = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Missing X-Requested-With header
        'Cookie': `session=${sessionToken}`,
      },
    })

    expect(response.status).toBe(400)
  })
})
