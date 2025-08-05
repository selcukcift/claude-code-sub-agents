/**
 * Test script to verify database connection and basic functionality
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test a simple query
    const userCount = await prisma.user.count()
    console.log(`📊 Current user count: ${userCount}`)
    
    const categoryCount = await prisma.category.count()
    console.log(`📊 Current category count: ${categoryCount}`)
    
    console.log('🎉 Database test completed successfully!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()