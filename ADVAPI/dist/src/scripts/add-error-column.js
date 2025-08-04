/**
 * Script to add the error column to the models table
 * Run with: node src/scripts/add-error-column.js
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Fixed values
const DB_HOST = 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com';
const DB_PORT = 5432;
const DB_NAME = process.env.DB_NAME || 'BOMs';

// Main function
async function addErrorColumn() {
  // Database credentials - use environment variables or ask for them
  const user = process.env.DB_USER || process.argv[2];
  const password = process.env.DB_PASSWORD || process.argv[3];
  
  if (!user || !password) {
    console.error('Error: Database credentials required');
    console.log('Usage: node add-error-column.js <username> <password>');
    console.log('  OR set DB_USER and DB_PASSWORD environment variables');
    process.exit(1);
  }
  
  // Pool configuration
  const poolConfig = {
    user: user,
    password: password,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    query_timeout: 10000
  };
  
  console.log('Connecting to database...');
  console.log(`- Host: ${DB_HOST}`);
  console.log(`- Database: ${DB_NAME}`);
  console.log(`- User: ${user}`);
  
  let dbPool = null;
  
  try {
    // Create pool
    dbPool = new Pool(poolConfig);
    
    // Test connection
    console.log('Testing database connection...');
    const testResult = await dbPool.query('SELECT NOW()');
    console.log(`Connected successfully at: ${testResult.rows[0].now}`);
    
    // Check if models table exists
    console.log('Checking if models table exists...');
    const tableResult = await dbPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'models'
      );
    `);
    
    const tableExists = tableResult.rows[0].exists;
    console.log('Models table exists:', tableExists);
    
    if (!tableExists) {
      console.error('Error: Models table does not exist');
      console.log('Please run the application first to create the table');
      process.exit(1);
    }
    
    // Check if error column exists
    console.log('Checking if error column exists...');
    const columnResult = await dbPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'models' 
      AND column_name = 'error';
    `);
    
    const columnExists = columnResult.rows.length > 0;
    console.log('Error column exists:', columnExists);
    
    if (columnExists) {
      console.log('Error column already exists. No action needed.');
    } else {
      console.log('Adding error column to models table...');
      await dbPool.query(`ALTER TABLE models ADD COLUMN error TEXT;`);
      console.log('Successfully added error column to models table');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Failed to add error column to models table');
  } finally {
    if (dbPool) {
      console.log('Closing database connection...');
      await dbPool.end();
    }
    console.log('Done');
  }
}

// Run the script
addErrorColumn().catch(console.error);