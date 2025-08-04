/**
 * Middleware for password protection of specific routes
 * This is used to restrict access to premium features like file uploads
 */

// Default development password - should be overridden in production via environment variable
const defaultPassword = 'admin123';

// Get the upload password from environment variables or use the default
const uploadPassword = process.env.UPLOAD_PASSWORD || defaultPassword;

/**
 * Middleware to verify password before allowing access to protected routes
 * Password can be provided in:
 * - request body as 'password'
 * - query parameter as 'password'
 * - header as 'x-upload-password'
 */
const verifyUploadPassword = (req, res, next) => {
  console.log('\n======== PASSWORD VERIFICATION START ========');
  console.log('- Current time:', new Date().toISOString());
  console.log('- Request method:', req.method);
  console.log('- Request path:', req.path);
  console.log('- Content-Type:', req.headers['content-type']);
  
  // Debug Content-Type parsing issues
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    console.log('- Multipart form detected');
    console.log('- Expected body parser:', 'multer');
  } else if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
    console.log('- Form URL encoded detected');
    console.log('- Expected body parser:', 'express.urlencoded');
  } else if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    console.log('- JSON detected');
    console.log('- Expected body parser:', 'express.json');
  }
  
  // Check for form data issues
  if (req.body) {
    console.log('- Request body keys:', Object.keys(req.body));
    console.log('- Request body values:', Object.keys(req.body).map(key => key === 'password' ? '*****' : req.body[key]));
  } else {
    console.log('- Request body is empty or undefined');
  }

  // For multer file uploads, check the files
  if (req.file) {
    console.log('- Request contains single file (multer):', req.file.originalname);
  } else if (req.files && Array.isArray(req.files)) {
    console.log('- Request contains multiple files (multer):', req.files.length);
  }
  
  // Get password from request (body, query, or header)
  let providedPassword = null;
  
  // First check body (most common)
  if (req.body && req.body.password) {
    providedPassword = req.body.password;
    console.log('- Found password in request body');
  } 
  // Then check query parameters
  else if (req.query && req.query.password) {
    providedPassword = req.query.password;
    console.log('- Found password in query parameters');
  } 
  // Check headers (custom header)
  else if (req.headers && req.headers['x-upload-password']) {
    providedPassword = req.headers['x-upload-password'];
    console.log('- Found password in x-upload-password header');
  }
  // Finally check raw headers
  else if (req.rawHeaders) {
    // Look for our password header in raw headers (case insensitive)
    for (let i = 0; i < req.rawHeaders.length - 1; i += 2) {
      const headerName = req.rawHeaders[i].toLowerCase();
      if (headerName === 'x-upload-password') {
        providedPassword = req.rawHeaders[i + 1];
        console.log('- Found password in raw headers');
        break;
      }
    }
  }
  
  console.log('- Password provided:', !!providedPassword);
  console.log('- Password from body:', !!req.body?.password);
  console.log('- Password from query:', !!req.query?.password);
  console.log('- Password from header:', !!req.headers?.['x-upload-password']);
  
  // If we don't have a password, return error
  if (!providedPassword) {
    console.log('Authentication failed: No password provided');
    console.log('======== PASSWORD VERIFICATION END ========\n');
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Password required for this operation'
    });
  }
  
  // Log detailed password info (being careful with security)
  console.log('- Expected password length:', uploadPassword.length);
  console.log('- Provided password length:', providedPassword.length);
  
  // Compare character by character to detect whitespace or invisible characters
  let mismatchPosition = -1;
  for (let i = 0; i < Math.max(providedPassword.length, uploadPassword.length); i++) {
    if (providedPassword[i] !== uploadPassword[i]) {
      mismatchPosition = i;
      break;
    }
  }
  
  if (mismatchPosition !== -1) {
    console.log('- First mismatch at position:', mismatchPosition);
    console.log('- Comparison (safe display):');
    console.log(`  Expected: ${uploadPassword.replace(/./g, '*')}`);
    console.log(`  Provided: ${providedPassword.replace(/./g, '*')}`);
    
    // Convert both to hex representation to spot invisible/special chars
    const expectedHex = Array.from(uploadPassword).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    const providedHex = Array.from(providedPassword).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    
    console.log('- Hex representation:');
    console.log(`  Expected: ${expectedHex}`);
    console.log(`  Provided: ${providedHex}`);
    
    // Try trimming whitespace as a fallback
    const trimmedPassword = providedPassword.trim();
    console.log('- Trying trimmed password as fallback');
    console.log('- Trimmed password length:', trimmedPassword.length);
    
    if (trimmedPassword === uploadPassword) {
      console.log('- Trimmed password matches!');
      console.log('- Password verification successful after trimming whitespace');
      console.log('======== PASSWORD VERIFICATION END ========\n');
      // Proceed to the next middleware
      return next();
    }
    
    // Try comparing case-insensitively as a last resort
    if (providedPassword.toLowerCase() === uploadPassword.toLowerCase()) {
      console.log('- Case-insensitive match! Using case-insensitive comparison as fallback');
      console.log('- Password verification successful with case-insensitive matching');
      console.log('======== PASSWORD VERIFICATION END ========\n');
      // Proceed to the next middleware
      return next();
    }
    
    // Password doesn't match even after attempts
    console.log('Authentication failed: Incorrect password');
    console.log('======== PASSWORD VERIFICATION END ========\n');
    return res.status(403).json({ 
      error: 'Authentication failed',
      message: 'Invalid password - please check for typos, extra spaces, or case sensitivity'
    });
  }
  
  // Password matches exactly
  console.log('- Password verification successful');
  console.log('======== PASSWORD VERIFICATION END ========\n');
  
  // Password matches, proceed to the next middleware/route handler
  next();
};

module.exports = {
  verifyUploadPassword
};