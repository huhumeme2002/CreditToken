import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { tokenReports, keys, deliveries, tokenPool } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders, errorResponse } from '@/lib/responses'

export const runtime = 'nodejs'

const refundSchema = z.object({
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
    const { reportId } = refundSchema.parse(body)
    
    console.log('[Refund] Processing refund for reportId:', reportId)

    // Get report details
    const reportRecord = await db
      .select()
      .from(tokenReports)
      .where(eq(tokenReports.id, reportId))
      .limit(1)

    if (reportRecord.length === 0) {
      return errorResponse('NOT_FOUND', 404, 'Report not found')
    }

    const reportData = reportRecord[0]

    // Check if already refunded
    if (reportData.refundedAt) {
      return errorResponse('ALREADY_REFUNDED', 400, 'This report has already been refunded')
    }

    console.log('[Refund] Report data:', { keyId: reportData.keyId, tokenId: reportData.tokenId })

    // Get delivery time
    const deliveryRecord = await db
      .select({
        deliveredAt: deliveries.deliveredAt,
      })
      .from(deliveries)
      .where(and(
        eq(deliveries.keyId, reportData.keyId),
        eq(deliveries.tokenId, reportData.tokenId)
      ))
      .limit(1)

    console.log('[Refund] Delivery record found:', deliveryRecord.length > 0)

    if (deliveryRecord.length === 0) {
      console.error('[Refund] No delivery record found for keyId:', reportData.keyId, 'tokenId:', reportData.tokenId)
      return errorResponse('INVALID_DATA', 400, 'Delivery record not found')
    }

    const deliveredAt = deliveryRecord[0].deliveredAt
    if (!deliveredAt || !reportData.reportedAt) {
      console.error('[Refund] Missing timestamps - deliveredAt:', deliveredAt, 'reportedAt:', reportData.reportedAt)
      return errorResponse('INVALID_DATA', 400, 'Missing delivery or report time')
    }

    // Calculate time difference in minutes
    const deliveredTime = new Date(deliveredAt).getTime()
    const reportedTime = new Date(reportData.reportedAt).getTime()
    const diffMinutes = (reportedTime - deliveredTime) / (1000 * 60)

    console.log('[Refund] Time diff:', diffMinutes, 'minutes')

    // Determine refund amount based on time difference
    // < 10 minutes: full refund $2.5 (250 cents)
    // >= 10 minutes: partial refund $1.25 (125 cents)
    const refundAmount = diffMinutes < 10 ? 250 : 125

    console.log('[Refund] Refund amount:', refundAmount, 'cents')

    // Get current key credit
    const keyRecord = await db
      .select({ creditCents: keys.creditCents })
      .from(keys)
      .where(eq(keys.id, reportData.keyId))
      .limit(1)

    if (keyRecord.length === 0) {
      console.error('[Refund] Key not found:', reportData.keyId)
      return errorResponse('NOT_FOUND', 404, 'Key not found')
    }

    const currentCredit = keyRecord[0].creditCents || 0
    const newCreditCents = currentCredit + refundAmount

    console.log('[Refund] Credit update:', currentCredit, '->', newCreditCents)

    // Update key credit first
    await db
      .update(keys)
      .set({
        creditCents: newCreditCents,
      })
      .where(eq(keys.id, reportData.keyId))
    
    console.log('[Refund] Key credit updated')

    // Mark report as refunded
    await db
      .update(tokenReports)
      .set({
        refundedAt: new Date(),
        refundAmount: refundAmount,
      })
      .where(eq(tokenReports.id, reportId))
      
    console.log('[Refund] Report marked as refunded')

    return successResponse({
      refunded: true,
      refundAmount: refundAmount / 100, // return in dollars
      timeDiffMinutes: Math.round(diffMinutes * 10) / 10,
    })
  } catch (error) {
    console.error('Admin refund error:', error)
    
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
