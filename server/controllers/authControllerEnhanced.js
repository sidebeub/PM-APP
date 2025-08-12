const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const tokenService = require('../services/tokenService');
const rateLimitService = require('../services/rateLimitService');

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Ensure JWT secret is set
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set!');
  process.exit(1);
}

// Register user (unchanged for now)
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, email, hashedPassword, 'team_member']
    );

    // Get the newly created user
    const newUser = await db.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [result.rows[0].id]
    );

    const user = newUser.rows[0];

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = await tokenService.generateRefreshToken(
      user.id,
      req.get('User-Agent'),
      req.ip
    );

    // Return user and tokens
    res.status(201).json({
      user,
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: '15m' // Access token expiry
    });

  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced login with rate limiting and refresh tokens
exports.login = async (req, res) => {
  try {
    console.log('Enhanced login attempt started');

    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log(`Login attempt from IP: ${ipAddress}, Username: ${username}`);

    // Validate input
    if (!username || !password) {
      console.log('Validation failed: missing username or password');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if services are available
    if (!rateLimitService || !tokenService) {
      console.error('Enhanced auth services not available');
      return res.status(500).json({ message: 'Authentication services unavailable' });
    }

    // Check rate limiting
    const rateLimitCheck = await rateLimitService.checkRateLimit(ipAddress, username);
    if (rateLimitCheck.isRateLimited) {
      await rateLimitService.recordLoginAttempt(ipAddress, username, false, userAgent);
      console.log(`Rate limited login attempt from IP: ${ipAddress}`);
      return res.status(429).json({ 
        message: 'Too many failed login attempts. Please try again later.',
        retryAfter: Math.ceil(rateLimitCheck.timeUntilReset / 1000) // seconds
      });
    }

    // Check if user exists
    const users = await db.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (users.rows.length === 0) {
      await rateLimitService.recordLoginAttempt(ipAddress, username, false, userAgent);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await rateLimitService.recordLoginAttempt(ipAddress, username, false, userAgent);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Record successful login
    await rateLimitService.recordLoginAttempt(ipAddress, username, true, userAgent);

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = await tokenService.generateRefreshToken(
      user.id,
      userAgent,
      ipAddress
    );

    console.log(`Successful login for user: ${user.username}`);

    // Return user and tokens
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: '15m' // Access token expiry
    });

  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    const tokenData = await tokenService.verifyRefreshToken(refreshToken);

    // Get user data
    const user = await db.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [tokenData.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new access token
    const accessToken = tokenService.generateAccessToken(user.rows[0]);

    res.json({ 
      accessToken,
      expiresIn: '15m'
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// Logout with token blacklisting
exports.logout = async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const { refreshToken } = req.body;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      
      try {
        // Decode token to get JTI
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.jti) {
          await tokenService.blacklistToken(decoded.jti, decoded.id, 'logout');
        }
      } catch (error) {
        console.log('Error blacklisting token:', error.message);
      }
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      try {
        const tokenData = await tokenService.verifyRefreshToken(refreshToken);
        await tokenService.revokeRefreshToken(tokenData.id);
      } catch (error) {
        console.log('Error revoking refresh token:', error.message);
      }
    }

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
  try {
    const userId = req.user.id;

    // Revoke all refresh tokens for user
    await tokenService.revokeAllUserTokens(userId);

    // Note: We can't blacklist all access tokens without knowing their JTIs
    // In a production system, you might want to track all issued tokens

    res.json({ message: 'Logged out from all devices successfully' });

  } catch (error) {
    console.error('Error in logout all:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user (unchanged)
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await db.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
