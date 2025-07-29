const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Create a pool using environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

// Read the schema SQL file
const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Read the logo migration SQL file
const logoMigrationSQL = fs.readFileSync(path.join(__dirname, 'migrations/alter_customer_logo.sql'), 'utf8');

async function setupDatabase() {
  try {
    console.log('Starting database setup...');
    
    // Execute the schema SQL
    await pool.query(schemaSQL);
    console.log('Schema created successfully');
    
    // Execute the logo migration
    await pool.query(logoMigrationSQL);
    console.log('Logo column migration completed');
    
    console.log('Database setup completed successfully!');
  } catch (err) {
    console.error('Error during database setup:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
