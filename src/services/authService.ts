import api from './api';
import { websocketService } from './websocketService';

interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: string;
}

class AuthService {
  private refreshTokenKey = 'refreshToken';
  private accessTokenKey = 'token'; // Keep 'token' for backward compatibility
  private userKey = 'user';
  private refreshPromise: Promise<string> | null = null;

  /**
   * Enhanced login with refresh tokens and rate limiting
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/login', { username, password });
      const data: LoginResponse = response.data;

      // Store tokens and user data
      this.setTokens(data.accessToken, data.refreshToken);
      this.setUser(data.user);

      // Set up automatic token refresh
      this.scheduleTokenRefresh();

      return data;
    } catch (error: any) {
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retryAfter || 900;
        throw new Error(`Too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`);
      }
      throw error;
    }
  }

  /**
   * Enhanced register with refresh tokens
   */
  async register(username: string, email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const data: LoginResponse = response.data;

      this.setTokens(data.accessToken, data.refreshToken);
      this.setUser(data.user);
      this.scheduleTokenRefresh();

      return data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many registration attempts. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Enhanced logout with token blacklisting
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.clearTokens();
      this.clearUser();
      this.cancelTokenRefresh();
      websocketService.disconnect();
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<void> {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.error('Error during logout all:', error);
    } finally {
      this.clearTokens();
      this.clearUser();
      this.cancelTokenRefresh();
      websocketService.disconnect();
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      const data: RefreshResponse = response.data;

      this.setAccessToken(data.accessToken);
      this.scheduleTokenRefresh();

      return data.accessToken;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.clearTokens();
        this.clearUser();
        throw new Error('Session expired. Please login again.');
      }
      throw error;
    }
  }

  private scheduleTokenRefresh(): void {
    const refreshInterval = 13 * 60 * 1000; // 13 minutes

    setTimeout(() => {
      if (this.isLoggedIn()) {
        this.refreshAccessToken().catch(error => {
          console.error('Automatic token refresh failed:', error);
          this.logout();
        });
      }
    }, refreshInterval);
  }

  private cancelTokenRefresh(): void {
    // Implementation would track timeout IDs in production
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  private setAccessToken(accessToken: string): void {
    localStorage.setItem(this.accessTokenKey, accessToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  private clearTokens(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  private setUser(user: any): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): any | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  private clearUser(): void {
    localStorage.removeItem(this.userKey);
  }

  isLoggedIn(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }

  async getCurrentUser(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data;
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isManager(): boolean {
    return this.hasRole('admin') || this.hasRole('project_manager');
  }

  // Legacy methods for backward compatibility
  async loginUser(credentials: { username: string; password: string }) {
    return this.login(credentials.username, credentials.password);
  }

  async registerUser(userData: { username: string; email: string; password: string }) {
    return this.register(userData.username, userData.email, userData.password);
  }

  logoutUser(): Promise<void> {
    return this.logout();
  }
}

export default new AuthService();