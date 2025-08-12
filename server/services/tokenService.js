const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || (JWT_SECRET ? JWT_SECRET + '_refresh' : null);

// Validate required secrets
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set!');
  throw new Error('JWT_SECRET is required for token service');
}

if (!REFRESH_TOKEN_SECRET) {
  console.error('REFRESH_TOKEN_SECRET environment variable is not set!');
  console.log('Using fallback: JWT_SECRET + "_refresh"');
}

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRY = '7d';  // Long-lived refresh tokens

class TokenService {
  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      type: 'access',
      jti: crypto.randomUUID(), // JWT ID for blacklisting
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256',
      issuer: 'project-management-app',
      audience: 'project-management-users'
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  async generateRefreshToken(userId, deviceInfo = null, ipAddress = null) {
    // Generate random token
    const tokenValue = crypto.randomBytes(64).toString('hex');
    const tokenHash = await bcrypt.hash(tokenValue, 10);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store in database
    const result = await db.query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [userId, tokenHash, expiresAt, deviceInfo, ipAddress]);

    return {
      token: tokenValue,
      id: result.rows[0].id,
      expiresAt
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'project-management-app',
        audience: 'project-management-users'
      });

      // Check if token is blacklisted
      const blacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (blacklisted) {
        throw new Error('Token has been revoked');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token) {
    try {
      // Get all active refresh tokens from database
      const result = await db.query(`
        SELECT id, user_id, token_hash, expires_at, is_revoked
        FROM refresh_tokens
        WHERE expires_at > NOW() AND is_revoked = FALSE
      `);

      // Check each token hash
      for (const row of result.rows) {
        const isValid = await bcrypt.compare(token, row.token_hash);
        if (isValid) {
          // Update last used time
          await db.query(`
            UPDATE refresh_tokens 
            SET last_used_at = NOW() 
            WHERE id = $1
          `, [row.id]);

          return {
            id: row.id,
            userId: row.user_id,
            expiresAt: row.expires_at
          };
        }
      }

      throw new Error('Invalid refresh token');
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId) {
    await db.query(`
      UPDATE refresh_tokens 
      SET is_revoked = TRUE 
      WHERE id = $1
    `, [tokenId]);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId) {
    await db.query(`
      UPDATE refresh_tokens 
      SET is_revoked = TRUE 
      WHERE user_id = $1 AND is_revoked = FALSE
    `, [userId]);
  }

  /**
   * Blacklist access token (for logout)
   */
  async blacklistToken(jti, userId, reason = 'logout') {
    // Decode the token to get expiry time
    const decoded = jwt.decode(jti);
    const expiresAt = new Date(decoded.exp * 1000);

    await db.query(`
      INSERT INTO blacklisted_tokens (token_jti, user_id, expires_at, reason)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (token_jti) DO NOTHING
    `, [jti, userId, expiresAt, reason]);
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(jti) {
    const result = await db.query(`
      SELECT 1 FROM blacklisted_tokens 
      WHERE token_jti = $1 AND expires_at > NOW()
    `, [jti]);

    return result.rows.length > 0;
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens() {
    const result = await db.query('SELECT cleanup_expired_tokens()');
    return result.rows[0].cleanup_expired_tokens;
  }
}

module.exports = new TokenService();
