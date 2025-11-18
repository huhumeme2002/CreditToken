import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { env } from '@/lib/env'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: env.NEXT_PUBLIC_APP_NAME,
  description: 'Hệ thống quản lý key và phát token an toàn',
  robots: 'noindex, nofollow',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <h1 className="text-xl font-semibold text-gray-900">
                  {env.NEXT_PUBLIC_APP_NAME}
                </h1>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
          
          <footer className="bg-white border-t mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-gray-500">
                © 2024 {env.NEXT_PUBLIC_APP_NAME}. Hệ thống quản lý key và token.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
