const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

// JWT_SECRET should come from Railway environment variables
// Removed hardcoded override to use Railway's secure JWT_SECRET

// Import WebSocket server
const WebSocketServer = require('./websocket');
const { killPortProcess } = require('./utils/killPortProcess');

// Import routes
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const authRoutes = require('./routes/authRoutes');
const kbomRoutes = require('./routes/kbomRoutes');

// Import ADVAPI routes
const advApiAuthRoutes = require('../ADVAPI/src/routes/auth');
const advApiModelRoutes = require('../ADVAPI/src/routes/models');
const advApiSystemRoutes = require('../ADVAPI/src/routes/system');

// Import ADVAPI database initialization
const { initializeDatabase } = require('../ADVAPI/src/server');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const defaultPort = process.env.PORT || 3001;
let port = defaultPort;

// Initialize WebSocket server
const wss = new WebSocketServer(server);

// Export WebSocket server for use in controllers
app.set('wss', wss);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? false // Disable CORS in production
    : 'http://localhost:3000', // Allow CORS from React dev server in development
  credentials: true
}));

// Set CORS headers for all responses
app.use((req, res, next) => {
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? req.headers.origin
    : 'http://localhost:3000';

  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-refresh-token');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads (needed for ADVAPI)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../ADVAPI/uploads');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating uploads directory:', error);
      cb(null, require('os').tmpdir());
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit per file
    fieldSize: 100 * 1024 * 1024 // 100MB field size limit
  }
});

// Make upload middleware available globally for ADVAPI routes
app.set('upload', upload);

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Project Management API',
    endpoints: {
      auth: '/api/auth',
      projects: '/api/projects',
      tasks: '/api/tasks',
      milestones: '/api/milestones',
      users: '/api/users',
      customers: '/api/customers',
      health: '/api/health',
      websocket: 'ws://localhost:' + port + '/ws'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/kbom', kbomRoutes);

// ADVAPI Routes (3D Model Viewer)
app.use('/api/advapi/auth', advApiAuthRoutes);
app.use('/api/advapi/models', advApiModelRoutes);
app.use('/api/advapi/system', advApiSystemRoutes);

// Serve ADVAPI static files under /advapi path (works in both dev and production)
app.use('/advapi', express.static(path.join(__dirname, '../ADVAPI/public')));

// Serve uploads from ADVAPI
app.use('/advapi/uploads', express.static(path.join(__dirname, '../ADVAPI/uploads')));

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../build')));
}

// Production route handlers
if (process.env.NODE_ENV === 'production') {
  // Handle ADVAPI routes - serve the ADVAPI index.html for /advapi paths that don't match static files
  app.get('/advapi', (req, res) => {
    res.sendFile(path.join(__dirname, '../ADVAPI/public/index.html'));
  });

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// Serve a simple HTML page for the root path
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Project Management API</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .container { max-width: 800px; margin: 0 auto; }
          .endpoint { background: #f4f4f4; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Project Management API</h1>
          <p>The API is running successfully. Here are the available endpoints:</p>

          <div class="endpoint">
            <h3><a href="/api">/api</a></h3>
            <p>Root API endpoint with information about available endpoints</p>
          </div>

          <div class="endpoint">
            <h3><a href="/api/health">/api/health</a></h3>
            <p>Health check endpoint</p>
          </div>

          <div class="endpoint">
            <h3><a href="/api/projects">/api/projects</a></h3>
            <p>Get all projects</p>
          </div>

          <div class="endpoint">
            <h3><a href="/api/tasks">/api/tasks</a></h3>
            <p>Get all tasks</p>
          </div>

          <div class="endpoint">
            <h3><a href="/api/milestones">/api/milestones</a></h3>
            <p>Get all milestones</p>
          </div>

          <div class="endpoint">
            <h3><a href="/api/users">/api/users</a></h3>
            <p>Get all users</p>
          </div>

          <div class="endpoint">
            <h3><a href="/api/customers">/api/customers</a></h3>
            <p>Get all customers</p>
          </div>

          <div class="endpoint">
            <h3><a href="/api/auth">/api/auth</a></h3>
            <p>Authentication endpoints (register, login, get current user)</p>
          </div>

          <div class="endpoint">
            <h3>ws://localhost:${port}/ws</h3>
            <p>WebSocket endpoint for real-time updates</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start the HTTP server (which will handle both HTTP and WebSocket)
const startServer = () => {
  const serverPort = process.env.PORT || 3001;

  server.listen(serverPort, '0.0.0.0', async () => {
    console.log(`Server running on port ${serverPort}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Database host: ${process.env.DB_HOST || 'localhost'}`);

    // Initialize ADVAPI database connection for KBOM data
    try {
      console.log('Initializing ADVAPI database connection for KBOM data...');
      const dbCredentials = {
        user: process.env.DB_USER || 'Zach',
        password: process.env.DB_PASSWORD || 'Rayne22!'
      };
      await initializeDatabase(dbCredentials);
      console.log('ADVAPI database connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ADVAPI database connection:', error.message);
      console.warn('KBOM data will not be available in 3D viewer');
    }
  }).on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
};

startServer();

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.close();
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
