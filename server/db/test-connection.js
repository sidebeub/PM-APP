require('dotenv').config();
const { Pool } = require('pg');

// Log environment variables (without sensitive data)
console.log('Environment variables loaded:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);

// Create a new pool using the RDS host
const pool = new Pool({
  user: 'Zach',
  host: 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com',
  database: 'project_management',
  password: 'Rayne22!',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
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