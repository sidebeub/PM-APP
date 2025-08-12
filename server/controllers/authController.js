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
  process.exit(1); // Exit the application if JWT_SECRET is not set
}

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
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

    // Generate JWT token with enhanced security
    const token = jwt.sign(
      {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        role: newUser.rows[0].role,
        iat: Math.floor(Date.now() / 1000) // Issued at time
      },
      JWT_SECRET,
      {
        expiresIn: '1d',
        algorithm: 'HS256',
        issuer: 'project-management-app',
        audience: 'project-management-users'
      }
    );

    // Return user and token
    res.status(201).json({
      user: newUser.rows[0],
      token
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('Login request received');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('Validation failed:', {
        usernameExists: !!username,
        passwordExists: !!password,
        usernameType: typeof username,
        passwordType: typeof password
      });
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if user exists
    const users = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (users.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with enhanced security
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000) // Issued at time
      },
      JWT_SECRET,
      {
        expiresIn: '1d',
        algorithm: 'HS256',
        issuer: 'project-management-app',
        audience: 'project-management-users'
      }
    );

    // Return user and token
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already available from auth middleware
    const user = req.user;

    // Get fresh user data from database
    const users = await db.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [user.id]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users.rows[0]);
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    // Get token from request body or header
    const refreshToken = req.body.refreshToken || req.header('x-refresh-token');

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      // Check if user exists
      const user = await db.query(
        'SELECT id, username, email, role FROM users WHERE id = $1',
        [decoded.id]
      );

      if (user.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate a new access token
      const token = jwt.sign(
        { id: user.rows[0].id, username: user.rows[0].username, role: user.rows[0].role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Return the new token
      res.json({ token });
    } catch (error) {
      console.error('Error verifying refresh token:', error);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Error in refreshToken:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
