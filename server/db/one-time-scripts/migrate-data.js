const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Local database connection
const localPool = new Pool({
  user: 'Zach',
  host: 'localhost',
  database: 'project_management',
  password: 'Rayne22!',
  port: 5432
});

// RDS database connection
const rdsPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    // Tables to migrate in order of dependencies
    const tables = [
      'users',
      'customers',
      'projects',
      'tasks',
      'task_dependencies',
      'department_milestones'
    ];

    for (const table of tables) {
      console.log(`Migrating ${table}...`);
      
      // Get data from local database
      const { rows } = await localPool.query(`SELECT * FROM ${table}`);
      console.log(`Found ${rows.length} records in ${table}`);
      
      if (rows.length > 0) {
        // Clear existing data in RDS
        await rdsPool.query(`TRUNCATE TABLE ${table} CASCADE`);
        
        // Insert data into RDS
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          await rdsPool.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
        
        console.log(`Successfully migrated ${rows.length} records to ${table}`);
      }
    }
    
    console.log('Data migration completed successfully!');
    
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  } finally {
    // Close both connections
    await localPool.end();
    await rdsPool.end();
  }
}

// Run the migration
migrateData(); 