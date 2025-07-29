const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// WebSocket message types
const MessageType = {
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_DELETED: 'TASK_DELETED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_DELETED: 'PROJECT_DELETED',
  USER_CONNECTED: 'USER_CONNECTED',
  USER_DISCONNECTED: 'USER_DISCONNECTED',
  ERROR: 'ERROR',
};

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server, 
      path: '/ws',
      clientTracking: true,
      handleProtocols: () => 'json'
    });
    this.clients = new Map(); // Map of userId -> WebSocket
    this.setupWebSocketServer();
    console.log('WebSocket server initialized');
  }

  setupWebSocketServer() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Extract token from URL query parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          this.sendError(ws, 'Authentication token is required');
          ws.close(4001, 'Authentication required');
          return;
        }
        
        // Verify token
        const decoded = await this.verifyToken(token);
        const userId = decoded.id;
        
        if (!userId) {
          this.sendError(ws, 'Invalid authentication token');
          ws.close(4002, 'Invalid authentication');
          return;
        }

        // Remove any existing connection for this user
        const existingConnection = this.clients.get(userId);
        if (existingConnection) {
          existingConnection.close(1000, 'New connection established');
          this.clients.delete(userId);
        }
        
        // Store client connection
        this.clients.set(userId, ws);
        console.log(`User ${userId} connected to WebSocket`);
        
        // Send initial connection success message
        const successMessage = {
          type: 'CONNECTION_SUCCESS',
          payload: { userId },
          timestamp: new Date().toISOString(),
        };
        
        // Ensure the connection is open before sending
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(successMessage));
        } else {
          // Wait for the connection to be ready
          ws.once('open', () => {
            ws.send(JSON.stringify(successMessage));
          });
        }

        // Notify all clients about new user connection
        this.broadcastMessage({
          type: MessageType.USER_CONNECTED,
          payload: { userId },
          timestamp: new Date().toISOString(),
          userId,
        });
        
        // Handle messages from client
        ws.on('message', (message) => {
          try {
            const parsedMessage = JSON.parse(message.toString());
            console.log(`Received message from user ${userId}:`, parsedMessage);
            
            // Handle message based on type
            if (parsedMessage.type && typeof parsedMessage.type === 'string') {
              this.broadcastMessage({
                ...parsedMessage,
                userId,
                timestamp: new Date().toISOString(),
              });
            } else {
              this.sendError(ws, 'Invalid message format: missing or invalid type');
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.sendError(ws, 'Invalid message format: not valid JSON');
          }
        });
        
        // Handle client disconnection
        ws.on('close', (code, reason) => {
          console.log(`User ${userId} disconnected from WebSocket (${code}: ${reason})`);
          this.clients.delete(userId);
          
          // Notify all clients about user disconnection
          this.broadcastMessage({
            type: MessageType.USER_DISCONNECTED,
            payload: { userId },
            timestamp: new Date().toISOString(),
          });
        });
        
        // Handle errors
        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${userId}:`, error);
          this.clients.delete(userId);
          this.sendError(ws, 'Internal WebSocket error');
        });
        
      } catch (error) {
        console.error('Error handling WebSocket connection:', error);
        this.sendError(ws, 'Server error');
        ws.close(4000, 'Server error');
      }
    });

    // Handle server-level errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }
  
  // Verify JWT token
  async verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const verifyAsync = promisify(jwt.verify);
      return await verifyAsync(token, secret);
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new Error('Invalid token');
    }
  }
  
  // Send error message to client
  sendError(ws, errorMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: MessageType.ERROR,
          payload: { message: errorMessage },
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        console.error('Error sending error message:', error);
      }
    }
  }
  
  // Broadcast message to all connected clients
  broadcastMessage(message) {
    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Error broadcasting message to user ${userId}:`, error);
          this.clients.delete(userId);
        }
      } else {
        // Clean up any closed connections
        this.clients.delete(userId);
      }
    });
  }
  
  // Send message to specific user
  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
        }));
        return true;
      } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
        this.clients.delete(userId);
        return false;
      }
    }
    return false;
  }
  
  // Notify about task updates
  notifyTaskUpdated(task, excludeUserId = null) {
    this.broadcastMessage({
      type: MessageType.TASK_UPDATED,
      payload: task,
      timestamp: new Date().toISOString(),
    }, excludeUserId);
  }
  
  // Notify about task creation
  notifyTaskCreated(task, excludeUserId = null) {
    this.broadcastMessage({
      type: MessageType.TASK_CREATED,
      payload: task,
      timestamp: new Date().toISOString(),
    }, excludeUserId);
  }
  
  // Notify about task deletion
  notifyTaskDeleted(taskId, excludeUserId = null) {
    this.broadcastMessage({
      type: MessageType.TASK_DELETED,
      payload: taskId,
      timestamp: new Date().toISOString(),
    }, excludeUserId);
  }
  
  // Notify about project updates
  notifyProjectUpdated(project, excludeUserId = null) {
    this.broadcastMessage({
      type: MessageType.PROJECT_UPDATED,
      payload: project,
      timestamp: new Date().toISOString(),
    }, excludeUserId);
  }
  
  // Notify about project creation
  notifyProjectCreated(project, excludeUserId = null) {
    this.broadcastMessage({
      type: MessageType.PROJECT_CREATED,
      payload: project,
      timestamp: new Date().toISOString(),
    }, excludeUserId);
  }
  
  // Notify about project deletion
  notifyProjectDeleted(projectId, excludeUserId = null) {
    this.broadcastMessage({
      type: MessageType.PROJECT_DELETED,
      payload: projectId,
      timestamp: new Date().toISOString(),
    }, excludeUserId);
  }
  
  // Get number of connected clients
  getConnectedClientsCount() {
    return this.clients.size;
  }
  
  // Check if a user is connected
  isUserConnected(userId) {
    return this.clients.has(userId);
  }
  
  // Close all connections
  close() {
    this.clients.forEach((client, userId) => {
      try {
        client.close(1000, 'Server shutting down');
      } catch (error) {
        console.error(`Error closing connection for user ${userId}:`, error);
      }
    });
    this.clients.clear();
    this.wss.close(() => {
      console.log('WebSocket server closed');
    });
  }
}

module.exports = WebSocketServer;
