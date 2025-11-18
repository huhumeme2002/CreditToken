import { NextRequest } from 'next/server'
import { db } from '@/db/client'
import { notices } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { successResponse, ErrorResponses } from '@/lib/responses'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Return the most recent active notice. If table doesn't exist or query fails, be graceful.
    try {
      const result = await db
        .select()
        .from(notices)
        .where(eq(notices.isActive, true))
        .orderBy(desc(notices.updatedAt))
        .limit(1)

      if (result.length === 0) {
        return successResponse(null)
      }

      const n = result[0]
      return successResponse({
        content: n.content,
        displayMode: (n as any).displayMode || 'modal',
        isActive: n.isActive,
        updatedAt: n.updatedAt?.toISOString?.() || new Date().toISOString(),
      })
    } catch (e) {
      // If the notices table is not available (migration pending), don't break the app
      return successResponse(null)
    }
  } catch (error) {
    console.error('Get notice error:', error)
    return ErrorResponses.internalError()
  }
}

export async function POST() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
export async function PATCH() { return ErrorResponses.methodNotAllowed() }

