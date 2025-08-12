const db = require('./db/connection');

async function clearRateLimit() {
  try {
    console.log('🧹 Clearing rate limit data...');
    
    // Clear all login attempts from the last 24 hours
    const result = await db.query(`
      DELETE FROM login_attempts 
      WHERE attempted_at > NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`✅ Cleared ${result.rowCount} login attempts`);
    
    // Show current rate limit status
    const stats = await db.query(`
      SELECT 
        ip_address,
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE success = FALSE) as failed_attempts,
        MAX(attempted_at) as last_attempt
      FROM login_attempts
      WHERE attempted_at > NOW() - INTERVAL '15 minutes'
      GROUP BY ip_address
      ORDER BY failed_attempts DESC
      LIMIT 10
    `);
    
    if (stats.rows.length > 0) {
      console.log('\n📊 Current rate limit status:');
      stats.rows.forEach(row => {
        console.log(`IP: ${row.ip_address} - Failed: ${row.failed_attempts}, Last: ${row.last_attempt}`);
      });
    } else {
      console.log('\n✅ No active rate limits found');
    }
    
    console.log('\n🎉 Rate limit cleared! You can now try logging in again.');
    
  } catch (error) {
    console.error('❌ Error clearing rate limit:', error);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  clearRateLimit();
}

module.exports = clearRateLimit;
