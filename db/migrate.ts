import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { neon } from '@neondatabase/serverless'
import { env } from '@/lib/env'

async function runMigrations() {
  console.log('🚀 Starting database migrations...')
  
  try {
    const sql = neon(env.DATABASE_URL)
    const db = drizzle(sql as any)
    
    await migrate(db, { migrationsFolder: './drizzle' })
    
    console.log('✅ Database migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
}
