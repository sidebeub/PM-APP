const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Login user and get token
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getCurrentUser);

// @route   POST /api/auth/refresh
// @desc    Refresh authentication token
// @access  Public (with refresh token)
router.post('/refresh', authController.refreshToken);

module.exports = router;
