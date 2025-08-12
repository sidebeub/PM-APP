const db = require('../db/connection');

class RateLimitService {
  /**
   * Check if IP or username is rate limited
   */
  async checkRateLimit(ipAddress, username = null) {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

    // Check IP-based rate limiting
    const ipAttempts = await db.query(`
      SELECT COUNT(*) as attempt_count
      FROM login_attempts
      WHERE ip_address = $1 
      AND attempted_at > $2
      AND success = FALSE
    `, [ipAddress, timeWindow]);

    const ipFailedAttempts = parseInt(ipAttempts.rows[0].attempt_count);

    // Check username-based rate limiting (if username provided)
    let usernameFailedAttempts = 0;
    if (username) {
      const usernameAttempts = await db.query(`
        SELECT COUNT(*) as attempt_count
        FROM login_attempts
        WHERE username = $1 
        AND attempted_at > $2
        AND success = FALSE
      `, [username, timeWindow]);

      usernameFailedAttempts = parseInt(usernameAttempts.rows[0].attempt_count);
    }

    // Rate limiting thresholds
    const IP_LIMIT = 10;       // 10 failed attempts per IP in 15 minutes
    const USERNAME_LIMIT = 5;  // 5 failed attempts per username in 15 minutes

    const isRateLimited = ipFailedAttempts >= IP_LIMIT || usernameFailedAttempts >= USERNAME_LIMIT;

    return {
      isRateLimited,
      ipFailedAttempts,
      usernameFailedAttempts,
      timeUntilReset: isRateLimited ? 15 * 60 * 1000 : 0 // 15 minutes in milliseconds
    };
  }

  /**
   * Record login attempt
   */
  async recordLoginAttempt(ipAddress, username, success, userAgent = null) {
    await db.query(`
      INSERT INTO login_attempts (ip_address, username, success, user_agent)
      VALUES ($1, $2, $3, $4)
    `, [ipAddress, username, success, userAgent]);
  }

  /**
   * Get recent failed attempts for monitoring
   */
  async getRecentFailedAttempts(limit = 100) {
    const result = await db.query(`
      SELECT ip_address, username, attempted_at, user_agent
      FROM login_attempts
      WHERE success = FALSE
      AND attempted_at > NOW() - INTERVAL '1 hour'
      ORDER BY attempted_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get rate limit status for an IP
   */
  async getRateLimitStatus(ipAddress) {
    const timeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

    const result = await db.query(`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE success = FALSE) as failed_attempts,
        MAX(attempted_at) as last_attempt
      FROM login_attempts
      WHERE ip_address = $1 
      AND attempted_at > $2
    `, [ipAddress, timeWindow]);

    const stats = result.rows[0];
    const failedAttempts = parseInt(stats.failed_attempts);
    const isRateLimited = failedAttempts >= 10;

    return {
      totalAttempts: parseInt(stats.total_attempts),
      failedAttempts,
      isRateLimited,
      lastAttempt: stats.last_attempt,
      timeWindow: '15 minutes'
    };
  }

  /**
   * Clear rate limit for IP (admin function)
   */
  async clearRateLimit(ipAddress) {
    await db.query(`
      DELETE FROM login_attempts
      WHERE ip_address = $1
      AND attempted_at > NOW() - INTERVAL '15 minutes'
    `, [ipAddress]);
  }

  /**
   * Get top attacking IPs
   */
  async getTopAttackingIPs(limit = 10) {
    const result = await db.query(`
      SELECT 
        ip_address,
        COUNT(*) as failed_attempts,
        MAX(attempted_at) as last_attempt,
        MIN(attempted_at) as first_attempt
      FROM login_attempts
      WHERE success = FALSE
      AND attempted_at > NOW() - INTERVAL '24 hours'
      GROUP BY ip_address
      ORDER BY failed_attempts DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }
}

module.exports = new RateLimitService();
