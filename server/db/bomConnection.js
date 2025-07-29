const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

// Create a new pool for the BOMs database using environment variables or fallback
const bomPool = new Pool({
  user: process.env.BOM_DB_USER || process.env.DB_USER || 'Zach',
  host: process.env.BOM_DB_HOST || process.env.DB_HOST || 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com',
  database: process.env.BOM_DB_NAME || 'BOMs',
  password: process.env.BOM_DB_PASSWORD || process.env.DB_PASSWORD || 'Rayne22!',
  port: process.env.BOM_DB_PORT || process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection and list available databases
bomPool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the BOM\'s database:', err);

    // Try to connect to the default postgres database to list all databases
    const { Pool } = require('pg');
    const defaultPool = new Pool({
      user: 'Zach',
      host: 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com',
      database: 'postgres',
      password: 'Rayne22!',
      port: 5432,
      ssl: {
        rejectUnauthorized: false
      }
    });

    defaultPool.connect((err2, client2, release2) => {
      if (err2) {
        console.error('Error connecting to postgres database:', err2);
      } else {
        console.log('Connected to postgres database, listing all databases:');
        client2.query('SELECT datname FROM pg_database WHERE datistemplate = false;', (err3, result) => {
          if (err3) {
            console.error('Error listing databases:', err3);
          } else {
            console.log('Available databases:');
            result.rows.forEach(row => {
              console.log('  -', row.datname);
            });
          }
          release2();
        });
      }
    });
  } else {
    console.log('Successfully connected to BOM\'s database');
    release();
  }
});

module.exports = bomPool; 