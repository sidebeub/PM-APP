const express = require('express');
const router = express.Router();

// Test basic functionality
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Basic server is working'
  });
});

// Test environment variables
router.get('/env-check', (req, res) => {
  const envVars = {
    JWT_SECRET: !!process.env.JWT_SECRET,
    REFRESH_TOKEN_SECRET: !!process.env.REFRESH_TOKEN_SECRET,
    DB_HOST: !!process.env.DB_HOST,
    DB_USER: !!process.env.DB_USER,
    DB_PASSWORD: !!process.env.DB_PASSWORD,
    NODE_ENV: process.env.NODE_ENV
  };
  
  res.json({
    status: 'Environment variables check',
    variables: envVars,
    allRequired: envVars.JWT_SECRET && envVars.DB_HOST && envVars.DB_USER && envVars.DB_PASSWORD
  });
});

// Test database connection
router.get('/db-check', async (req, res) => {
  try {
    const db = require('../db/connection');
    
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time');
    
    // Check if enhanced auth tables exist
    const tables = ['refresh_tokens', 'blacklisted_tokens', 'login_attempts'];
    const tableChecks = {};
    
    for (const tableName of tables) {
      const tableResult = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [tableName]);
      
      tableChecks[tableName] = tableResult.rows.length > 0;
    }
    
    res.json({
      status: 'Database connection successful',
      currentTime: result.rows[0].current_time,
      enhancedAuthTables: tableChecks,
      allTablesExist: Object.values(tableChecks).every(exists => exists)
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'Database connection failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test enhanced auth services
router.get('/auth-services-check', async (req, res) => {
  try {
    // Test if services can be loaded
    const tokenService = require('../services/tokenService');
    const rateLimitService = require('../services/rateLimitService');
    
    // Test basic functionality
    const testUser = { id: 1, username: 'test', role: 'admin' };
    const accessToken = tokenService.generateAccessToken(testUser);
    
    res.json({
      status: 'Enhanced auth services working',
      tokenServiceLoaded: !!tokenService,
      rateLimitServiceLoaded: !!rateLimitService,
      canGenerateTokens: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'Enhanced auth services failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test original auth controller
router.get('/original-auth-check', async (req, res) => {
  try {
    const authController = require('../controllers/authController');
    
    res.json({
      status: 'Original auth controller loaded',
      hasLogin: typeof authController.login === 'function',
      hasRegister: typeof authController.register === 'function',
      hasGetCurrentUser: typeof authController.getCurrentUser === 'function'
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'Original auth controller failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test enhanced auth controller
router.get('/enhanced-auth-check', async (req, res) => {
  try {
    const authControllerEnhanced = require('../controllers/authControllerEnhanced');
    
    res.json({
      status: 'Enhanced auth controller loaded',
      hasLogin: typeof authControllerEnhanced.login === 'function',
      hasRegister: typeof authControllerEnhanced.register === 'function',
      hasLogout: typeof authControllerEnhanced.logout === 'function',
      hasRefreshToken: typeof authControllerEnhanced.refreshToken === 'function'
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'Enhanced auth controller failed',
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
