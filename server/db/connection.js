const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

// Create a new pool using environment variables or fallback to hardcoded values
const pool = new Pool({
  user: process.env.DB_USER || 'Zach',
  host: process.env.DB_HOST || 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'project_management',
  password: process.env.DB_PASSWORD || 'Rayne22!',
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to database');
    release();
  }
});

module.exports = pool;
