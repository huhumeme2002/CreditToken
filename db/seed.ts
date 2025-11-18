import { db } from './client'
import { keys, tokenPool } from './schema'
import { eq } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Starting database seeding...')

  try {
    // Create demo keys
    console.log('Creating demo keys...')
    
    // Valid key (expires in 90 days)
    const validKeyExpiration = new Date()
    validKeyExpiration.setDate(validKeyExpiration.getDate() + 90)
    
    const validKey = await db
      .insert(keys)
      .values({
        key: 'DEMO-KEY-VALID-1',
        expiresAt: validKeyExpiration,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning({ id: keys.id })

    if (validKey.length > 0) {
      console.log('✅ Created valid demo key: DEMO-KEY-VALID-1')
    } else {
      console.log('ℹ️  Valid demo key already exists')
    }

    // Expired key (expired 1 day ago)
    const expiredKeyExpiration = new Date()
    expiredKeyExpiration.setDate(expiredKeyExpiration.getDate() - 1)
    
    const expiredKey = await db
      .insert(keys)
      .values({
        key: 'DEMO-KEY-EXPIRED',
        expiresAt: expiredKeyExpiration,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning({ id: keys.id })

    if (expiredKey.length > 0) {
      console.log('✅ Created expired demo key: DEMO-KEY-EXPIRED')
    } else {
      console.log('ℹ️  Expired demo key already exists')
    }

    // Create demo tokens for the pool
    console.log('Creating demo tokens...')
    
    const demoTokens = [
      'POOL-TOK-0001-ABCD1234567890EFGHIJKLMNOPQRSTUV',
      'POOL-TOK-0002-WXYZ9876543210FEDCBA0987654321UV',
      'POOL-TOK-0003-QWER5678901234TYUIOPASDFGHJKLZXC',
      'POOL-TOK-0004-MNBV2468135790QAZWSXEDCRFVTGBYHN',
      'POOL-TOK-0005-PLOK8642097531MJNHBGVFCDXSAWQERC',
      'POOL-TOK-0006-ZXCV1357924680POIUYTREWQASDFGHJ',
      'POOL-TOK-0007-LKJH0246813579MNBVCXZASDFGPOIUY',
      'POOL-TOK-0008-FGHI9753108642WERTYUIOPQWERTASD',
      'POOL-TOK-0009-CVBN4681357902YHNMJUKILOPQWERTY',
      'POOL-TOK-0010-RTYU7024681359ASDFGHJKLZXCVBNMQ',
    ]

    let tokensCreated = 0
    let tokensSkipped = 0

    for (const tokenValue of demoTokens) {
      try {
        await db
          .insert(tokenPool)
          .values({ value: tokenValue })
        tokensCreated++
      } catch (error) {
        // Token already exists (unique constraint)
        tokensSkipped++
      }
    }

    console.log(`✅ Created ${tokensCreated} demo tokens`)
    if (tokensSkipped > 0) {
      console.log(`ℹ️  Skipped ${tokensSkipped} tokens (already exist)`)
    }

    // Show summary
    console.log('\n📊 Seed Summary:')
    console.log('Demo Keys:')
    console.log('  - DEMO-KEY-VALID-1 (valid for 90 days)')
    console.log('  - DEMO-KEY-EXPIRED (expired 1 day ago)')
    console.log(`Demo Tokens: ${demoTokens.length} tokens in pool`)
    
    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\nYou can now:')
    console.log('1. Start the dev server: pnpm dev')
    console.log('2. Login with DEMO-KEY-VALID-1 to test token generation')
    console.log('3. Try DEMO-KEY-EXPIRED to see expiration handling')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run seed if this script is executed directly
if (require.main === module) {
  seed()
}

export default seed
