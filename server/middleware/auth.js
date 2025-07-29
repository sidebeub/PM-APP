const jwt = require('jsonwebtoken');

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Ensure JWT secret is set
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set!');
  process.exit(1); // Exit the application if JWT_SECRET is not set
}

// Middleware to verify JWT token
const auth = (req, res, next) => {
  // Get token from header
  const authHeader = req.header('Authorization');

  console.log('Auth middleware - Headers:', req.headers);
  console.log('Auth middleware - Auth Header:', authHeader);

  // Check if no token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Auth middleware - No token or invalid format');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log('Auth middleware - Token verified for user:', decoded.username);

    // Add user from payload to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error verifying token:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user has admin role
const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied, admin privileges required' });
    }
  });
};

module.exports = { auth, adminAuth };
