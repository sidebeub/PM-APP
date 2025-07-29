import axios from 'axios';
import { websocketService } from './websocketService';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const token = await refreshToken();
        if (token) {
          // Update the request header with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    const { token } = response.data;
    
    // Store token and update WebSocket
    localStorage.setItem('token', token);
    websocketService.updateAuthToken(token);
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = (): void => {
  // Clear token and disconnect WebSocket
  localStorage.removeItem('token');
  websocketService.updateAuthToken('');
  
  // Redirect to login
  window.location.href = '/login';
};

export const refreshToken = async (): Promise<string> => {
  try {
    const response = await api.post<{ token: string }>('/auth/refresh');
    const { token } = response.data;
    
    // Store token and update WebSocket
    localStorage.setItem('token', token);
    websocketService.updateAuthToken(token);
    
    return token;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

export const getToken = (): string => {
  return localStorage.getItem('token') || '';
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  return !!token;
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
}; 