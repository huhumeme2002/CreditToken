import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { keys } from '@/db/schema'
import { eq } from 'drizzle-orm'

describe('API Login Tests', () => {
  const testKey = 'TEST-LOGIN-KEY-001'
  const expiredKey = 'TEST-EXPIRED-KEY-001'
  let validKeyId: string
  let expiredKeyId: string

  beforeAll(async () => {
    // Create test keys
    const validKeyExpiry = new Date()
    validKeyExpiry.setDate(validKeyExpiry.getDate() + 1) // expires tomorrow

    const expiredKeyExpiry = new Date()
    expiredKeyExpiry.setDate(expiredKeyExpiry.getDate() - 1) // expired yesterday

    const validKeyResult = await db
      .insert(keys)
      .values({
        key: testKey,
        expiresAt: validKeyExpiry,
        isActive: true,
      })
      .returning({ id: keys.id })

    const expiredKeyResult = await db
      .insert(keys)
      .values({
        key: expiredKey,
        expiresAt: expiredKeyExpiry,
        isActive: true,
      })
      .returning({ id: keys.id })

    validKeyId = validKeyResult[0].id
    expiredKeyId = expiredKeyResult[0].id
  })

  afterAll(async () => {
    // Clean up test keys
    await db.delete(keys).where(eq(keys.id, validKeyId))
    await db.delete(keys).where(eq(keys.id, expiredKeyId))
  })

  it('should login successfully with valid key', async () => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ key: testKey }),
    })

    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.ok).toBe(true)
    
    // Should set session cookie
    const cookies = response.headers.get('set-cookie')
    expect(cookies).toContain('session=')
  })

  it('should fail login with expired key', async () => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ key: expiredKey }),
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('KEY_INVALID_OR_EXPIRED')
  })

  it('should fail login with invalid key', async () => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ key: 'INVALID-KEY' }),
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('KEY_INVALID_OR_EXPIRED')
  })

  it('should fail login without required headers', async () => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Missing X-Requested-With header
      },
      body: JSON.stringify({ key: testKey }),
    })

    expect(response.status).toBe(400)
  })

  it('should fail login with invalid input', async () => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ key: '' }),
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('INVALID_INPUT')
  })
})
