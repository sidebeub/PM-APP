const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Get public access token for the viewer
router.get('/token', authController.getPublicToken);

// Callback endpoint for 3-legged OAuth flow
router.get('/callback', authController.oauthCallback);

module.exports = router;