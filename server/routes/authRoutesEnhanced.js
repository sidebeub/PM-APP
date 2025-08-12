const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllerEnhanced');
const { auth, adminAuth, rateLimitAuth } = require('../middleware/authEnhanced');

// Rate limiting for auth endpoints - More lenient for development
const authRateLimit = rateLimitAuth(20, 15); // 20 attempts per 15 minutes (increased from 5)

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimit, authController.register);

// @route   POST /api/auth/login
// @desc    Login user and get tokens (with rate limiting)
// @access  Public
router.post('/login', authRateLimit, authController.login);

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public (with refresh token)
router.post('/refresh', authController.refreshToken);

// @route   POST /api/auth/logout
// @desc    Logout user and blacklist tokens
// @access  Private
router.post('/logout', auth, authController.logout);

// @route   POST /api/auth/logout-all
// @desc    Logout user from all devices
// @access  Private
router.post('/logout-all', auth, authController.logoutAll);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getCurrentUser);

// Admin routes for monitoring (optional)
// @route   GET /api/auth/admin/login-attempts
// @desc    Get recent failed login attempts (admin only)
// @access  Private (Admin)
router.get('/admin/login-attempts', adminAuth, async (req, res) => {
  try {
    const rateLimitService = require('../services/rateLimitService');
    const attempts = await rateLimitService.getRecentFailedAttempts(50);
    res.json(attempts);
  } catch (error) {
    console.error('Error getting login attempts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/admin/attacking-ips
// @desc    Get top attacking IPs (admin only)
// @access  Private (Admin)
router.get('/admin/attacking-ips', adminAuth, async (req, res) => {
  try {
    const rateLimitService = require('../services/rateLimitService');
    const ips = await rateLimitService.getTopAttackingIPs(10);
    res.json(ips);
  } catch (error) {
    console.error('Error getting attacking IPs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/admin/cleanup
// @desc    Manually trigger token cleanup (admin only)
// @access  Private (Admin)
router.post('/admin/cleanup', adminAuth, async (req, res) => {
  try {
    const tokenService = require('../services/tokenService');
    const cleaned = await tokenService.cleanupExpiredTokens();
    res.json({ 
      message: 'Cleanup completed successfully',
      tokensRemoved: cleaned 
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
