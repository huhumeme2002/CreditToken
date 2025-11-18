import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { tokenPool } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { parseTokenLines, isValidTokenFormat } from '@/lib/utils'

// Use Node.js runtime for bulk operations
export const runtime = 'nodejs'

const uploadTokensSchema = z.object({
  tokens: z.string().min(1, 'Tokens are required'),
})

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
    const { tokens } = uploadTokensSchema.parse(body)

    // Parse token lines and validate format
    const tokenLines = parseTokenLines(tokens)
    const validTokens = tokenLines.filter(isValidTokenFormat)
    
    if (validTokens.length === 0) {
      return ErrorResponses.invalidInput('No valid tokens found')
    }

    // Limit batch size to prevent memory issues
    const MAX_BATCH_SIZE = 2000
    if (validTokens.length > MAX_BATCH_SIZE) {
      return ErrorResponses.invalidInput(`Too many tokens. Maximum ${MAX_BATCH_SIZE} tokens per upload.`)
    }

    // Prepare token records for insertion
    const tokenRecords = validTokens.map(token => ({
      value: token,
      assignedTo: null,
      assignedAt: null,
      createdAt: new Date(),
    }))

    let inserted = 0
    let duplicates = 0

    // Insert tokens in transaction with conflict handling
    await db.transaction(async (tx) => {
      for (const tokenRecord of tokenRecords) {
        try {
          await tx.insert(tokenPool).values(tokenRecord)
          inserted++
        } catch (error) {
          // Check if it's a unique constraint violation (duplicate)
          if (error instanceof Error && error.message.includes('duplicate key')) {
            duplicates++
          } else {
            throw error // Re-throw if it's not a duplicate error
          }
        }
      }
    })

    return successResponse({
      inserted,
      duplicates,
      total: validTokens.length,
    })
  } catch (error) {
    console.error('Upload tokens error:', error)
    
    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors[0]?.message)
    }
    
    return ErrorResponses.internalError()
  }
}

export async function GET() {
  return ErrorResponses.methodNotAllowed()
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
