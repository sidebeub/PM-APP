const express = require('express');
const multer = require('multer');
const path = require('path');
const modelController = require('../controllers/modelController');
const { verifyUploadPassword } = require('../middleware/passwordProtection');

const router = express.Router();

// Configure storage for uploaded files
const os = require('os');
const fs = require('fs');

// Use system temp directory when running as packaged executable
const getUploadPath = () => {
  if (process.pkg) {
    // Running as packaged executable - use temp directory
    const tempDir = path.join(os.tmpdir(), 'advapi-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  } else {
    // Running in development - use local uploads directory
    return path.join(__dirname, '../../uploads');
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = getUploadPath();
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit
    fieldSize: 100 * 1024 * 1024 // 100MB field size limit
  }
});

// Configure multer for handling multipart form data without file storage
const metadataUpload = multer();

// Get list of all models
router.get('/', modelController.getModels);

// Explicitly refresh models from APS API
router.get('/refresh', modelController.refreshModels);

// Get a test list of models for debugging
router.get('/test', modelController.getTestModels);

// Search models by filename
router.get('/search', modelController.searchModels);

// Get model details by ID
router.get('/:id', modelController.getModelById);

// Debug route to test form data (no auth)
router.post('/upload-debug', (req, res) => {
  console.log('Debug route hit (no auth)');
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  res.json({ message: 'Debug route hit', body: req.body });
});

// Debug route to test password protection only (with auth)
router.post('/auth-debug', verifyUploadPassword, (req, res) => {
  console.log('Auth debug route hit');
  console.log('Body:', req.body);
  console.log('Authentication successful!');
  res.json({ 
    message: 'Authentication successful!', 
    success: true,
    passwordProvided: !!req.body.password,
    time: new Date().toISOString()
  });
});

// Upload multiple model files - protected by password
router.post('/upload', verifyUploadPassword, upload.array('model', 10), modelController.uploadModels);

// Legacy route for single model upload (for backward compatibility) - protected by password
router.post('/upload-single', verifyUploadPassword, upload.single('model'), modelController.uploadModel);

// Translate a model to viewable format - protected by password
// Use multer to parse multipart form data for password
router.post('/:id/translate', metadataUpload.none(), (req, res, next) => {
  console.log('TRANSLATE - Request to translate model ID:', req.params.id);
  console.log('TRANSLATE - Content-Type:', req.headers['content-type']);
  console.log('TRANSLATE - Body after parsing:', req.body);
  console.log('TRANSLATE - Headers:', JSON.stringify(req.headers, null, 2));
  next();
}, verifyUploadPassword, modelController.translateModel);

// Check translation status
router.get('/:id/status', modelController.getTranslationStatus);

// Get shareable link for a model
router.get('/:id/share', modelController.getShareableLink);

// Load a model by URN - REMOVED

// Delete a model - protected by password
router.delete('/:id', metadataUpload.none(), (req, res, next) => {
  console.log('DELETE /:id - Content-Type:', req.headers['content-type']);
  console.log('DELETE /:id - Headers:', JSON.stringify(req.headers, null, 2));
  console.log('DELETE /:id - Body after parsing:', req.body);
  console.log('DELETE /:id - Params:', req.params);
  next();
}, verifyUploadPassword, modelController.deleteModel);

// Update model metadata - use multer to handle multipart form data
router.patch('/:id/metadata', metadataUpload.none(), (req, res, next) => {
  console.log('PATCH /:id/metadata - Content-Type:', req.headers['content-type']);
  console.log('PATCH /:id/metadata - Body after parsing:', req.body);
  console.log('PATCH /:id/metadata - Params:', req.params);
  
  // Ensure the body contains expected fields
  if (req.body.displayName === undefined && 
      req.body.description === undefined && 
      req.body.tags === undefined && 
      req.body.category === undefined) {
    console.warn('No valid metadata fields found in request body');
  }
  
  next();
}, verifyUploadPassword, modelController.updateModelMetadata);

// Alternative route for updating model - also updates metadata
router.patch('/:id', metadataUpload.none(), (req, res, next) => {
  console.log('PATCH /:id - Content-Type:', req.headers['content-type']);
  console.log('PATCH /:id - Body after parsing:', req.body);
  console.log('PATCH /:id - Params:', req.params);
  
  // Ensure the body contains expected fields
  if (req.body.displayName === undefined && 
      req.body.description === undefined && 
      req.body.tags === undefined && 
      req.body.category === undefined) {
    console.warn('No valid metadata fields found in request body');
  }
  
  next();
}, verifyUploadPassword, modelController.updateModelMetadata);

module.exports = router;