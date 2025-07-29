const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Get migration file name from command line arguments
const migrationFileName = process.argv[2];

if (!migrationFileName) {
  console.error('Error: Migration file name is required.');
  console.log('Usage: node run_specific_migration.js <migration_file_name>');
  console.log('Example: node run_specific_migration.js update_user_passwords.sql');
  process.exit(1);
}

// Get database connection details from environment variables or use defaults
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
});

console.log('Using database connection:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

async function runMigration() {
  const client = await pool.connect();
  try {
    // Read the migration SQL file
    const migrationFile = path.join(__dirname, 'migrations', migrationFileName);
    
    // Check if the file exists
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log(`Running migration: ${migrationFileName}...`);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(sql);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Migration script error:', err);
  process.exit(1);
});
