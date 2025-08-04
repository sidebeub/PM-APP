const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const { Pool } = require('pg');
const readline = require('readline');
const os = require('os');

// Load environment variables
dotenv.config();

// Fixed values
const DB_HOST = 'backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com';
const DB_PORT = 5432;
const DB_NAME = process.env.DB_NAME || 'BOMs';

// APS credentials
process.env.APS_CLIENT_ID = process.env.APS_CLIENT_ID || '2f0mdkopjvlgru10nk1asdhf6uzvjswd4tpwxdqx8s7ywurd';
process.env.APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET || 'QYhMOyF9Eq4nMuqO';

// Store database credentials
let dbCredentials = null;

// Function to set database credentials
const setDatabaseCredentials = (credentials) => {
  if (!credentials || !credentials.user || !credentials.password) {
    throw new Error('Invalid database credentials');
  }
  
  dbCredentials = {
    user: credentials.user,
    password: credentials.password
  };
  
  return dbCredentials;
};

// Import routes
const authRoutes = require('./routes/auth');
const modelRoutes = require('./routes/models');
const systemRoutes = require('./routes/system');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3010; // Use a different port to avoid conflicts
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Flag to track if user should be redirected to login
let needsDatabaseLogin = true;

// Initialize database connection with prompt
let dbPool = null;

// Explicitly set global.dbPool to null at startup
global.dbPool = null;

// Configure storage for uploaded files
// In packaged mode, use memory storage instead of disk storage
const isPackaged = process.pkg !== undefined;
const storage = isPackaged 
  ? multer.memoryStorage() 
  : multer.diskStorage({
      destination: function (req, file, cb) {
        // Ensure the uploads directory exists
        const uploadDir = path.join(__dirname, '../uploads');
        try {
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        } catch (error) {
          console.error('Error creating uploads directory:', error);
          // Fallback to OS temp directory if uploads cannot be created
          cb(null, os.tmpdir());
        }
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
      }
    });

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit per file
    fieldSize: 100 * 1024 * 1024 // 100MB field size limit
  }
});

// Middleware
// Configure CORS with more options
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight for 1 day
}));

// Body parsers - make sure these are before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debugging middleware for requests
app.use((req, res, next) => {
  if (req.method === 'PATCH') {
    console.log('PATCH Request received:');
    console.log('- URL:', req.url);
    console.log('- Content-Type:', req.headers['content-type']);
    console.log('- Body:', typeof req.body === 'object' ? 'Object with keys: ' + Object.keys(req.body).join(', ') : typeof req.body);
  }
  next();
});
// Set up static file serving with error handling
const staticPath = path.join(__dirname, '../public');
console.log('Static files path:', staticPath);
console.log('Static directory exists:', fs.existsSync(staticPath));
app.use(express.static(staticPath, {
  setHeaders: (res, path, stat) => {
    console.log('Serving static file:', path);
  }
}));

// Placeholder endpoints for documentation files
app.get('/schema.sql', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('-- Schema file is not available in this packaged version');
});

app.get('/test-db-auth.js', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('// Database authentication test script is not available in this packaged version');
});

app.get('/rds-security-guide', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>RDS Security Configuration Guide</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2 {
          color: #0077c2;
        }
        a {
          color: #0077c2;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1>RDS Security Configuration Guide</h1>
      <p>The full guide is not available in this packaged version.</p>
      <p><a href="/db-login.html">&larr; Back to Login</a></p>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.get('/pgadmin-guide', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PostgreSQL Setup Guide for ADVAPI</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2 {
          color: #0077c2;
        }
        a {
          color: #0077c2;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1>PostgreSQL Setup Guide for ADVAPI</h1>
      <p>The full guide is not available in this packaged version.</p>
      <p><a href="/db-login.html">&larr; Back to Login</a></p>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Handle uploads directory for packaged app
const uploadsDir = path.join(__dirname, '../uploads');
if (!isPackaged) {
  // Only create physical directory in non-packaged mode
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    console.log('Uploads directory available at:', uploadsDir);
  } catch (error) {
    console.warn('Could not create uploads directory, using system temp directory instead');
    console.warn('Error was:', error.message);
  }
} else {
  console.log('Running in packaged mode, using memory storage for uploads');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/system', systemRoutes);

// Middleware to check database connection before serving pages
app.use((req, res, next) => {
  // Database connection is REQUIRED - do not bypass
  const bypassDbLogin = false; // Set to false to require database connection
  
  // Skip this check for the login page itself and static assets
  if (req.path === '/db-login.html' || req.path.startsWith('/css/') || 
      req.path.startsWith('/js/') || req.path.startsWith('/images/')) {
    return next();
  }
  
  // For API routes, allow specific endpoints that don't need DB connection
  if (req.path.startsWith('/api/')) {
    // Check if this is a status check API
    if (req.path === '/api/system/status' || req.path === '/api/system/db/status' || 
        req.path === '/api/system/db/connect' || req.path === '/api/auth/token') {
      return next();
    }
    
    // For all other API endpoints, require database connection
    if (!global.dbPool && !bypassDbLogin) {
      console.log(`Database connection required for API endpoint: ${req.path}`);
      return res.status(503).json({
        error: 'Database connection required',
        message: 'This endpoint requires a database connection'
      });
    }
  }
  
  // Redirect to login page if database not connected for main app pages
  if ((needsDatabaseLogin && !global.dbPool) && !bypassDbLogin) {
    console.log('Database not connected, redirecting to login page');
    return res.redirect('/db-login.html');
  }
  
  next();
});

// Serve appropriate page based on database connection status
app.get('/', (req, res) => {
  console.log('Serving index.html');
  const indexPath = path.join(__dirname, '../public/index.html');
  console.log('Path:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));
  res.sendFile(indexPath);
});

// Control panel functionality has been removed

// Add test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'API is working', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  console.error(err.stack);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// Check if port is in use
const net = require('net');
const checkPortInUse = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use.`);
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
};

// Initialize database connection with credentials
const initializeDatabase = async (credentials) => {
  console.log('Initializing database connection with detailed logging...');
  console.log('- User:', credentials.user);
  console.log('- Database Host:', DB_HOST);
  console.log('- Database Port:', DB_PORT);
  console.log('- Database Name:', DB_NAME);
  console.log('- Environment:', NODE_ENV);
  
  try {
    // Handle common pg library authentication issues with password formatting
    let processedPassword = credentials.password;
    
    // Some special characters in passwords can cause authentication failures
    // This is a known issue with the pg library and certain PostgreSQL configurations
    // If the password contains certain special characters, we might need to URL encode it
    if (processedPassword && 
        (processedPassword.includes('@') || 
         processedPassword.includes(':') || 
         processedPassword.includes('/') ||
         processedPassword.includes('%'))) {
      console.log('Password contains special characters that might cause authentication issues');
      console.log('Trying with original password first...');
    }
    
    // Create configuration object for better clarity
    const poolConfig = {
      user: credentials.user,
      password: processedPassword, // Use the processed password
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000, // 5 second timeout
      query_timeout: 10000 // 10 second query timeout
    };
    
    console.log('Pool configuration:');
    console.log('- User:', poolConfig.user);
    console.log('- Host:', poolConfig.host);
    console.log('- Port:', poolConfig.port);
    console.log('- Database:', poolConfig.database);
    console.log('- SSL enabled:', !!poolConfig.ssl);
    
    // First try without SSL to see if that's the issue
    if (poolConfig.ssl) {
      console.log('Attempting connection with SSL first...');
    } else {
      // Try with no SSL
      console.log('Attempting connection without SSL...');
    }
    
    // Create the pool with the current configuration
    dbPool = new Pool(poolConfig);
    
    console.log('Pool created, testing connection...');
    
    // Test the connection
    try {
      console.log('Executing test query...');
      const result = await dbPool.query('SELECT NOW()');
      console.log('Database connected successfully at:', result.rows[0].now);
      
      // Make pool available globally and to the dbService
      console.log('Setting global.dbPool and updating dbService...');
      global.dbPool = dbPool;
      
      // Import dbService and set the pool
      const dbService = require('./services/dbService');
      dbService.setPool(dbPool);
      
      // Check if the models table exists
      try {
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
          console.log('Models table does not exist. Creating it now...');
          
          // Create the models table using the schema in our schema.sql file
          try {
            console.log('Creating models table...');
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS models (
                id VARCHAR(255) PRIMARY KEY,
                object_id VARCHAR(255),
                file_name VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                description TEXT,
                bucket_key VARCHAR(255) NOT NULL,
                object_key VARCHAR(255) NOT NULL,
                urn VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'uploaded',
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                tags JSONB,
                category VARCHAR(255),
                error TEXT
              );
              
              -- Create indexes for faster searches
              CREATE INDEX IF NOT EXISTS idx_models_file_name ON models(file_name);
              CREATE INDEX IF NOT EXISTS idx_models_urn ON models(urn);
              CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
            `);
            
            console.log('Successfully created models table');
          } catch (createError) {
            console.error('Error creating models table:', createError.message);
            console.error('You may need to run the schema.sql script manually');
          }
        }
      } catch (tableCheckError) {
        console.error('Error checking models table:', tableCheckError.message);
      }
      
      // Update login flag to not redirect to login page anymore
      needsDatabaseLogin = false;
      
      console.log('Database connection established successfully');
      return true;
    } catch (queryError) {
      console.error('Database query failed:');
      console.error('- Error message:', queryError.message);
      console.error('- Error code:', queryError.code);
      console.error('- Error detail:', queryError.detail);
      
      let errorMessage = 'Unknown database error';
      
      // Provide more detailed error messages by error code
      if (queryError.code === '28P01') {
        console.error('Authentication failed - invalid username/password');
        console.error('IMPORTANT: Make sure the PostgreSQL role has been created with CREATE ROLE command');
        console.error('  - Check that the user has permission to access the database');
        console.error('  - Verify the user was created in pgAdmin with correct case (PostgreSQL is case-sensitive)');
        errorMessage = 'Authentication failed - invalid username/password. Verify credentials in pgAdmin.';
      } else if (queryError.code === '28000') {
        console.error('PostgreSQL server configuration error - no pg_hba.conf entry for this connection');
        console.error('IMPORTANT: The PostgreSQL server security configuration needs to be updated');
        console.error('  - The server needs to allow connections from your application server IP');
        console.error('  - For Amazon RDS, check the security group inbound rules');
        console.error('  - Make sure the user has permission to connect to the database with password authentication');
        errorMessage = 'PostgreSQL security configuration error. The database server is not configured to accept connections from this application server.';
      } else if (queryError.code === '3D000') {
        console.error('Database does not exist - the "BOMs" database was not found');
        console.error('IMPORTANT: Make sure to create the database with CREATE DATABASE command in pgAdmin');
        errorMessage = 'The database "BOMs" does not exist. Create it in pgAdmin first.';
      } else if (queryError.code === 'ECONNREFUSED') {
        console.error('Connection refused - database server may be down or unreachable');
        console.error('  - Check that the PostgreSQL server is running');
        console.error('  - Verify network connectivity to the database server');
        console.error('  - Check that the server is configured to accept connections on port 5432');
        errorMessage = 'Connection refused - database server may be down or unreachable';
      } else if (queryError.code === 'ETIMEDOUT') {
        console.error('Connection timed out - check network or firewall settings');
        console.error('  - Make sure there are no firewalls blocking the connection');
        console.error('  - Verify the RDS security group allows connections from this IP');
        errorMessage = 'Connection timed out - check network connectivity and firewall settings';
      } else if (queryError.code === '42P01') {
        console.error('Relation does not exist - the models table is missing');
        console.error('IMPORTANT: The database exists but the "models" table does not');
        console.error('  - Run the database initialization script to create the table');
        errorMessage = 'The "models" table does not exist in the database. Initialize the database schema first.';
      }
      
      // Try with SSL settings toggled if initial attempt failed
      if (!poolConfig.ssl && dbPool) {
        try {
          console.log('First attempt without SSL failed, closing pool...');
          await dbPool.end();
          
          console.log('Attempting connection with SSL enabled as fallback...');
          // Create new pool with SSL enabled
          poolConfig.ssl = { rejectUnauthorized: false };
          dbPool = new Pool(poolConfig);
          
          // Test connection again
          console.log('Executing test query with SSL...');
          const result = await dbPool.query('SELECT NOW()');
          console.log('SUCCESS: Database connected with SSL at:', result.rows[0].now);
          
          // Make pool available globally and to the dbService
          global.dbPool = dbPool;
          const dbService = require('./services/dbService');
          dbService.setPool(dbPool);
          
          // Check if the models table exists
          try {
            console.log('Checking if models table exists with SSL connection...');
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
              console.log('Models table does not exist. Creating it now...');
              
              // Create the models table using the schema in our schema.sql file
              try {
                console.log('Creating models table...');
                await dbPool.query(`
                  CREATE TABLE IF NOT EXISTS models (
                    id VARCHAR(255) PRIMARY KEY,
                    object_id VARCHAR(255),
                    file_name VARCHAR(255) NOT NULL,
                    display_name VARCHAR(255),
                    description TEXT,
                    bucket_key VARCHAR(255) NOT NULL,
                    object_key VARCHAR(255) NOT NULL,
                    urn VARCHAR(255) NOT NULL,
                    status VARCHAR(50) DEFAULT 'uploaded',
                    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    tags JSONB,
                    category VARCHAR(255),
                    error TEXT
                  );
                  
                  -- Create indexes for faster searches
                  CREATE INDEX IF NOT EXISTS idx_models_file_name ON models(file_name);
                  CREATE INDEX IF NOT EXISTS idx_models_urn ON models(urn);
                  CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
                `);
                
                console.log('Successfully created models table with SSL connection');
              } catch (createError) {
                console.error('Error creating models table with SSL:', createError.message);
                console.error('You may need to run the schema.sql script manually');
              }
            }
          } catch (tableCheckError) {
            console.error('Error checking models table with SSL:', tableCheckError.message);
          }
          
          // Update login flag to not redirect to login page anymore
          needsDatabaseLogin = false;
          
          console.log('Database connection established successfully with SSL');
          return true;
        } catch (sslError) {
          console.error('SSL connection attempt also failed:');
          console.error('- Error message:', sslError.message);
          console.error('- Error code:', sslError.code);
          
          // Clean up pool from SSL attempt
          if (dbPool) {
            try {
              await dbPool.end();
            } catch (endError) {
              console.error('Error ending SSL pool:', endError.message);
            }
          }
          
          dbPool = null;
          global.dbPool = null;
          
          // If password contains special characters, try URL encoding
          if (credentials.password && 
             (credentials.password.includes('@') || 
              credentials.password.includes(':') || 
              credentials.password.includes('/') ||
              credentials.password.includes('%'))) {
            
            console.log('Trying with URL-encoded password as a final fallback...');
            try {
              // URL encode the password to handle special characters
              const encodedPassword = encodeURIComponent(credentials.password);
              
              // Create a new pool with the encoded password
              const encodedConfig = { 
                ...poolConfig, 
                password: encodedPassword,
                ssl: { rejectUnauthorized: false }  // Always use SSL with encoded password
              };
              
              dbPool = new Pool(encodedConfig);
              
              // Test connection with encoded password
              console.log('Executing test query with encoded password...');
              const result = await dbPool.query('SELECT NOW()');
              console.log('SUCCESS: Database connected with encoded password at:', result.rows[0].now);
              
              // Make pool available globally and to the dbService
              global.dbPool = dbPool;
              const dbService = require('./services/dbService');
              dbService.setPool(dbPool);
              
              // Check if the models table exists
              try {
                console.log('Checking if models table exists with encoded password connection...');
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
                  console.log('Models table does not exist. Creating it now...');
                  
                  // Create the models table using the schema in our schema.sql file
                  try {
                    console.log('Creating models table...');
                    await dbPool.query(`
                      CREATE TABLE IF NOT EXISTS models (
                        id VARCHAR(255) PRIMARY KEY,
                        object_id VARCHAR(255),
                        file_name VARCHAR(255) NOT NULL,
                        display_name VARCHAR(255),
                        description TEXT,
                        bucket_key VARCHAR(255) NOT NULL,
                        object_key VARCHAR(255) NOT NULL,
                        urn VARCHAR(255) NOT NULL,
                        status VARCHAR(50) DEFAULT 'uploaded',
                        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        tags JSONB,
                        category VARCHAR(255),
                        error TEXT
                      );
                      
                      -- Create indexes for faster searches
                      CREATE INDEX IF NOT EXISTS idx_models_file_name ON models(file_name);
                      CREATE INDEX IF NOT EXISTS idx_models_urn ON models(urn);
                      CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
                    `);
                    
                    console.log('Successfully created models table with encoded password connection');
                  } catch (createError) {
                    console.error('Error creating models table with encoded password:', createError.message);
                    console.error('You may need to run the schema.sql script manually');
                  }
                }
              } catch (tableCheckError) {
                console.error('Error checking models table with encoded password:', tableCheckError.message);
              }
              
              // Update login flag to not redirect to login page anymore
              needsDatabaseLogin = false;
              
              console.log('Database connection established successfully with encoded password');
              return true;
            } catch (encodedError) {
              console.error('Encoded password attempt also failed:');
              console.error('- Error message:', encodedError.message);
              console.error('- Error code:', encodedError.code);
              
              // Clean up pool from encoded password attempt
              if (dbPool) {
                try {
                  await dbPool.end();
                } catch (endError) {
                  console.error('Error ending encoded password pool:', endError.message);
                }
              }
              
              dbPool = null;
              global.dbPool = null;
            }
          }
        }
      } else {
        // Clean up pool from first attempt
        if (dbPool) {
          try {
            await dbPool.end();
          } catch (endError) {
            console.error('Error ending pool:', endError.message);
          }
        }
        
        dbPool = null;
        global.dbPool = null;
      }
      
      console.log('Database connection test failed - cannot proceed with database support');
      queryError.userMessage = errorMessage; // Add user-friendly message for display
      throw queryError; // Rethrow with enhanced error info
    }
  } catch (poolError) {
    console.error('Error creating database pool:');
    console.error('- Error message:', poolError.message);
    console.error('- Error stack:', poolError.stack);
    
    dbPool = null;
    global.dbPool = null;
    
    console.log('Database pool creation failed - cannot proceed with database support');
    return false;
  }
};

// Start server with port check
const startServer = async () => {
  try {
    const isPortInUse = await checkPortInUse(PORT);
    
    if (isPortInUse && process.platform === 'win32') {
      console.log(`Attempting to kill process on port ${PORT}...`);
      // This only works on Windows
      try {
        require('child_process').execSync(`FOR /F "tokens=5" %P IN ('netstat -ano ^| find ":${PORT}" ^| find "LISTENING"') DO taskkill /F /PID %P`);
        console.log('Successfully terminated the existing process.');
      } catch (error) {
        console.error('Failed to terminate the existing process:', error.message);
        console.log('Please close the existing application manually or use a different port.');
        process.exit(1);
      }
    }
    
    // Start the server without waiting for database initialization
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running in ${NODE_ENV} mode`);
      console.log(`Server address: http://${HOST}:${PORT}`);
      console.log(`Using database: ${DB_NAME} at ${DB_HOST}`);
      
      if (NODE_ENV === 'production') {
        console.log(`Make sure your Autodesk APP callback URL is set to http://${HOST}:${PORT}/api/auth/callback`);
      }
      
      // Initialize APS service and get models count
      setTimeout(async () => {
        try {
          // Import the APS service
          const apsService = require('./services/apsService');
          
          // Create the bucket key using the same logic
          const bucketKey = 'aps_viewer_app_' + process.env.APS_CLIENT_ID.toLowerCase().replace(/[^0-9a-z]/g, '');
          
          // Get models count
          const objects = await apsService.listObjects(bucketKey);
          console.log(`===== Your Autodesk bucket contains ${objects.length} models =====`);
        } catch (error) {
          console.error('Error getting models count:', error.message);
        }
      }, 2000); // Wait 2 seconds before checking to allow server to fully start
      
      // Auto-shutdown feature
      const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
      const isPackaged = process.pkg !== undefined;
      
      if (isPackaged) {
        console.log(`Auto-shutdown feature enabled: Server will shut down after ${INACTIVITY_TIMEOUT/3600000} hours of inactivity`);
        
        let lastActivity = Date.now();
        let shutdownTimer = null;
        
        // Create a middleware to track activity
        app.use((req, res, next) => {
          lastActivity = Date.now();
          
          // Reset the shutdown timer whenever there's activity
          if (shutdownTimer) {
            clearTimeout(shutdownTimer);
            shutdownTimer = null;
          }
          
          // Set a new shutdown timer
          shutdownTimer = setTimeout(() => {
            console.log(`No activity detected for ${INACTIVITY_TIMEOUT/3600000} hours. Shutting down server...`);
            server.close(() => {
              console.log('Server has been gracefully shut down due to inactivity.');
              process.exit(0);
            });
          }, INACTIVITY_TIMEOUT);
          
          next();
        });
        
        // Initial timer setup
        shutdownTimer = setTimeout(() => {
          console.log(`No activity detected for ${INACTIVITY_TIMEOUT/3600000} hours. Shutting down server...`);
          server.close(() => {
            console.log('Server has been gracefully shut down due to inactivity.');
            process.exit(0);
          });
        }, INACTIVITY_TIMEOUT);
      }
    });
  } catch (error) {
    console.error('Error starting server:', error.message);
    process.exit(1);
  }
};

// Export functions for use in routes
module.exports = {
  initializeDatabase,
  setDatabaseCredentials
};

// Start the server
startServer();