import axios from 'axios';

// Create a request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

// Configure axios instance with timeout and retry logic
const getBaseURL = () => {
  // HARDCODED FOR RAILWAY DEPLOYMENT
  // Always use relative URL in production build
  console.log('Using hardcoded relative API URL for Railway');
  return '/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Do NOT use withCredentials for this app as it causes CORS issues
  withCredentials: false
});

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added token to request:', config.url);
    } else {
      console.warn('No token found for request:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle authentication errors and error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.config?.url);

    if (error.response?.status === 401) {
      console.warn('Authentication error detected');

      // Only redirect to login if we're not already on the login page
      // and not trying to refresh the token
      if (!window.location.pathname.includes('/login') &&
          !error.config?.url?.includes('/auth/refresh')) {
        console.log('Redirecting to login page due to auth error');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to deduplicate requests
const deduplicateRequest = <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  // If there's already a pending request with this key, return that promise
  if (pendingRequests.has(key)) {
    console.log(`Deduplicating request: ${key}`);
    return pendingRequests.get(key) as Promise<T>;
  }

  // Otherwise, create a new request
  const promise = requestFn().finally(() => {
    // Remove the request from the pending map when it completes (success or failure)
    pendingRequests.delete(key);
  });

  // Store the promise in the pending map
  pendingRequests.set(key, promise);
  return promise;
};

// Authentication API services
export const authService = {
  // Register a new user
  register: async (userData: { username: string; email: string; password: string }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  // Login a user
  login: async (credentials: {
    username: string;
    password: string;
  }) => {
    try {
      console.log('Sending login request with:', credentials);
      const response = await api.post('/auth/login', credentials);
      // Store the token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  // Logout a user
  logout: () => {
    localStorage.removeItem('token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      console.log('Fetching current user...');
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      const response = await api.get('/auth/me');
      console.log('Current user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },
};

// Project API services
export const projectService = {
  // Get all projects
  getAllProjects: async () => {
    try {
      const response = await api.get('/projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  // Get project by ID
  getProjectById: async (id: number) => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching project with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new project
  createProject: async (projectData: any) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Update a project
  updateProject: async (id: number, projectData: any) => {
    try {
      const response = await api.put(`/projects/${id}`, projectData);
      return response.data;
    } catch (error) {
      console.error(`Error updating project with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a project
  deleteProject: async (id: number) => {
    try {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting project with ID ${id}:`, error);
      throw error;
    }
  },

  // Get project progress
  getProjectProgress: async (id: number) => {
    try {
      const response = await api.get(`/projects/${id}/progress`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching progress for project with ID ${id}:`, error);
      throw error;
    }
  }
};

// Task API services
export const taskService = {
  // Get all tasks
  getAllTasks: async () => {
    try {
      const response = await api.get('/tasks');
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  // Get tasks by project ID
  getTasksByProject: async (projectId: number) => {
    try {
      const response = await api.get(`/tasks/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching tasks for project with ID ${projectId}:`, error);
      throw error;
    }
  },

  // Get task by ID
  getTaskById: async (id: number) => {
    try {
      const response = await api.get(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new task
  createTask: async (taskData: any) => {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Update a task
  updateTask: async (id: number, taskData: any) => {
    try {
      const response = await api.put(`/tasks/${id}`, taskData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a task
  deleteTask: async (id: number) => {
    try {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting task with ID ${id}:`, error);
      throw error;
    }
  },

  // Get task dependencies with retry logic and deduplication
  getTaskDependencies: async (id: number) => {
    const requestKey = `task-dependencies-${id}`;
    return deduplicateRequest(requestKey, async () => {
      try {
        const response = await api.get(`/tasks/${id}/dependencies`, {
          timeout: 5000, // 5 second timeout for this specific request
        });

        // Log the response for debugging
        console.log(`Fetched dependencies for task ${id}:`, response.data);

        // Use the response data directly from the server
        const dependencies = response.data;

        return dependencies;
      } catch (error) {
        console.error(`Error fetching dependencies for task with ID ${id}:`, error);
        throw error;
      }
    });
  },

  // Add task dependency
  addTaskDependency: async (id: number, dependsOnTaskId: number) => {
    try {
      const response = await api.post(`/tasks/${id}/dependencies`, { dependsOnTaskId });

      // Log the response for debugging
      console.log(`Added dependency for task ${id}:`, response.data);

      // Use the response data directly from the server
      const dependency = response.data;

      return dependency;
    } catch (error) {
      console.error(`Error adding dependency for task with ID ${id}:`, error);
      throw error;
    }
  },

  // Remove task dependency
  removeTaskDependency: async (id: number, dependencyId: number) => {
    try {
      const response = await api.delete(`/tasks/${id}/dependencies/${dependencyId}`);

      // Log the response for debugging
      console.log(`Removed dependency for task ${id}:`, response.data);

      return response.data;
    } catch (error) {
      console.error(`Error removing dependency for task with ID ${id}:`, error);
      throw error;
    }
  }
};

export default api;
