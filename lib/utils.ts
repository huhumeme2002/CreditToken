/**
 * Mask a key for display purposes
 * Shows first 4 and last 4 characters with asterisks in between
 */
export function maskKey(key: string): string {
  if (key.length <= 8) {
    return '*'.repeat(key.length)
  }
  
  const start = key.slice(0, 4)
  const end = key.slice(-4)
  const middle = '*'.repeat(Math.max(4, key.length - 8))
  
  return `${start}${middle}${end}`
}

/**
 * Parse lines from text input (for token upload)
 * Removes empty lines, trims whitespace, and deduplicates
 */
export function parseTokenLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  // Remove duplicates while preserving order
  return Array.from(new Set(lines))
}

/**
 * Generate a random token (for testing purposes)
 * In production, tokens come from the uploaded pool
 */
export function generateRandomToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate token format (basic validation)
 */
export function isValidTokenFormat(token: string): boolean {
  // Basic validation - should be non-empty string with reasonable length
  // Increased max length to support longer tokens (like JWT or base64 encoded)
  return typeof token === 'string' && token.length >= 8 && token.length <= 2048
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Check if a date is in the past
 */
export function isDateExpired(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return d < new Date()
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Sanitize string for safe display
 */
export function sanitizeString(str: string): string {
  return str.replace(/[<>'"&]/g, (char) => {
    switch (char) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#x27;'
      case '&': return '&amp;'
      default: return char
    }
  })
}

/**
 * Create a short ID for display
 */
export function shortenId(id: string, length: number = 8): string {
  return id.slice(0, length)
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Format cooldown time for display
 */
export function formatCooldownTime(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}
