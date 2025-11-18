'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LoginError {
  message: string
}

export default function LoginPage() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!key.trim()) {
      setError({ message: 'Vui lòng nhập key để đăng nhập' })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ key: key.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        router.push('/app')
      } else {
        setError({ 
          message: data.message || getErrorMessage(data.error) 
        })
      }
    } catch (err) {
      setError({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'KEY_INVALID_OR_EXPIRED':
        return 'Key không hợp lệ hoặc đã hết hạn'
      case 'INVALID_INPUT':
        return 'Thông tin nhập vào không hợp lệ'
      default:
        return 'Đăng nhập thất bại. Vui lòng kiểm tra lại key.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập hệ thống
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Nhập key để truy cập vào hệ thống lấy token
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="key" className="form-label">
              Key đăng nhập
            </label>
            <input
              id="key"
              name="key"
              type="password"
              autoComplete="current-password"
              required
              className="form-input"
              placeholder="Nhập key của bạn"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-state rounded-lg p-3 border">
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                loading
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="spinner mr-2"></div>
                  Đang xử lý...
                </div>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
