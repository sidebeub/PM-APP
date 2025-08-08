const fs = require('fs');
const path = require('path');
const db = require('./connection');

async function runKbomMigration() {
  try {
    console.log('🚀 Starting KBOM table migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'create_kbom_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('✅ KBOM table created successfully!');
    
    // Verify the table exists
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'kbom'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ KBOM table verified in database');
      
      // Check sample data
      const sampleData = await db.query('SELECT COUNT(*) as count FROM kbom');
      console.log(`📊 KBOM table contains ${sampleData.rows[0].count} records`);
      
      // Show sample records
      const samples = await db.query('SELECT rowid, title, customer, so, wo_number FROM kbom LIMIT 3');
      console.log('📋 Sample KBOM records:');
      samples.rows.forEach(row => {
        console.log(`  - ${row.title} | Customer: ${row.customer} | SO: ${row.so} | WO: ${row.wo_number}`);
      });
      
    } else {
      console.log('❌ KBOM table not found after migration');
    }
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runKbomMigration();
