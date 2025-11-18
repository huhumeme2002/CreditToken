import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { keys } from '@/db/schema'
import { getAdminSession } from '@/lib/auth'
import { successResponse, ErrorResponses, validateHeaders, errorResponse } from '@/lib/responses'

export const runtime = 'nodejs'

// Parse DD/MM/YYYY to Date
function parseDate(dateStr: string): Date | null {
  try {
    const parts = dateStr.trim().split('/')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
    const year = parseInt(parts[2], 10)
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    
    const date = new Date(year, month, day, 23, 59, 59)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession()
    if (!admin) {
      return ErrorResponses.unauthorized()
    }

    if (!validateHeaders(request)) {
      return errorResponse('INVALID_REQUEST', 400, 'Missing required headers')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return errorResponse('INVALID_REQUEST', 400, 'No file provided')
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    if (data.length < 2) {
      return errorResponse('INVALID_DATA', 400, 'File Excel không có dữ liệu')
    }

    // Skip header row
    const rows = data.slice(1)
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      // Skip empty rows
      if (!row || row.length < 3 || !row[0]) continue
      
      const keyValue = String(row[0]).trim()
      const vndAmount = parseFloat(String(row[1]).replace(/[^0-9.]/g, ''))
      const expiryDateStr = String(row[2]).trim()
      
      // Validate
      if (!keyValue) {
        results.errors.push(`Dòng ${i + 2}: Mã đơn hàng trống`)
        results.failed++
        continue
      }
      
      if (isNaN(vndAmount) || vndAmount <= 0) {
        results.errors.push(`Dòng ${i + 2}: Giá trị không hợp lệ`)
        results.failed++
        continue
      }
      
      const expiryDate = parseDate(expiryDateStr)
      if (!expiryDate) {
        results.errors.push(`Dòng ${i + 2}: Ngày hết hạn không hợp lệ (dùng định dạng DD/MM/YYYY)`)
        results.failed++
        continue
      }
      
      // Convert VND to USD cents (1000 VND = 1 USD = 100 cents)
      const creditCents = Math.round((vndAmount / 1000) * 100)
      
      try {
        // Check if key already exists
        const existingKey = await db
          .select()
          .from(keys)
          .where(eq(keys.key, keyValue))
          .limit(1)
        
        if (existingKey.length > 0) {
          results.errors.push(`Dòng ${i + 2}: Key "${keyValue}" đã tồn tại`)
          results.failed++
          continue
        }
        
        // Insert key
        await db.insert(keys).values({
          key: keyValue,
          expiresAt: expiryDate,
          creditCents: creditCents,
        })
        
        results.success++
      } catch (error) {
        console.error('Bulk import key error:', error)
        results.errors.push(`Dòng ${i + 2}: Lỗi khi tạo key`)
        results.failed++
      }
    }

    return successResponse({
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10), // Limit to first 10 errors
    })
  } catch (error) {
    console.error('Bulk import error:', error)
    return ErrorResponses.internalError()
  }
}

export async function GET() { return ErrorResponses.methodNotAllowed() }
export async function PUT() { return ErrorResponses.methodNotAllowed() }
export async function DELETE() { return ErrorResponses.methodNotAllowed() }
export async function PATCH() { return ErrorResponses.methodNotAllowed() }
