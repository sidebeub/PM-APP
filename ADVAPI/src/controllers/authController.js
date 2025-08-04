// Use custom axios implementation for packaged app
const axios = require('../services/axiosCustom');
const apsService = require('../services/apsService');

/**
 * Get a public access token for the Viewer
 */
exports.getPublicToken = async (req, res) => {
  try {
    const token = await apsService.getPublicToken();
    res.json({
      access_token: token.access_token,
      expires_in: token.expires_in
    });
  } catch (error) {
    console.error('Error getting public token:', error.message);
    console.error(error.stack);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ error: 'Failed to get token' });
  }
};

/**
 * OAuth callback endpoint for 3-legged authentication flow
 */
exports.oauthCallback = async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    const token = await apsService.getAccessTokenFromCode(code);
    // In a real app, you'd store this token for the user
    // and redirect to the application's main page
    res.redirect('/');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
