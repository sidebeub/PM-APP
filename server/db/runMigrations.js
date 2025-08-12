const fs = require('fs');
const path = require('path');
const db = require('./connection');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_refresh_tokens.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration SQL loaded');
    
    // Execute the migration
    await db.query(migrationSQL);
    console.log('✅ Migration executed successfully!');
    
    // Verify tables were created
    const tables = ['refresh_tokens', 'blacklisted_tokens', 'login_attempts'];
    
    for (const tableName of tables) {
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [tableName]);
      
      if (result.rows.length > 0) {
        console.log(`✅ Table '${tableName}' created successfully`);
      } else {
        console.log(`❌ Table '${tableName}' was not created`);
      }
    }
    
    // Verify function was created
    const functionResult = await db.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'cleanup_expired_tokens'
    `);
    
    if (functionResult.rows.length > 0) {
      console.log('✅ Function cleanup_expired_tokens() created successfully');
    } else {
      console.log('❌ Function cleanup_expired_tokens() was not created');
    }
    
    console.log('🎉 All migrations completed successfully!');
    
    // Test the cleanup function
    console.log('🧹 Testing cleanup function...');
    const cleanupResult = await db.query('SELECT cleanup_expired_tokens()');
    console.log(`✅ Cleanup function works! Cleaned up ${cleanupResult.rows[0].cleanup_expired_tokens} expired tokens`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
