const fs = require('fs');
const path = require('path');

console.log('🔒 Enhanced Authentication Migration Tool');
console.log('==========================================');

// Check if migrations have been run
async function checkMigrations() {
  try {
    const db = require('./db/connection');
    
    console.log('✅ Checking database migrations...');
    
    // Check if tables exist
    const tables = ['refresh_tokens', 'blacklisted_tokens', 'login_attempts'];
    const missingTables = [];
    
    for (const tableName of tables) {
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [tableName]);
      
      if (result.rows.length === 0) {
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables.join(', '));
      console.log('Please run: node server/db/runMigrations.js');
      return false;
    }
    
    console.log('✅ All required tables exist');
    return true;
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('✅ Checking environment variables...');
  
  const required = ['JWT_SECRET'];
  const recommended = ['REFRESH_TOKEN_SECRET'];
  
  const missing = [];
  const missingRecommended = [];
  
  required.forEach(envVar => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });
  
  recommended.forEach(envVar => {
    if (!process.env[envVar]) {
      missingRecommended.push(envVar);
    }
  });
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:', missing.join(', '));
    return false;
  }
  
  if (missingRecommended.length > 0) {
    console.log('⚠️  Missing recommended environment variables:', missingRecommended.join(', '));
    console.log('   Add REFRESH_TOKEN_SECRET to Railway for better security');
  }
  
  console.log('✅ Environment variables OK');
  return true;
}

// Test enhanced auth services
async function testServices() {
  try {
    console.log('✅ Testing enhanced auth services...');
    
    const tokenService = require('./services/tokenService');
    const rateLimitService = require('./services/rateLimitService');
    
    // Test token service
    const testUser = { id: 1, username: 'test', role: 'admin' };
    const accessToken = tokenService.generateAccessToken(testUser);
    console.log('✅ Token service working');
    
    // Test rate limit service
    const rateLimitStatus = await rateLimitService.getRateLimitStatus('127.0.0.1');
    console.log('✅ Rate limit service working');
    
    return true;
    
  } catch (error) {
    console.error('❌ Service test failed:', error.message);
    return false;
  }
}

// Main migration check
async function main() {
  console.log('\n🔍 Running enhanced authentication readiness check...\n');
  
  let allGood = true;
  
  // Check migrations
  const migrationsOK = await checkMigrations();
  allGood = allGood && migrationsOK;
  
  // Check environment variables
  const envOK = checkEnvironmentVariables();
  allGood = allGood && envOK;
  
  // Test services
  const servicesOK = await testServices();
  allGood = allGood && servicesOK;
  
  console.log('\n==========================================');
  
  if (allGood) {
    console.log('🎉 READY FOR ENHANCED AUTHENTICATION!');
    console.log('\nNext steps:');
    console.log('1. Add REFRESH_TOKEN_SECRET to Railway environment variables');
    console.log('2. Update your routes to use authRoutesEnhanced.js');
    console.log('3. Update frontend to handle refresh tokens');
    console.log('\nExample route update:');
    console.log("app.use('/api/auth', require('./routes/authRoutesEnhanced'));");
  } else {
    console.log('❌ NOT READY - Please fix the issues above');
  }
  
  console.log('==========================================\n');
  
  process.exit(allGood ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkMigrations, checkEnvironmentVariables, testServices };
