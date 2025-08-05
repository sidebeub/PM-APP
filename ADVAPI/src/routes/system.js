/**
 * System routes for server management
 */
const express = require('express');
const router = express.Router();

// Create a token for local shutdown (not secure, but simple for local use)
const SHUTDOWN_TOKEN = 'local-shutdown-token';

// Import the database initialization function
let initializeDatabase; // Will be set after import
const dbService = require('../services/dbService');

/**
 * GET /api/system/status
 * Returns the server status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    port: process.env.PORT || 3002
  });
});

/**
 * POST /api/system/stop
 * Stops the server
 */
router.post('/stop', (req, res) => {
  const { token } = req.body;
  
  // Basic validation to prevent unauthorized shutdown
  if (token !== SHUTDOWN_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  console.log('Server shutdown requested via API');
  
  // Send success response before shutting down
  res.json({ success: true, message: 'Server shutting down' });
  
  // Give time for the response to be sent before shutting down
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

/**
 * POST /api/system/test-db-connection
 * Test database connection with provided credentials
 */
router.post('/test-db-connection', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    console.log('Testing database connection with provided credentials...');

    // Try to initialize the database with the provided credentials
    try {
      // Import the initialization function dynamically to avoid circular imports
      const { initializeDatabase } = require('../server');

      const credentials = {
        user: username,
        password: password
      };

      await initializeDatabase(credentials);

      console.log('Database connection test successful');
      console.log('KBOM Debug: Database credentials stored and initialized');

      res.json({
        success: true,
        message: 'Database connection successful. KBOM data is now available.'
      });

    } catch (dbError) {
      console.error('Database connection test failed:', dbError.message);

      res.status(400).json({
        success: false,
        message: `Database connection failed: ${dbError.message}`
      });
    }

  } catch (error) {
    console.error('Error testing database connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while testing database connection'
    });
  }
});

/**
 * POST /api/system/db/connect
 * Connect to the database with provided credentials
 */
router.post('/db/connect', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Database login attempt:');
    console.log('- Username:', username);
    console.log('- Password length:', password ? password.length : 0);
    console.log('- Database host:', 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com');
    
    if (!username || !password) {
      console.log('Login failed: Missing username or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Get the setDatabaseCredentials and initializeDatabase functions from server.js
    if (!initializeDatabase) {
      // This is a bit of a hack to avoid circular dependencies
      const serverModule = require('../server');
      initializeDatabase = serverModule.initializeDatabase;
      setDatabaseCredentials = serverModule.setDatabaseCredentials;
      
      console.log('Loaded initializeDatabase and setDatabaseCredentials from server module');
    }
    
    // Set credentials
    console.log('Setting database credentials...');
    const credentials = setDatabaseCredentials({
      user: username,
      password: password
    });
    
    // Initialize database
    console.log('Initializing database connection...');
    try {
      const success = await initializeDatabase(credentials);
      console.log('Database initialization result:', success ? 'SUCCESS' : 'FAILED');
      
      if (success) {
        console.log('Database connection successful - responding with success');
        res.json({
          success: true,
          message: 'Database connected successfully'
        });
      } else {
        // This branch shouldn't be reached anymore since we're throwing errors instead of returning false
        console.log('Database connection failed - responding with error');
        res.status(500).json({
          success: false,
          message: 'Failed to connect to database. Check your credentials and database setup.'
        });
      }
    } catch (dbError) {
      // Enhanced error handling with more specific messages from the updated initializeDatabase function
      console.error('Database connection error:', dbError);
      
      // Get the user-friendly message we added in the server.js update
      const userMessage = dbError.userMessage || 'Failed to connect to database. Check your credentials.';
      
      // Add specific guidance based on error code
      let helpText = '';
      
      if (dbError.code === '28P01') {
        // Authentication failed
        helpText = 'Verify that the PostgreSQL user exists and has the correct password. PostgreSQL usernames and passwords are case-sensitive.';
      } else if (dbError.code === '28000') {
        // Server configuration issue
        helpText = 'The PostgreSQL server is not configured to accept connections from this application. Check the security settings in your RDS instance or pg_hba.conf file.';
      } else if (dbError.code === '3D000') {
        // Database not found
        helpText = 'The database "BOMs" does not exist in PostgreSQL. Please create it first using pgAdmin.';
      } else if (dbError.code === '42P01') {
        // Missing table
        helpText = 'The database exists but the "models" table is missing. Please run the database initialization script.';
      } else if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
        // Network issues
        helpText = 'Could not reach the database server. Check your network connection and ensure the server is running.';
      }
      
      // Respond with detailed error information
      res.status(500).json({
        success: false,
        message: userMessage,
        helpText: helpText,
        errorCode: dbError.code || 'unknown'
      });
    }
  } catch (error) {
    console.error('Unexpected error connecting to database:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to connect to database',
      errorCode: 'unexpected'
    });
  }
});

/**
 * GET /api/system/db/status
 * Check if the database is connected
 */
router.get('/db/status', async (req, res) => {
  try {
    // Add debug information to help diagnose issues
    console.log('DB Status check:');
    console.log('- global.dbPool exists:', global.dbPool !== undefined);
    console.log('- global.dbPool is not null:', global.dbPool !== null);
    
    // Import the dbService for a more thorough check
    let dbService;
    try {
      dbService = require('../services/dbService');
    } catch (importError) {
      console.error('Error importing dbService:', importError.message);
    }
    
    let isConnected = false;
    
    // First do a basic check
    const basicCheck = global.dbPool !== null && global.dbPool !== undefined;
    
    if (basicCheck && dbService) {
      // Then do a more thorough check with an actual query if possible
      try {
        isConnected = await dbService.isConnected();
        console.log('- Advanced connection check result:', isConnected);
      } catch (checkError) {
        console.error('Error during advanced connection check:', checkError.message);
        // Fall back to basic check
        isConnected = basicCheck;
      }
    } else {
      // Fall back to basic check
      isConnected = basicCheck;
    }
    
    console.log('- Reporting as connected:', isConnected);
    
    res.json({
      connected: isConnected,
      needsCredentials: !isConnected,
      checkTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    res.status(500).json({
      connected: false,
      error: 'Failed to check database status',
      checkTime: new Date().toISOString()
    });
  }
});

module.exports = router;