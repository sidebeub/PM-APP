const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Database host and port (stored in code)
const DB_HOST = 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com';
const DB_PORT = 5432;
// For ADVAPI, always use BOMs database unless user provides different credentials
const DB_NAME = 'BOMs'; // Use the BOMs database (ignore project management DB_NAME env var)

// Create a connection pool
let pool = null;

const initializePool = (credentials = null) => {
  if (!pool) {
    // If credentials are provided directly
    if (credentials && credentials.user && credentials.password) {
      pool = new Pool({
        user: credentials.user,
        password: credentials.password,
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false, require: true } : false
      });
    }
    // If credentials are provided via environment variables
    else if (process.env.DB_USER && process.env.DB_PASSWORD) {
      pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false, require: true } : false
      });
    }
    // No credentials provided
    else {
      console.error('Database credentials not provided. Use either DB_USER/DB_PASSWORD environment variables or initialize with credentials.');
      return null;
    }
    
    // Test the connection
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Database connection error:', err.message);
        pool = null; // Reset pool on error
      } else {
        console.log('Database connected successfully at:', res.rows[0].now);
      }
    });
  }
  
  return pool;
};

// Get the pool, initializing if needed
const getPool = () => {
  if (!pool) {
    console.warn('Database pool not initialized');
  }
  return pool;
};

// Check if database is connected
const isConnected = async () => {
  // Enhanced check to prevent false positives
  if (!pool) {
    console.log('Database connection check: pool is null or undefined');
    return false;
  }
  
  // Added extra logging for troubleshooting
  console.log('Database connection check - pool exists:', !!pool);
  
  try {
    // More reliable way to check: try an actual query
    console.log('Testing database connection with query...');
    const result = await pool.query('SELECT 1 as connected');
    
    if (result && result.rows && result.rows.length > 0) {
      console.log('Database connection is active and working');
      return true;
    } else {
      console.log('Database query successful but returned unexpected result');
      return false;
    }
  } catch (error) {
    console.error('Error checking database connection:', error.message);
    return false;
  }
};

// Model operations
module.exports = {
  // Initialize database connection
  init: initializePool,
  
  // Set the global pool (for use when initialized outside)
  setPool: (newPool) => { 
    pool = newPool;
    return pool;
  },
  
  // Get the current pool (needed by other services)
  getPool,
  
  // Check if database is connected
  isConnected,
  
  // Get all models
  getAllModels: async () => {
    const pool = getPool();
    if (!pool) return [];
    
    const result = await pool.query('SELECT * FROM models ORDER BY uploaded_at DESC');
    return result.rows;
  },
  
  // Get model by ID
  getModelById: async (id) => {
    const pool = getPool();
    if (!pool) return null;
    
    const result = await pool.query('SELECT * FROM models WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  // Get model by URN
  getModelByUrn: async (urn) => {
    const pool = getPool();
    if (!pool) return null;
    
    const result = await pool.query('SELECT * FROM models WHERE urn = $1', [urn]);
    return result.rows[0];
  },
  
  // Create new model
  createModel: async (model) => {
    const pool = getPool();
    if (!pool) {
      console.warn('Database not connected, cannot create model');
      return null;
    }
    
    try {
      // Check if model with this ID already exists
      const existingModel = await module.exports.getModelById(model.id);
      
      if (existingModel) {
        // Update existing model instead
        return await module.exports.updateModel(model.id, model);
      }
      
      // Convert JavaScript object keys to database snake_case
      // Add support for tags and category fields from the table schema
      const result = await pool.query(
        `INSERT INTO models 
         (id, object_id, file_name, display_name, description, bucket_key, object_key, urn, status, uploaded_at, tags, category) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         RETURNING *`,
        [
          model.id,
          model.objectId,
          model.fileName,
          model.displayName || null,
          model.description || null,
          model.bucketKey,
          model.objectKey,
          model.urn,
          model.status || 'uploaded',
          model.uploadedAt ? new Date(model.uploadedAt) : new Date(),
          model.tags ? JSON.stringify(model.tags) : null,  // Convert tags to JSON string
          model.category || null
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating model in database:', error);
      return null;
    }
  },
  
  // Update existing model
  updateModel: async (id, data) => {
    const pool = getPool();
    if (!pool) {
      console.warn('Database not connected, cannot update model');
      return null;
    }
    
    try {
      // Create a SQL SET clause and values array dynamically based on provided data
      const setItems = [];
      const values = [];
      let paramCounter = 1;
      
      // Map JavaScript camelCase to database snake_case
      if (data.objectId !== undefined) {
        setItems.push(`object_id = $${paramCounter++}`);
        values.push(data.objectId);
      }
      
      if (data.fileName !== undefined) {
        setItems.push(`file_name = $${paramCounter++}`);
        values.push(data.fileName);
      }
      
      if (data.displayName !== undefined) {
        setItems.push(`display_name = $${paramCounter++}`);
        values.push(data.displayName);
      }
      
      if (data.description !== undefined) {
        setItems.push(`description = $${paramCounter++}`);
        values.push(data.description);
      }
      
      if (data.bucketKey !== undefined) {
        setItems.push(`bucket_key = $${paramCounter++}`);
        values.push(data.bucketKey);
      }
      
      if (data.objectKey !== undefined) {
        setItems.push(`object_key = $${paramCounter++}`);
        values.push(data.objectKey);
      }
      
      if (data.urn !== undefined) {
        setItems.push(`urn = $${paramCounter++}`);
        values.push(data.urn);
      }
      
      if (data.status !== undefined) {
        setItems.push(`status = $${paramCounter++}`);
        values.push(data.status);
      }
      
      if (data.uploadedAt !== undefined) {
        setItems.push(`uploaded_at = $${paramCounter++}`);
        values.push(new Date(data.uploadedAt));
      }
      
      // Add support for tags
      if (data.tags !== undefined) {
        setItems.push(`tags = $${paramCounter++}`);
        values.push(typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags));
      }
      
      // Add support for category
      if (data.category !== undefined) {
        setItems.push(`category = $${paramCounter++}`);
        values.push(data.category);
      }
      
      // Return early if no fields to update
      if (setItems.length === 0) {
        return await module.exports.getModelById(id);
      }
      
      // Add ID as the last parameter
      values.push(id);
      
      // Construct and execute update query
      const query = `UPDATE models SET ${setItems.join(', ')} WHERE id = $${paramCounter} RETURNING *`;
      const result = await pool.query(query, values);
      
      // If no rows were updated, the model wasn't found
      if (result.rowCount === 0) {
        console.warn(`Model with ID ${id} not found during update`);
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating model in database:', error);
      return null;
    }
  },
  
  // Update model metadata (display_name, description, etc.)
  updateModelMetadata: async (id, metadata) => {
    const pool = getPool();
    if (!pool) {
      console.warn('Database not connected, cannot update model metadata');
      return null;
    }
    
    try {
      // Create fields array for SQL query
      const fields = [];
      const values = [];
      let counter = 1;
      
      // Add fields that are being updated
      if (metadata.displayName !== undefined) {
        fields.push(`display_name = $${counter++}`);
        values.push(metadata.displayName);
      }
      
      if (metadata.description !== undefined) {
        fields.push(`description = $${counter++}`);
        values.push(metadata.description);
      }
      
      if (metadata.tags !== undefined) {
        fields.push(`tags = $${counter++}`);
        values.push(JSON.stringify(metadata.tags));
      }
      
      if (metadata.category !== undefined) {
        fields.push(`category = $${counter++}`);
        values.push(metadata.category);
      }
      
      // Return early if no fields to update
      if (fields.length === 0) {
        return await module.exports.getModelById(id);
      }
      
      // Add ID as the last parameter
      values.push(id);
      
      // Run the update query
      const result = await pool.query(
        `UPDATE models SET ${fields.join(', ')} WHERE id = $${counter} RETURNING *`,
        values
      );
      
      // If no rows were updated, the model wasn't found
      if (result.rowCount === 0) {
        console.warn(`Model with ID ${id} not found during metadata update`);
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating model metadata in database:', error);
      return null;
    }
  },
  
  // Update model status
  updateModelStatus: async (id, status, error = null) => {
    const pool = getPool();
    if (!pool) {
      console.warn('Database not connected, cannot update model status');
      return null;
    }
    
    try {
      // First check if the error column exists
      let errorColumnExists = false;
      try {
        const checkResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'models' AND column_name = 'error'
        `);
        errorColumnExists = checkResult.rows.length > 0;
      } catch (checkError) {
        console.warn('Could not check if error column exists:', checkError.message);
      }
      
      // Use appropriate query based on column existence
      let result;
      if (errorColumnExists) {
        // If error column exists, use it
        result = await pool.query(
          'UPDATE models SET status = $1, error = $2 WHERE id = $3 RETURNING *',
          [status, error, id]
        );
      } else {
        // If error column doesn't exist, add a comment about creating it
        console.warn('Error column does not exist in models table. Consider adding it with: ALTER TABLE models ADD COLUMN error TEXT;');
        // Only update status
        result = await pool.query(
          'UPDATE models SET status = $1 WHERE id = $2 RETURNING *',
          [status, id]
        );
      }
      
      // If no rows were updated, the model wasn't found
      if (result.rowCount === 0) {
        console.warn(`Model with ID ${id} not found during status update`);
        return null;
      }
      
      return result.rows[0];
    } catch (updateError) {
      console.error('Error updating model status in database:', updateError);
      return null;
    }
  },
  
  // Search models by term
  searchModels: async (searchTerm) => {
    const pool = getPool();
    if (!pool) {
      console.warn('Database not connected, cannot search models');
      return [];
    }
    
    try {
      const result = await pool.query(
        `SELECT * FROM models 
         WHERE file_name ILIKE $1 
         OR display_name ILIKE $1 
         OR description ILIKE $1
         ORDER BY uploaded_at DESC`,
        [`%${searchTerm}%`]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error searching models in database:', error);
      return [];
    }
  },
  
  // Delete model
  deleteModel: async (id) => {
    const pool = getPool();
    if (!pool) {
      console.warn('Database not connected, cannot delete model');
      return null;
    }
    
    try {
      // Get the model before deleting (for return value)
      const model = await module.exports.getModelById(id);
      
      if (!model) {
        console.warn(`Model with ID ${id} not found for deletion`);
        return null;
      }
      
      // Delete the model
      await pool.query('DELETE FROM models WHERE id = $1', [id]);
      
      return model;
    } catch (error) {
      console.error('Error deleting model from database:', error);
      return null;
    }
  },
  
  // Store models fetched from APS
  storeModelsFromAPS: async (models) => {
    const pool = getPool();
    if (!pool) {
      console.warn('Database not connected, cannot store models');
      return false;
    }
    
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      for (const model of models) {
        try {
          // Check if model already exists
          const existingModel = await module.exports.getModelById(model.id);
          
          if (existingModel) {
            // Update only if something has changed
            if (existingModel.status !== model.status || 
                existingModel.file_name !== model.fileName ||
                existingModel.object_key !== model.objectKey) {
              
              await module.exports.updateModel(model.id, {
                fileName: model.fileName,
                objectKey: model.objectKey,
                status: model.status
              });
            }
          } else {
            // Insert new model
            await module.exports.createModel(model);
          }
        } catch (modelError) {
          console.error(`Error storing model ${model.id} in database:`, modelError);
          // Continue with the next model instead of failing the whole batch
        }
      }
      
      // Commit the transaction
      await pool.query('COMMIT');
      
      return true;
    } catch (error) {
      // Rollback on error
      if (pool) {
        await pool.query('ROLLBACK');
      }
      console.error('Error storing models in database:', error);
      return false;
    }
  }
};