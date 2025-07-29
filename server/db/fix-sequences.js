const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'Zach',
  host: process.env.DB_HOST || 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'project_management',
  password: process.env.DB_PASSWORD || 'Rayne22!',
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixSequences() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing database sequences...');
    
    // Fix users sequence
    console.log('Fixing users_id_seq...');
    await client.query("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));");
    
    // Fix projects sequence
    console.log('Fixing projects_id_seq...');
    await client.query("SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM projects));");
    
    // Fix tasks sequence
    console.log('Fixing tasks_id_seq...');
    await client.query("SELECT setval('tasks_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tasks));");
    
    // Fix customers sequence
    console.log('Fixing customers_id_seq...');
    await client.query("SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));");
    
    // Verify the sequences
    console.log('\n✅ Verifying sequences:');
    const result = await client.query(`
      SELECT 'users_id_seq' as sequence_name, last_value FROM users_id_seq
      UNION ALL
      SELECT 'projects_id_seq' as sequence_name, last_value FROM projects_id_seq
      UNION ALL
      SELECT 'tasks_id_seq' as sequence_name, last_value FROM tasks_id_seq
      UNION ALL
      SELECT 'customers_id_seq' as sequence_name, last_value FROM customers_id_seq
      ORDER BY sequence_name;
    `);
    
    result.rows.forEach(row => {
      console.log(`${row.sequence_name}: ${row.last_value}`);
    });
    
    console.log('\n🎉 All sequences fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing sequences:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSequences();
