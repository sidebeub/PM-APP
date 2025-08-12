const jwt = require('jsonwebtoken');
const tokenService = require('../services/tokenService');

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Ensure JWT secret is set
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set!');
  process.exit(1);
}

// Enhanced middleware to verify JWT token with blacklist checking
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    console.log('Auth middleware - Headers:', req.headers);
    console.log('Auth middleware - Auth Header:', authHeader);

    // Check if no token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Auth middleware - No token or invalid format');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = await tokenService.verifyAccessToken(token);
      console.log('Auth middleware - Token verified for user:', decoded.username);

      // Add user from payload to request
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth middleware - Token verification failed:', error.message);
      
      // Handle specific error types
      if (error.message.includes('expired')) {
        return res.status(401).json({ 
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.message.includes('revoked')) {
        return res.status(401).json({ 
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      } else {
        return res.status(401).json({ 
          message: 'Token is not valid',
          code: 'TOKEN_INVALID'
        });
      }
    }

  } catch (error) {
    console.error('Auth middleware - Unexpected error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Middleware to check if user has admin role
const adminAuth = async (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied, admin privileges required' });
    }
  });
};

// Middleware to check if user has project manager or admin role
const managerAuth = async (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role === 'admin' || req.user.role === 'project_manager') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied, manager privileges required' });
    }
  });
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = await tokenService.verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      // Token invalid, continue without user
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

// Rate limiting middleware for sensitive endpoints
const rateLimitAuth = (maxAttempts = 5, windowMinutes = 15) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key);
      const validAttempts = userAttempts.filter(time => now - time < windowMs);
      attempts.set(key, validAttempts);
    }

    // Check current attempts
    const currentAttempts = attempts.get(key) || [];
    
    if (currentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        message: `Too many requests. Try again in ${windowMinutes} minutes.`,
        retryAfter: windowMinutes * 60
      });
    }

    // Record this attempt
    currentAttempts.push(now);
    attempts.set(key, currentAttempts);

    next();
  };
};

module.exports = { 
  auth, 
  adminAuth, 
  managerAuth, 
  optionalAuth, 
  rateLimitAuth 
};
