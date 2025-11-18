'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, maskKey, shortenId } from '@/lib/utils'
import * as XLSX from 'xlsx'

interface Stats {
  tokensTotal: number
  tokensRemaining: number
  tokensAssigned: number
  usersActive: number
  usersExpired: number
}

interface Key {
  id: string
  keyMask: string
  expiresAt: string
  isActive: boolean
  lastTokenAt: string | null
  createdAt: string
  assignedCount: number
}

interface UploadResult {
  inserted: number
  duplicates: number
  total: number
}

interface NoticeAdmin {
  content: string
  displayMode: 'modal' | 'sidebar' | 'both'
  isActive: boolean
  updatedAt?: string
}

interface TokenReportAdmin {
  id: string
  token: string | null
  keyMask: string
  deliveredAt: string | null
  reportedAt: string | null
  reason: string | null
  refundedAt: string | null
  refundAmount: number | null
}

type TabType = 'upload' | 'stats' | 'keys' | 'notice' | 'reports'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('stats')
  const [stats, setStats] = useState<Stats | null>(null)
  const [keys, setKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Upload tokens state
  const [tokens, setTokens] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Create key state
  const [newKey, setNewKey] = useState('')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [newKeyCredit, setNewKeyCredit] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  
  // Keys pagination
  const [keysLoading, setKeysLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Notice state
  const [notice, setNotice] = useState<NoticeAdmin>({ content: '', displayMode: 'modal', isActive: false })
  const [noticeLoading, setNoticeLoading] = useState(false)
  const [noticeSavedAt, setNoticeSavedAt] = useState<string | null>(null)
  
  // Recently created key (for copy/share) - only show the latest one
  const [recentKey, setRecentKey] = useState<string | null>(null)
  const [copyOk, setCopyOk] = useState<boolean>(false)

  // Token reports
  const [reports, setReports] = useState<TokenReportAdmin[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats()
    } else if (activeTab === 'keys') {
      fetchKeys()
    } else if (activeTab === 'notice') {
      fetchNotice()
    } else if (activeTab === 'reports') {
      fetchReports()
    }
  }, [activeTab])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      } else if (response.status === 401) {
        router.push('/admin/login')
      } else {
        setError('Không thể tải thống kê')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải thống kê')
    } finally {
      setLoading(false)
    }
  }

  const fetchKeys = async () => {
    setKeysLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      params.append('limit', '50')
      
      const response = await fetch(`/api/admin/keys?${params}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setKeys(data.data.keys)
      } else if (response.status === 401) {
        router.push('/admin/login')
      } else {
        setError('Không thể tải danh sách keys')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải keys')
    } finally {
      setKeysLoading(false)
    }
  }

  const fetchNotice = async () => {
    setNoticeLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/notice', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (response.ok) {
        const data = await response.json()
        if (data?.data) setNotice(data.data)
      } else if (response.status === 401) {
        router.push('/admin/login')
      }
    } catch (e) {
      // ignore
    } finally {
      setNoticeLoading(false)
    }
  }

  const fetchReports = async () => {
    setReportsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/reports', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })

      if (response.ok) {
        const data = await response.json()
        // Giả định API trả về { data: { reports: TokenReportAdmin[] } }
        if (data?.data?.reports) {
          setReports(data.data.reports)
        } else if (Array.isArray(data?.reports)) {
          // fallback nếu API trả về { reports: [...] }
          setReports(data.reports)
        } else {
          setReports([])
        }
      } else if (response.status === 401) {
        router.push('/admin/login')
      } else {
        setError('Không thể tải báo cáo token')
      }
    } catch (e) {
      setError('Có lỗi xảy ra khi tải báo cáo token')
    } finally {
      setReportsLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel files
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
      
      // Extract first column from each row
      const tokens = data
        .map((row: any) => Array.isArray(row) ? row[0] : row)
        .filter((token: any) => token && typeof token === 'string' && token.trim().length > 0)
        .map((token: any) => token.toString().trim())
      
      return tokens.join('\n')
    } else {
      // Handle text/CSV files
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(line => line.trim())
      
      // Handle CSV format - extract first column if comma separated
      const tokens = lines.map(line => {
        const columns = line.split(/[,\t]/) // Split by comma or tab
        return columns[0].trim() // Take first column
      }).filter(token => token.length > 0)
      
      return tokens.join('\n')
    }
  }

  const handleUploadTokens = async () => {
    let tokensToUpload = tokens
    
    if (uploadMode === 'file') {
      if (!selectedFile) {
        setError('Vui lòng chọn file')
        return
      }
      
      try {
        tokensToUpload = await handleFileUpload(selectedFile)
      } catch (err) {
        setError('Không thể đọc file. Vui lòng kiểm tra định dạng file.')
        return
      }
    } else {
      if (!tokens.trim()) {
        setError('Vui lòng nhập tokens')
        return
      }
    }

    setUploadLoading(true)
    setError(null)
    setUploadResult(null)

    try {
      const response = await fetch('/api/admin/upload-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ tokens: tokensToUpload }),
      })

      const data = await response.json()

      if (response.ok) {
        setUploadResult(data.data)
        setTokens('')
        setSelectedFile(null)
        // Refresh stats if on stats tab
        if (activeTab === 'stats') {
          await fetchStats()
        }
      } else {
        setError(data.message || 'Không thể upload tokens')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi upload tokens')
    } finally {
      setUploadLoading(false)
    }
  }

  const randomKey = (prefix: string = 'KEY'): string => {
    const arr = new Uint8Array(10)
    crypto.getRandomValues(arr)
    const part = Array.from(arr, b => (b % 36).toString(36)).join('').toUpperCase()
    return `${prefix}-${part}`
  }

  const handleCreateKey = async () => {
    if (!newKey.trim() || !newExpiresAt) {
      setError('Vui lòng nhập đầy đủ thông tin key')
      return
    }

    setCreateLoading(true)
    setError(null)

    try {
      // Parse credit amount if provided
      const creditCents = newKeyCredit.trim() 
        ? Math.round(parseFloat(newKeyCredit.replace(',', '.')) * 100)
        : 0

      if (newKeyCredit.trim() && (isNaN(creditCents) || creditCents < 0)) {
        setError('Credit không hợp lệ')
        setCreateLoading(false)
        return
      }

      const response = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          key: newKey.trim(),
          expiresAt: new Date(newExpiresAt).toISOString(),
          creditCents: creditCents,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewKey('')
        setNewExpiresAt('')
        setNewKeyCredit('')
        await fetchKeys()
      } else {
        setError(data.message || 'Không thể tạo key')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tạo key')
    } finally {
      setCreateLoading(false)
    }
  }

  const createKeyWithDuration = async (duration: '1d' | '7d' | '1m' | '3m' | '1y') => {
    const now = new Date()
    const expires = new Date(now)
    switch (duration) {
      case '1d':
        expires.setDate(now.getDate() + 1)
        break
      case '7d':
        expires.setDate(now.getDate() + 7)
        break
      case '1m':
        expires.setMonth(now.getMonth() + 1)
        break
      case '3m':
        expires.setMonth(now.getMonth() + 3)
        break
      case '1y':
        expires.setFullYear(now.getFullYear() + 1)
        break
    }

    const genKey = randomKey('KEY')
    setCreateLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ key: genKey, expiresAt: expires.toISOString() }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.message || 'Không thể tạo key')
      } else {
        // Save the generated key for quick copy and also copy to clipboard
        setRecentKey(genKey)
        try { await navigator.clipboard.writeText(genKey) } catch {}
        await fetchKeys()
      }
    } catch (e) {
      setError('Có lỗi xảy ra khi tạo key nhanh')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleToggleKey = async (keyId: string) => {
    try {
      const response = await fetch('/api/admin/keys/toggle', {
        method: 'PATCH',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyId }),
      })

      if (response.ok) {
        await fetchKeys()
      } else {
        const data = await response.json().catch(() => null)
        setError(data?.message || 'Không thể thay đổi trạng thái key')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi thay đổi trạng thái key')
    }
  }

  const handleUpdateCredit = async (keyId: string, currentCreditCents: number) => {
    const currentUsd = (currentCreditCents || 0) / 100
    const input = window.prompt('Nhập credit mới cho key (USD):', currentUsd.toString())
    if (input === null) return

    const normalized = input.replace(',', '.').trim()
    const value = Number.parseFloat(normalized)

    if (Number.isNaN(value) || value < 0) {
      alert('Giá trị credit không hợp lệ')
      return
    }

    const creditCents = Math.round(value * 100)

    try {
      const response = await fetch('/api/admin/keys/credit', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ keyId, creditCents }),
      })

      if (response.ok) {
        await fetchKeys()
      } else if (response.status === 401) {
        router.push('/admin/login')
      } else {
        const data = await response.json().catch(() => null)
        setError(data?.message || 'Không thể cập nhật credit')
      }
    } catch (e) {
      setError('Có lỗi xảy ra khi cập nhật credit')
    }
  }

  const handleRefund = async (reportId: string) => {
    if (!window.confirm('Bạn có chắc muốn refund cho token report này?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/reports/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ reportId }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Đã refund thành công $${data.data.refundAmount} (thời gian: ${data.data.timeDiffMinutes} phút)`)
        await fetchReports()
      } else if (response.status === 401) {
        router.push('/admin/login')
      } else {
        const message = data?.message || 'Không thể refund'
        alert(message)
      }
    } catch (e) {
      alert('Có lỗi xảy ra khi refund')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      router.push('/admin/login')
    } catch (err) {
      router.push('/admin/login')
    }
  }

  // Set default expiration date (30 days from now)
  useEffect(() => {
    const defaultExpiry = new Date()
    defaultExpiry.setDate(defaultExpiry.getDate() + 30)
    setNewExpiresAt(defaultExpiry.toISOString().slice(0, 16))
  }, [])

  const saveNotice = async () => {
    setNoticeLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/notice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(notice),
      })
      const data = await response.json()
      if (response.ok && data?.data) {
        setNoticeSavedAt(new Date().toISOString())
      } else {
        setError(data?.message || 'Không thể lưu thông báo')
      }
    } catch (e) {
      setError('Có lỗi xảy ra khi lưu thông báo')
    } finally {
      setNoticeLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="btn-secondary"
        >
          Đăng xuất
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'stats', label: 'Thống kê' },
            { id: 'upload', label: 'Upload Tokens' },
            { id: 'keys', label: 'Quản lý Keys' },
            { id: 'notice', label: 'Thông báo' },
            { id: 'reports', label: 'Báo cáo token' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-state rounded-lg p-4 border mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Báo cáo token</h2>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian lấy</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian report</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {r.token || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {r.keyMask || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {r.deliveredAt ? formatDate(r.deliveredAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {r.reportedAt ? formatDate(r.reportedAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={r.reason || ''}>
                        {r.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {r.refundedAt ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Đã refund ${(r.refundAmount || 0) / 100}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Chưa refund
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!r.refundedAt && (
                          <button
                            onClick={() => handleRefund(r.id)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-900"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && !reportsLoading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Chưa có báo cáo token nào.
                      </td>
                    </tr>
                  )}
                  {reportsLoading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Đang tải báo cáo...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Thống kê hệ thống</h2>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>

          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value text-orange-600">
                  {stats.tokensAssigned} / {stats.tokensTotal}
                </div>
                <div className="stat-label">Tokens đã lấy / Tổng</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.tokensTotal > 0 ? ((stats.tokensAssigned / stats.tokensTotal) * 100).toFixed(1) : 0}% đã sử dụng
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-blue-600">{stats.tokensRemaining}</div>
                <div className="stat-label">Tokens còn lại</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">{stats.usersActive}</div>
                <div className="stat-label">Users hoạt động</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-red-600">{stats.usersExpired}</div>
                <div className="stat-label">Users hết hạn</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Tokens Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Upload Tokens</h2>
          
          <div className="card">
            <div className="space-y-4">
              {/* Upload Mode Toggle */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setUploadMode('text')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    uploadMode === 'text'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                  disabled={uploadLoading}
                >
                  📝 Nhập Text
                </button>
                <button
                  onClick={() => setUploadMode('file')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    uploadMode === 'file'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                  disabled={uploadLoading}
                >
                  📁 Upload File
                </button>
              </div>

              {/* Text Input Mode */}
              {uploadMode === 'text' && (
                <div>
                  <label className="form-label">
                    Tokens (mỗi dòng một token)
                  </label>
                  <textarea
                    className="form-input custom-scrollbar"
                    rows={10}
                    placeholder="POOL-TOK-0001-ABCD1234567890EFGHIJKLMNOPQRSTUV&#10;POOL-TOK-0002-WXYZ9876543210FEDCBA0987654321UV&#10;..."
                    value={tokens}
                    onChange={(e) => setTokens(e.target.value)}
                    disabled={uploadLoading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Nhập mỗi dòng một token. Hệ thống sẽ tự động lọc trùng lặp và tokens không hợp lệ.
                  </p>
                </div>
              )}

              {/* File Upload Mode */}
              {uploadMode === 'file' && (
                <div>
                  <label className="form-label">
                    Chọn file Excel/CSV (.xlsx, .csv, .txt)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="form-input"
                    disabled={uploadLoading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Chọn file Excel/CSV với tokens ở cột đầu tiên, mỗi token một dòng. Hỗ trợ định dạng: .xlsx, .csv, .txt
                  </p>
                  {selectedFile && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-700">
                        📄 File đã chọn: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleUploadTokens}
                disabled={uploadLoading || (uploadMode === 'text' ? !tokens.trim() : !selectedFile)}
                className={uploadLoading || (uploadMode === 'text' ? !tokens.trim() : !selectedFile) ? 'btn-disabled' : 'btn-primary'}
              >
                {uploadLoading ? (
                  <div className="flex items-center">
                    <div className="spinner mr-2"></div>
                    Đang upload...
                  </div>
                ) : (
                  `📤 Upload Tokens ${uploadMode === 'file' ? 'từ File' : ''}`
                )}
              </button>
            </div>
          </div>

          {uploadResult && (
            <div className="success-state rounded-lg p-4 border">
              <h3 className="font-medium mb-2">Kết quả upload:</h3>
              <ul className="text-sm space-y-1">
                <li>• Đã thêm: <strong>{uploadResult.inserted}</strong> tokens</li>
                <li>• Trùng lặp: <strong>{uploadResult.duplicates}</strong> tokens</li>
                <li>• Tổng xử lý: <strong>{uploadResult.total}</strong> tokens</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Keys Management Tab */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Quản lý Keys</h2>

          {/* Quick create preset durations */}
          <div className="card">
            <div className="space-y-3">
              <div className="text-sm text-gray-700">Tạo nhanh:</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => createKeyWithDuration('1d')} className="btn-secondary">+ Key 1 ngày</button>
                <button onClick={() => createKeyWithDuration('7d')} className="btn-secondary">+ Key 7 ngày</button>
                <button onClick={() => createKeyWithDuration('1m')} className="btn-secondary">+ Key 1 tháng</button>
                <button onClick={() => createKeyWithDuration('3m')} className="btn-secondary">+ Key 3 tháng</button>
                <button onClick={() => createKeyWithDuration('1y')} className="btn-secondary">+ Key 1 năm</button>
              </div>

              {/* Recently created section */}
              {recentKey && (
                <div className="mt-3">
                  <div className="text-sm text-gray-700 mb-1">Vừa tạo xong:</div>
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <code className="text-sm font-mono break-all mr-2">{recentKey}</code>
                    <button
                      className={copyOk ? 'btn-success' : 'btn-secondary'}
                      onClick={async () => {
                        try { 
                          await navigator.clipboard.writeText(recentKey); 
                          setCopyOk(true); 
                          setTimeout(()=>setCopyOk(false), 1500) 
                        } catch {}
                      }}
                    >{copyOk ? '✓ Copied' : 'Copy'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create Key Form */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-md font-medium">Tạo Key mới</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Key</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="MY-NEW-KEY-001"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  disabled={createLoading}
                />
              </div>
              
              <div>
                <label className="form-label">Ngày hết hạn</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  disabled={createLoading}
                />
              </div>
              
              <div>
                <label className="form-label">Credit ban đầu ($)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="0"
                  value={newKeyCredit}
                  onChange={(e) => setNewKeyCredit(e.target.value)}
                  disabled={createLoading}
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleCreateKey}
                  disabled={createLoading || !newKey.trim() || !newExpiresAt}
                  className={createLoading || !newKey.trim() || !newExpiresAt ? 'btn-disabled' : 'btn-primary'}
                >
                  {createLoading ? 'Tạo...' : 'Tạo Key'}
                </button>
              </div>
            </div>
          </div>

          {/* Search Keys */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm key..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={fetchKeys}
              disabled={keysLoading}
              className="btn-secondary"
            >
              {keysLoading ? 'Tìm...' : 'Tìm kiếm'}
            </button>
          </div>

          {/* Keys Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hết hạn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens nhận
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit ($)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lần cuối
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {shortenId(key.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {key.keyMask}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(key.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          key.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {key.isActive ? 'Hoạt động' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.assignedCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {((key as any).creditCents || 0) / 100}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.lastTokenAt ? formatDate(key.lastTokenAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleToggleKey(key.id)}
                          className={`text-sm font-medium ${
                            key.isActive 
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {key.isActive ? 'Vô hiệu' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => handleUpdateCredit(key.id, (key as any).creditCents || 0)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-900 ml-4"
                        >
                          Cập nhật credit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {keys.length === 0 && !keysLoading && (
                <div className="text-center py-4 text-gray-500">
                  Không có keys nào
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notice Tab */}
      {activeTab === 'notice' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Thông báo người dùng</h2>
          <div className="card">
            <div className="space-y-4">
              <div>
                <label className="form-label">Nội dung thông báo</label>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder="Nhập nội dung muốn thông báo cho người dùng..."
                  value={notice.content}
                  onChange={(e) => setNotice({ ...notice, content: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Kiểu hiển thị</label>
                  <select
                    className="form-input"
                    value={notice.displayMode}
                    onChange={(e) => setNotice({ ...notice, displayMode: e.target.value as NoticeAdmin['displayMode'] })}
                  >
                    <option value="modal">Pop-up khi vào trang</option>
                    <option value="sidebar">Bảng thông báo bên phải</option>
                    <option value="both">Cả hai</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={notice.isActive}
                      onChange={(e) => setNotice({ ...notice, isActive: e.target.checked })}
                    />
                    <span>Hiển thị cho người dùng</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveNotice} disabled={noticeLoading} className={noticeLoading ? 'btn-disabled' : 'btn-primary'}>
                  {noticeLoading ? 'Đang lưu...' : 'Lưu thông báo'}
                </button>
                {noticeSavedAt && (
                  <span className="text-sm text-gray-500">Đã lưu: {formatDate(noticeSavedAt)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
