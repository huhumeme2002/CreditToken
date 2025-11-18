import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { keys, tokenPool, deliveries } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { signUserSession } from '@/lib/auth'

describe('Concurrency Tests', () => {
  const testKeys = ['CONCUR-KEY-001', 'CONCUR-KEY-002']
  let keyIds: string[] = []
  let sessionTokens: string[] = []
  let tokenIds: string[] = []

  beforeAll(async () => {
    // Create test keys
    const keyExpiry = new Date()
    keyExpiry.setDate(keyExpiry.getDate() + 1)

    for (const keyValue of testKeys) {
      const keyResult = await db
        .insert(keys)
        .values({
          key: keyValue,
          expiresAt: keyExpiry,
          isActive: true,
        })
        .returning({ id: keys.id })

      const keyId = keyResult[0].id
      keyIds.push(keyId)
      
      const sessionToken = await signUserSession(keyId)
      sessionTokens.push(sessionToken)
    }

    // Create test tokens in pool (fewer than concurrent requests)
    const testTokens = [
      'CONCUR-TOKEN-001-ABCD1234567890',
      'CONCUR-TOKEN-002-EFGH5678901234',
      'CONCUR-TOKEN-003-IJKL9012345678',
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
    // Clean up deliveries first (foreign key constraint)
    if (tokenIds.length > 0) {
      await db.delete(deliveries).where(inArray(deliveries.tokenId, tokenIds))
    }
    
    // Clean up tokens
    if (tokenIds.length > 0) {
      await db.delete(tokenPool).where(inArray(tokenPool.id, tokenIds))
    }
    
    // Clean up keys
    if (keyIds.length > 0) {
      await db.delete(keys).where(inArray(keys.id, keyIds))
    }
  })

  it('should handle concurrent token requests without race conditions', async () => {
    // Create multiple concurrent requests from different users
    const requests = sessionTokens.map(sessionToken =>
      fetch('http://localhost:3000/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `session=${sessionToken}`,
        },
      })
    )

    // Execute all requests concurrently
    const responses = await Promise.all(requests)
    
    // All should get successful responses (200)
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })

    // Parse response data
    const responseData = await Promise.all(
      responses.map(response => response.json())
    )

    // Each should get a unique token
    const receivedTokens = responseData.map(data => data.data.token)
    const uniqueTokens = new Set(receivedTokens)
    
    expect(uniqueTokens.size).toBe(receivedTokens.length)
    
    // All tokens should be from our test pool
    receivedTokens.forEach(token => {
      expect(token).toMatch(/^CONCUR-TOKEN-\d{3}-[A-Z0-9]+$/)
    })
  })

  it('should handle out of stock scenario correctly', async () => {
    // First, exhaust the remaining token in the pool
    // We should have used 2 tokens in the previous test, so 1 should remain
    
    const response1 = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `session=${sessionTokens[0]}`,
      },
    })

    // This should be rate limited (429) since we just used this key
    expect(response1.status).toBe(429)

    // Wait for cooldown or use a fresh key
    // For this test, let's create a new key to exhaust the last token
    const newKeyResult = await db
      .insert(keys)
      .values({
        key: 'CONCUR-EXHAUST-KEY',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
      })
      .returning({ id: keys.id })

    const newKeyId = newKeyResult[0].id
    const newSessionToken = await signUserSession(newKeyId)

    const exhaustResponse = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `session=${newSessionToken}`,
      },
    })

    // This should succeed and exhaust the last token
    if (exhaustResponse.status === 200) {
      // Now try to get another token - should be out of stock
      const anotherKeyResult = await db
        .insert(keys)
        .values({
          key: 'CONCUR-OUTOFSTOCK-KEY',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true,
        })
        .returning({ id: keys.id })

      const anotherKeyId = anotherKeyResult[0].id
      const anotherSessionToken = await signUserSession(anotherKeyId)

      const outOfStockResponse = await fetch('http://localhost:3000/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `session=${anotherSessionToken}`,
        },
      })

      expect(outOfStockResponse.status).toBe(409)
      
      const outOfStockData = await outOfStockResponse.json()
      expect(outOfStockData.error).toBe('OUT_OF_STOCK')

      // Clean up new keys
      await db.delete(keys).where(eq(keys.id, anotherKeyId))
    }

    // Clean up
    await db.delete(keys).where(eq(keys.id, newKeyId))
  })

  it('should prevent multiple token assignments to same user in race condition', async () => {
    // Add more tokens to test with
    const raceTestTokens = [
      'RACE-TOKEN-001-ABCD1234567890',
      'RACE-TOKEN-002-EFGH5678901234',
    ]

    const raceTokenIds: string[] = []
    for (const tokenValue of raceTestTokens) {
      const tokenResult = await db
        .insert(tokenPool)
        .values({ value: tokenValue })
        .returning({ id: tokenPool.id })
      
      raceTokenIds.push(tokenResult[0].id)
    }

    // Create a new key for this test
    const raceKeyResult = await db
      .insert(keys)
      .values({
        key: 'RACE-TEST-KEY',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
      })
      .returning({ id: keys.id })

    const raceKeyId = raceKeyResult[0].id
    const raceSessionToken = await signUserSession(raceKeyId)

    // First request should succeed
    const firstResponse = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `session=${raceSessionToken}`,
      },
    })

    expect(firstResponse.status).toBe(200)

    // Immediate second request should be rate limited
    const secondResponse = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `session=${raceSessionToken}`,
      },
    })

    expect(secondResponse.status).toBe(429)

    // Clean up
    await db.delete(deliveries).where(inArray(deliveries.tokenId, raceTokenIds))
    await db.delete(tokenPool).where(inArray(tokenPool.id, raceTokenIds))
    await db.delete(keys).where(eq(keys.id, raceKeyId))
  })
})
