import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().length(64, 'JWT_SECRET must be 64 hex characters (32 bytes)'),
  ADMIN_SECRET: z.string().min(8, 'ADMIN_SECRET must be at least 8 characters'),
  RATE_LIMIT_MINUTES: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).default('20'),
  ADMIN_SESSION_TTL_DAYS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).default('7'),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default('Key Token App'),
})

// Skip validation if essential env vars are missing (build time or dev without env setup)
const shouldSkipValidation = 
  // During production builds
  (process.env.NODE_ENV === 'production' && (
    process.env.VERCEL_ENV === undefined || // During build, VERCEL_ENV is not set
    process.env.NEXT_PHASE === 'phase-production-build' || // Next.js build phase
    !process.env.DATABASE_URL || // No database during build
    !process.env.JWT_SECRET || // No secrets during build
    !process.env.ADMIN_SECRET
  )) ||
  // During development without env vars set
  (process.env.NODE_ENV === 'development' && (
    !process.env.DATABASE_URL ||
    !process.env.JWT_SECRET ||
    !process.env.ADMIN_SECRET
  ))

export const env = shouldSkipValidation 
  ? {
      DATABASE_URL: process.env.DATABASE_URL || '',
      JWT_SECRET: process.env.JWT_SECRET || '',
      ADMIN_SECRET: process.env.ADMIN_SECRET || '',
      RATE_LIMIT_MINUTES: parseInt(process.env.RATE_LIMIT_MINUTES || '20'),
      ADMIN_SESSION_TTL_DAYS: parseInt(process.env.ADMIN_SESSION_TTL_DAYS || '7'),
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Key Token App',
    }
  : envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      RATE_LIMIT_MINUTES: process.env.RATE_LIMIT_MINUTES || '20',
      ADMIN_SESSION_TTL_DAYS: process.env.ADMIN_SESSION_TTL_DAYS || '7',
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Key Token App',
    })
