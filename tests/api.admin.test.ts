import { describe, it, expect, beforeAll } from 'vitest'
import { signAdminSession } from '@/lib/auth'
import { env } from '@/lib/env'

describe('API Admin Tests', () => {
  let adminSessionToken: string

  beforeAll(async () => {
    adminSessionToken = await signAdminSession()
  })

  describe('Admin Login', () => {
    it('should login successfully with correct secret', async () => {
      const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ secret: env.ADMIN_SECRET }),
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.ok).toBe(true)
      
      // Should set admin session cookie
      const cookies = response.headers.get('set-cookie')
      expect(cookies).toContain('admin_session=')
    })

    it('should fail login with incorrect secret', async () => {
      const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ secret: 'wrong-secret' }),
      })

      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data.error).toBe('ADMIN_AUTH_FAILED')
    })
  })

  describe('Admin Stats', () => {
    it('should get stats with admin session', async () => {
      const response = await fetch('http://localhost:3000/api/admin/stats', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `admin_session=${adminSessionToken}`,
        },
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.data).toHaveProperty('tokensRemaining')
      expect(data.data).toHaveProperty('tokensAssigned')
      expect(data.data).toHaveProperty('usersActive')
      expect(data.data).toHaveProperty('usersExpired')
    })

    it('should fail without admin session', async () => {
      const response = await fetch('http://localhost:3000/api/admin/stats', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Upload Tokens', () => {
    it('should upload tokens successfully', async () => {
      const testTokens = [
        'UPLOAD-TEST-001-ABCD1234567890',
        'UPLOAD-TEST-002-EFGH5678901234',
        'UPLOAD-TEST-003-IJKL9012345678',
      ].join('\n')

      const response = await fetch('http://localhost:3000/api/admin/upload-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `admin_session=${adminSessionToken}`,
        },
        body: JSON.stringify({ tokens: testTokens }),
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.data).toHaveProperty('inserted')
      expect(data.data).toHaveProperty('duplicates')
      expect(data.data).toHaveProperty('total')
      expect(data.data.total).toBe(3)
    })

    it('should handle duplicate tokens', async () => {
      // Upload same tokens again
      const testTokens = [
        'UPLOAD-TEST-001-ABCD1234567890',
        'UPLOAD-TEST-002-EFGH5678901234',
      ].join('\n')

      const response = await fetch('http://localhost:3000/api/admin/upload-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `admin_session=${adminSessionToken}`,
        },
        body: JSON.stringify({ tokens: testTokens }),
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.data.duplicates).toBeGreaterThan(0)
    })

    it('should fail without admin session', async () => {
      const response = await fetch('http://localhost:3000/api/admin/upload-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ tokens: 'TEST-TOKEN' }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Keys Management', () => {
    it('should create key successfully', async () => {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      const response = await fetch('http://localhost:3000/api/admin/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `admin_session=${adminSessionToken}`,
        },
        body: JSON.stringify({
          key: 'ADMIN-TEST-KEY-001',
          expiresAt: expiresAt.toISOString(),
        }),
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('keyMask')
      expect(data.data.isActive).toBe(true)
    })

    it('should get keys list', async () => {
      const response = await fetch('http://localhost:3000/api/admin/keys', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `admin_session=${adminSessionToken}`,
        },
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.data).toHaveProperty('keys')
      expect(Array.isArray(data.data.keys)).toBe(true)
    })

    it('should fail without admin session', async () => {
      const response = await fetch('http://localhost:3000/api/admin/keys', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      expect(response.status).toBe(401)
    })
  })
})
