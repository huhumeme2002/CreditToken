import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { notices } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders } from '@/lib/responses'
import { desc } from 'drizzle-orm'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

const noticeSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  displayMode: z.enum(['modal', 'sidebar', 'both']).default('modal'),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession()
    if (!admin) return ErrorResponses.unauthorized()

    // Return latest notice (if any)
    const rows = await db.select().from(notices).orderBy(desc(notices.updatedAt)).limit(1)
    if (!rows.length) return successResponse({ content: '', displayMode: 'modal', isActive: false })

    const n = rows[0]
    return successResponse({
      content: n.content,
      displayMode: (n as any).displayMode || 'modal',
      isActive: n.isActive,
      updatedAt: n.updatedAt?.toISOString?.() || undefined,
    })
  } catch (error) {
    console.error('Admin GET notice error:', error)
    return ErrorResponses.internalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateHeaders(request)) return ErrorResponses.unauthorized()

    const admin = await getAdminSession()
    if (!admin) return ErrorResponses.unauthorized()

    const body = await request.json()
    const payload = noticeSchema.parse(body)

    // Find latest notice
    const rows = await db.select().from(notices).orderBy(desc(notices.updatedAt)).limit(1)

    if (rows.length === 0) {
      // Create a new notice
      const created = await db.insert(notices).values({
        content: payload.content,
        displayMode: payload.displayMode,
        isActive: payload.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning({
        id: notices.id,
        content: notices.content,
        displayMode: notices.displayMode,
        isActive: notices.isActive,
        updatedAt: notices.updatedAt,
      })

      const n = created[0]
      return successResponse({
        content: n.content,
        displayMode: (n as any).displayMode || 'modal',
        isActive: n.isActive,
        updatedAt: n.updatedAt?.toISOString?.(),
      })
    } else {
      // Update existing latest notice
      const current = rows[0]
      const updated = await db.update(notices).set({
        content: payload.content,
        displayMode: payload.displayMode,
        isActive: payload.isActive,
        updatedAt: new Date(),
      }).where(eq(notices.id, (current as any).id)).returning({
        content: notices.content,
        displayMode: notices.displayMode,
        isActive: notices.isActive,
        updatedAt: notices.updatedAt,
      })

      const n = updated[0]
      return successResponse({
        content: n.content,
        displayMode: (n as any).displayMode || 'modal',
        isActive: n.isActive,
        updatedAt: n.updatedAt?.toISOString?.(),
      })
    }
  } catch (error) {
    console.error('Admin POST notice error:', error)
    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors?.[0]?.message)
    }
    return ErrorResponses.internalError()
  }
}

export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
export async function PATCH() { return ErrorResponses.methodNotAllowed() }

