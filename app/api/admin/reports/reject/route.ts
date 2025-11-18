import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tokenReports } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders, errorResponse } from '@/lib/responses'

export const runtime = 'nodejs'

const rejectSchema = z.object({
  reportId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession()
    if (!admin) {
      return ErrorResponses.unauthorized()
    }

    if (!validateHeaders(request)) {
      return errorResponse('INVALID_REQUEST', 400, 'Missing required headers')
    }

    const body = await request.json()
    const { reportId } = rejectSchema.parse(body)

    // Get report
    const report = await db
      .select({
        id: tokenReports.id,
        refundedAt: tokenReports.refundedAt,
        rejectedAt: tokenReports.rejectedAt,
      })
      .from(tokenReports)
      .where(eq(tokenReports.id, reportId))
      .limit(1)

    if (report.length === 0) {
      return errorResponse('NOT_FOUND', 404, 'Report not found')
    }

    const reportData = report[0]

    // Check if already processed
    if (reportData.refundedAt) {
      return errorResponse('ALREADY_REFUNDED', 400, 'This report has already been refunded')
    }

    if (reportData.rejectedAt) {
      return errorResponse('ALREADY_REJECTED', 400, 'This report has already been rejected')
    }

    // Mark report as rejected
    await db
      .update(tokenReports)
      .set({
        rejectedAt: new Date(),
      })
      .where(eq(tokenReports.id, reportId))

    return successResponse({ rejected: true })
  } catch (error) {
    console.error('Admin reject error:', error)
    
    if (error instanceof z.ZodError) {
      return ErrorResponses.invalidInput(error.errors[0]?.message)
    }
    
    return ErrorResponses.internalError()
  }
}

export async function GET() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
export async function PATCH() { return ErrorResponses.methodNotAllowed() }
