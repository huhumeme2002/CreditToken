import { env } from './env'

export interface RateLimitResult {
  limited: boolean
  nextAvailableAt?: Date
}

/**
 * Calculate the next available time for token generation
 */
export function getNextAvailableAt(lastTokenAt: Date | null, minutes: number = env.RATE_LIMIT_MINUTES): Date | null {
  if (!lastTokenAt) return null
  
  const nextTime = new Date(lastTokenAt.getTime() + minutes * 60 * 1000)
  return nextTime
}

/**
 * Check if a key is currently rate limited
 */
export function isRateLimited(lastTokenAt: Date | null, minutes: number = env.RATE_LIMIT_MINUTES): RateLimitResult {
  if (!lastTokenAt) {
    return { limited: false }
  }

  const now = new Date()
  const nextAvailableAt = getNextAvailableAt(lastTokenAt, minutes)
  
  if (!nextAvailableAt) {
    return { limited: false }
  }

  const limited = now < nextAvailableAt

  return {
    limited,
    nextAvailableAt: limited ? nextAvailableAt : undefined
  }
}

/**
 * Calculate remaining cooldown time in milliseconds
 */
export function getRemainingCooldown(lastTokenAt: Date | null, minutes: number = env.RATE_LIMIT_MINUTES): number {
  const result = isRateLimited(lastTokenAt, minutes)
  if (!result.limited || !result.nextAvailableAt) return 0
  
  return Math.max(0, result.nextAvailableAt.getTime() - Date.now())
}

