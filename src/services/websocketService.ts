import { store } from '../store';
import { updateTaskInState } from '../store/tasksSlice';
import { updateProject } from '../store/projectsSlice';
import { removeProject } from '../store/projectsSlice';

// Define WebSocket message types
export enum WebSocketMessageType {
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_DELETED = 'TASK_DELETED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  USER_CONNECTED = 'USER_CONNECTED',
  USER_DISCONNECTED = 'USER_DISCONNECTED',
  CONNECTION_SUCCESS = 'CONNECTION_SUCCESS',
  ERROR = 'ERROR',
}

// Define WebSocket message interface
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  userId?: number;
}

// Define message handler type
type MessageHandler = (message: WebSocketMessage) => void;



// WebSocket service class
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnecting = false;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private lastTaskUpdate: {
    taskId: string;
    timestamp: number;
    payload: any;
  } | null = null;
  private readonly TASK_UPDATE_DEBOUNCE = 500;
  private readonly PROJECT_UPDATE_DEBOUNCE = 500;
  private pendingTaskUpdates: Map<string, {
    payload: any;
    timestamp: number;
    timeout?: NodeJS.Timeout;
  }> = new Map();
  private pendingProjectUpdates: Map<string, {
    payload: any;
    timestamp: number;
    timeout?: NodeJS.Timeout;
  }> = new Map();
  private authToken: string = '';
  public readonly WS_URL = process.env.NODE_ENV === 'production'
    ? `wss://${window.location.host}/ws`
    : `ws://localhost:${process.env.REACT_APP_WS_PORT || '3001'}/ws`;
  private connectionPromise: Promise<void> | null = null;
  private isDestroyed = false;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.authToken = localStorage.getItem('token') || '';
    if (this.authToken) {
      this.connect().catch(error => {
        console.error('Initial WebSocket connection failed:', error);
      });
    }
  }

  private async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const wsUrl = `${this.WS_URL}?token=${token}`;
    console.log('Attempting to connect to WebSocket:', this.WS_URL);
    console.log('Creating WebSocket connection with URL:', wsUrl);

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(wsUrl);
        
        // Set connection timeout
        const timeoutId = setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timeout');
            this.socket?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // Increased timeout to 10 seconds

        this.socket.onopen = () => {
          clearTimeout(timeoutId);
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          
          // Handle different close codes
          if (event.code === 4001) {
            console.error('Authentication failed');
            this.handleAuthError();
          } else if (event.code === 1000) {
            console.log('Normal closure');
          } else if (event.code === 1006) {
            console.log('Abnormal closure - connection lost, attempting to reconnect');
            if (!this.isDestroyed) {
              // Add a small delay before attempting to reconnect
              setTimeout(() => {
                this.attemptReconnect();
              }, 1000);
            }
          } else {
            console.log('Abnormal closure, attempting to reconnect');
            if (!this.isDestroyed) {
              // Add a small delay before attempting to reconnect
              setTimeout(() => {
                this.attemptReconnect();
              }, 1000);
            }
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          clearTimeout(timeoutId);
          // Don't reject here, let onclose handle the reconnection
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxReconnectDelay
    );

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectAttempts++;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      if (!this.isDestroyed) {
        this.attemptReconnect();
      }
    }
  }

  private handleAuthError(): void {
    // Clear the invalid token
    localStorage.removeItem('token');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  public disconnect(): void {
    // Only disconnect if we're actually destroying the service
    if (!this.isDestroyed) {
      return;
    }
    
    this.isDestroyed = true;
    
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  public updateAuthToken(token: string): void {
    this.authToken = token;
    if (!this.isDestroyed) {
      this.connect().catch(error => {
        console.error('Error connecting with new token:', error);
      });
    }
  }

  // Handle incoming WebSocket messages
  private handleMessage(message: WebSocketMessage): void {
    try {
      const messageType = message.type as WebSocketMessageType;
      console.log('WebSocket message received:', message);

      switch (messageType) {
        case WebSocketMessageType.TASK_UPDATED:
          // Debounce task updates to prevent rapid re-renders
          const taskId = message.payload.id.toString();
          const taskNow = Date.now();
          const pendingTaskUpdate = this.pendingTaskUpdates.get(taskId);

          if (pendingTaskUpdate) {
            // Clear existing timeout
            if (pendingTaskUpdate.timeout) {
              clearTimeout(pendingTaskUpdate.timeout);
            }
            // Update the pending update
            pendingTaskUpdate.payload = message.payload;
            pendingTaskUpdate.timestamp = taskNow;
          } else {
            // Create new pending update
            this.pendingTaskUpdates.set(taskId, {
              payload: message.payload,
              timestamp: taskNow
            });
          }

          // Set timeout to process the update
          const taskTimeout = setTimeout(() => {
            const update = this.pendingTaskUpdates.get(taskId);
            if (update) {
              store.dispatch(updateTaskInState(update.payload));
              this.pendingTaskUpdates.delete(taskId);
            }
          }, this.TASK_UPDATE_DEBOUNCE);

          // Store the timeout reference
          const taskUpdate = this.pendingTaskUpdates.get(taskId);
          if (taskUpdate) {
            taskUpdate.timeout = taskTimeout;
          }
          break;

        case WebSocketMessageType.PROJECT_UPDATED:
          // Debounce project updates to prevent rapid re-renders
          const projectId = message.payload.id.toString();
          const projectNow = Date.now();
          const pendingProjectUpdate = this.pendingProjectUpdates.get(projectId);

          if (pendingProjectUpdate) {
            // Clear existing timeout
            if (pendingProjectUpdate.timeout) {
              clearTimeout(pendingProjectUpdate.timeout);
            }
            // Update the pending update
            pendingProjectUpdate.payload = message.payload;
            pendingProjectUpdate.timestamp = projectNow;
          } else {
            // Create new pending update
            this.pendingProjectUpdates.set(projectId, {
              payload: message.payload,
              timestamp: projectNow
            });
          }

          // Set timeout to process the update
          const projectTimeout = setTimeout(() => {
            const update = this.pendingProjectUpdates.get(projectId);
            if (update) {
              store.dispatch(updateProject(update.payload));
              this.pendingProjectUpdates.delete(projectId);
            }
          }, this.PROJECT_UPDATE_DEBOUNCE);

          // Store the timeout reference
          const projectUpdate = this.pendingProjectUpdates.get(projectId);
          if (projectUpdate) {
            projectUpdate.timeout = projectTimeout;
          }
          break;

        case WebSocketMessageType.PROJECT_DELETED:
          store.dispatch(removeProject(message.payload.id));
          break;

        case WebSocketMessageType.ERROR:
          console.error('WebSocket error:', message.payload);
          break;

        default:
          console.warn('Unknown WebSocket message type:', messageType);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  // Add event listener
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)?.push(callback);
  }

  // Emit event to listeners
  private emit(event: string, data: any): void {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket ${event} listener:`, error);
      }
    });
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

export default websocketService;
