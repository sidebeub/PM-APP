// Use custom axios implementation for packaged app
const axios = require('./axiosCustom');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// APS API Constants
const BASE_URL = 'https://developer.api.autodesk.com';
const AUTH_URL = `${BASE_URL}/authentication/v2/token`;
const BUCKET_URL = `${BASE_URL}/oss/v2/buckets`;
const OSS_URL = `${BASE_URL}/oss/v2`;
const MODEL_DERIVATIVE_URL = `${BASE_URL}/modelderivative/v2/designdata`;

/**
 * Get a 2-legged access token (public token)
 * This is used for viewing models
 */
exports.getPublicToken = async () => {
  try {
    // Create authorization header with Base64 encoded credentials
    const credentials = `${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    console.log('Getting public token with credentials...');
    
    // Use direct HTTP request for more control when using custom Axios
    const http = require('https');
    const querystring = require('querystring');
    
    return new Promise((resolve, reject) => {
      // Build the request data
      const postData = querystring.stringify({
        'grant_type': 'client_credentials',
        'scope': 'viewables:read'
      });
      
      // Configure the request
      const options = {
        hostname: 'developer.api.autodesk.com',
        port: 443,
        path: '/authentication/v2/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      // Send the request
      const req = http.request(options, (res) => {
        let data = '';
        
        // Get the data
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        // Process the response
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              console.log('Token received successfully');
              resolve(parsed);
            } catch (e) {
              console.error('Error parsing token response:', e);
              reject(new Error('Invalid token response format'));
            }
          } else {
            console.error('Auth Error:', res.statusCode, data);
            reject(new Error(`Authentication failed: ${res.statusCode}`));
          }
        });
      });
      
      // Handle request errors
      req.on('error', (e) => {
        console.error('Request error:', e);
        reject(e);
      });
      
      // Send the request body
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('Error in getPublicToken:', error.message);
    throw error;
  }
};

/**
 * Get an access token with broader permissions
 * This is used for data management and model derivative operations
 */
exports.getInternalToken = async () => {
  try {
    // Create authorization header with Base64 encoded credentials
    const credentials = `${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    console.log('Getting internal token with credentials...');
    
    // Use direct HTTP request for more control when using custom Axios
    const http = require('https');
    const querystring = require('querystring');
    
    return new Promise((resolve, reject) => {
      // Build the request data
      const postData = querystring.stringify({
        'grant_type': 'client_credentials',
        'scope': 'data:read data:write data:create bucket:create bucket:read bucket:update'
      });
      
      // Configure the request
      const options = {
        hostname: 'developer.api.autodesk.com',
        port: 443,
        path: '/authentication/v2/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      // Send the request
      const req = http.request(options, (res) => {
        let data = '';
        
        // Get the data
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        // Process the response
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              console.log('Internal token received successfully');
              resolve(parsed);
            } catch (e) {
              console.error('Error parsing token response:', e);
              reject(new Error('Invalid token response format'));
            }
          } else {
            console.error('Auth Error:', res.statusCode, data);
            reject(new Error(`Authentication failed: ${res.statusCode}`));
          }
        });
      });
      
      // Handle request errors
      req.on('error', (e) => {
        console.error('Request error:', e);
        reject(e);
      });
      
      // Send the request body
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('Error in getInternalToken:', error.message);
    throw error;
  }
};

/**
 * Get an access token from an authorization code (3-legged OAuth)
 */
exports.getAccessTokenFromCode = async (code) => {
  try {
    // Create authorization header with Base64 encoded credentials
    const credentials = `${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    // Get the base URL for redirect
    const baseUrl = process.env.BASE_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3002'}`;
    const redirectUri = `${baseUrl}/api/auth/callback`;
    
    // Use direct HTTP request for more control when using custom Axios
    const http = require('https');
    const querystring = require('querystring');
    
    return new Promise((resolve, reject) => {
      // Build the request data
      const postData = querystring.stringify({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirectUri
      });
      
      // Configure the request
      const options = {
        hostname: 'developer.api.autodesk.com',
        port: 443,
        path: '/authentication/v2/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      // Send the request
      const req = http.request(options, (res) => {
        let data = '';
        
        // Get the data
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        // Process the response
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (e) {
              reject(new Error('Invalid token response format'));
            }
          } else {
            reject(new Error(`Authentication failed: ${res.statusCode}`));
          }
        });
      });
      
      // Handle request errors
      req.on('error', (e) => {
        reject(e);
      });
      
      // Send the request body
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('Error in getAccessTokenFromCode:', error);
    throw error;
  }
};

/**
 * Create a bucket if it doesn't exist
 */
exports.createBucketIfNotExists = async (bucketKey) => {
  try {
    console.log('Getting token for bucket operations...');
    const token = await this.getInternalToken();
    console.log('Token received for bucket operations');
    
    // Try to get the bucket details
    try {
      console.log(`Checking if bucket ${bucketKey} exists...`);
      
      const response = await axios.get(`${BUCKET_URL}/${bucketKey}/details`, {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      
      console.log('Bucket exists, no need to create it', response.status);
      // Bucket exists, no need to create it
      return { bucketKey };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`Bucket ${bucketKey} doesn't exist, creating it...`);
        
        // Bucket doesn't exist, create it
        const bucketData = {
          bucketKey,
          policyKey: 'transient' // 24 hours retention
        };
        
        try {
          const response = await axios.post(BUCKET_URL, bucketData, {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Bucket created successfully');
          return response.data;
        } catch (createError) {
          console.error('Error creating bucket:', createError.message);
          if (createError.response) {
            console.error('Status:', createError.response.status);
            console.error('Response data:', createError.response.data);
          }
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }
      } else {
        console.error('Error checking bucket:', error.message);
        if (error.response) {
          console.error('Status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw new Error(`Failed to check bucket existence: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error in createBucketIfNotExists:', error.message);
    console.error(error.stack);
    throw error;
  }
};

/**
 * Upload a file to OSS using the new Direct-to-S3 approach
 */
exports.uploadFile = async (bucketKey, objectKey, filePath) => {
  try {
    console.log('Getting token for file upload...');
    const token = await this.getInternalToken();
    console.log('Token received for file upload');
    
    // Check if file exists and can be read
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    
    console.log(`Reading file ${filePath}...`);
    const fileContent = fs.readFileSync(filePath);
    const fileSize = fileContent.length;
    console.log(`File read successfully, size: ${fileSize} bytes`);
    
    // Step 1: Generate a signed URL for upload
    console.log(`Generating signed URL for S3 upload...`);
    const signedUrlResponse = await axios.get(
      `${OSS_URL}/buckets/${bucketKey}/objects/${objectKey}/signeds3upload`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      }
    );
    
    console.log('Signed URL generated successfully');
    const signedUrl = signedUrlResponse.data.urls[0];
    console.log(`Signed URL: ${signedUrl}`);
    
    // Step 2: Upload the file to S3 using the signed URL
    console.log(`Uploading file to S3 using signed URL...`);
    try {
      await axios.put(
        signedUrl,
        fileContent,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': fileSize
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      console.log(`File upload to S3 successful - size: ${fileSize} bytes`);
    } catch (error) {
      console.error('Error uploading to S3:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
    
    console.log('File uploaded to S3 successfully');
    
    // Step 3: Complete the upload
    console.log(`Completing S3 upload...`);
    const completeResponse = await axios.post(
      `${OSS_URL}/buckets/${bucketKey}/objects/${objectKey}/signeds3upload`,
      {
        uploadKey: signedUrlResponse.data.uploadKey
      },
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Upload completed successfully');
    console.log('Complete response:', completeResponse.data);
    
    // Get the object ID from the response
    const objectId = completeResponse.data.objectId;
    // Convert object ID to Base64 (urn) for Model Derivative API
    const urn = Buffer.from(objectId).toString('base64');
    
    console.log(`Object ID: ${objectId}`);
    console.log(`URN: ${urn}`);
    
    return {
      objectId,
      urn,
      bucketKey,
      objectKey
    };
  } catch (error) {
    console.error('Error in uploadFile:', error.message);
    console.error(error.stack);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Translate a model to viewable format
 */
exports.translateModel = async (urn) => {
  try {
    console.log('Getting token for model translation...');
    const token = await this.getInternalToken();
    console.log('Token received for model translation');
    
    const translateData = {
      input: {
        urn
      },
      output: {
        formats: [
          {
            type: 'svf2',
            views: ['2d', '3d'],
            advanced: {
              generateMasterViews: true,
              fcpOptimization: true
            }
          }
        ]
      }
    };
    
    console.log('Translation request data:', JSON.stringify(translateData, null, 2));
    console.log(`Posting to ${MODEL_DERIVATIVE_URL}/job`);
    
    const response = await axios.post(
      `${MODEL_DERIVATIVE_URL}/job`,
      translateData,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Translation job started successfully');
    console.log('Translation response:', response.data);
    
    return {
      urn,
      job: response.data
    };
  } catch (error) {
    console.error('Error translating model:', error.message);
    console.error(error.stack);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Get the translation status of a model
 */
exports.getTranslationStatus = async (urn) => {
  try {
    const token = await this.getInternalToken();
    
    const response = await axios.get(
      `${MODEL_DERIVATIVE_URL}/${urn}/manifest`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      }
    );
    
    return {
      status: response.data.status,
      progress: response.data.progress,
      derivatives: response.data.derivatives
    };
  } catch (error) {
    console.error('Error getting translation status:', error);
    throw error;
  }
};

/**
 * Get all viewable details for a model
 */
exports.getViewableDetails = async (urn) => {
  try {
    const token = await this.getInternalToken();
    
    const response = await axios.get(
      `${MODEL_DERIVATIVE_URL}/${urn}/metadata`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting viewable details:', error);
    throw error;
  }
};

/**
 * List all buckets owned by the application with pagination support
 */
exports.listBuckets = async () => {
  try {
    console.log('Getting token for listing buckets...');
    const token = await this.getInternalToken();
    console.log('Token received for listing buckets');
    
    let allBuckets = [];
    let nextPage = null;
    let page = 1;
    
    // Get all pages of results
    do {
      // Build URL with pagination
      let url = `${BUCKET_URL}?limit=100`; // Request maximum items per page
      if (nextPage) {
        // If we have a next page token, add it to the URL
        url = nextPage;
      }
      
      console.log(`Fetching page ${page} of buckets...`);
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      
      // Add items to our collection
      if (response.data.items && response.data.items.length > 0) {
        allBuckets = allBuckets.concat(response.data.items);
        console.log(`Found ${response.data.items.length} buckets on page ${page}`);
      }
      
      // Check if there's another page
      nextPage = response.data.next;
      page++;
      
    } while (nextPage); // Continue until no more pages
    
    console.log(`Found ${allBuckets.length} total buckets`);
    return allBuckets;
  } catch (error) {
    console.error('Error listing buckets:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * List all objects in a bucket with pagination support
 */
exports.listObjects = async (bucketKey) => {
  try {
    console.log(`Getting token for listing objects in bucket ${bucketKey}...`);
    const token = await this.getInternalToken();
    console.log('Token received for listing objects');
    
    let allItems = [];
    let nextPage = null;
    let page = 1;
    
    // Get all pages of results
    do {
      // Build URL with pagination
      let url = `${BUCKET_URL}/${bucketKey}/objects?limit=100`; // Request maximum items per page
      if (nextPage) {
        // If we have a next page token, add it to the URL
        url = nextPage;
      }
      
      console.log(`Fetching page ${page} of objects...`);
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      
      // Add items to our collection
      if (response.data.items && response.data.items.length > 0) {
        allItems = allItems.concat(response.data.items);
        console.log(`Found ${response.data.items.length} objects on page ${page}`);
      }
      
      // Check if there's another page
      nextPage = response.data.next;
      page++;
      
    } while (nextPage); // Continue until no more pages
    
    console.log(`Found ${allItems.length} total objects in bucket ${bucketKey}`);
    return allItems;
  } catch (error) {
    console.error(`Error listing objects in bucket ${bucketKey}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Get object details
 */
exports.getObjectDetails = async (bucketKey, objectKey) => {
  try {
    console.log(`Getting token for object details ${bucketKey}/${objectKey}...`);
    const token = await this.getInternalToken();
    console.log('Token received for object details');
    
    const response = await axios.get(
      `${BUCKET_URL}/${bucketKey}/objects/${objectKey}/details`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      }
    );
    
    console.log(`Got details for object ${objectKey}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting object details for ${bucketKey}/${objectKey}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Get model by search term - direct API implementation
 * 
 * This function helps find models by searching through the objects in the bucket
 */
exports.searchModels = async (searchTerm) => {
  try {
    console.log(`Searching for models containing "${searchTerm}"...`);
    
    // Create bucket key from client ID
    const bucketKey = 'aps_viewer_app_' + process.env.APS_CLIENT_ID.toLowerCase().replace(/[^0-9a-z]/g, '');
    
    // Get all objects from the bucket
    const objects = await this.listObjects(bucketKey);
    console.log(`Searching through ${objects.length} objects...`);
    
    // Filter objects by search term
    const matchingObjects = objects.filter(object => {
      // Search in objectKey which includes the filename
      return object.objectKey.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    console.log(`Found ${matchingObjects.length} matching models`);
    
    // Convert to consistent model format
    const models = matchingObjects.map(object => {
      // Extract objectKey and get filename
      const objectKey = object.objectKey;
      
      // Handle filename extraction
      let fileName = objectKey;
      const underscoreIndex = objectKey.indexOf('_');
      if (underscoreIndex > -1) {
        fileName = objectKey.substring(underscoreIndex + 1);
      }
      
      // Extract the URN from objectId
      const objectId = object.objectId;
      const urn = Buffer.from(objectId).toString('base64');
      
      return {
        id: objectKey,
        objectId,
        fileName,
        bucketKey,
        objectKey,
        urn,
        status: 'unknown', // We don't check status for search results
        uploadedAt: new Date().toISOString(),
        description: ''
      };
    });
    
    return models;
  } catch (error) {
    console.error('Error searching models:', error.message);
    throw error;
  }
};

/**
 * Get all models from all Autodesk sources, not just the app bucket
 */
exports.getAllModels = async () => {
  try {
    console.log('Getting list of all models from Autodesk Platform Services...');
    
    // Initialize array for models 
    const allModels = [];
    const forceRefresh = process.env.FORCE_REFRESH === 'true';
    
    // OPTION 1: First check for models in Autodesk buckets (for newly uploaded models)
    // This ensures we always look for newly uploaded models first
    console.log('Checking buckets for newly uploaded models...');
    try {
      const bucketKey = 'aps_viewer_app_' + process.env.APS_CLIENT_ID.toLowerCase().replace(/[^0-9a-z]/g, '');
      console.log(`Checking main application bucket: ${bucketKey}`);
      
      // Ensure bucket exists (it will be created if not)
      await this.createBucketIfNotExists(bucketKey);
      
      // Get objects from the bucket
      const objects = await this.listObjects(bucketKey);
      console.log(`Found ${objects.length} objects in bucket ${bucketKey}`);
      
      // Process and add models from the bucket
      if (objects && objects.length > 0) {
        for (const object of objects) {
          try {
            // Extract object properties
            const objectKey = object.objectKey;
            
            // Handle filename extraction
            let fileName = objectKey;
            const lastSlashIndex = objectKey.lastIndexOf('/');
            if (lastSlashIndex > -1) {
              fileName = objectKey.substring(lastSlashIndex + 1);
            }
            
            // Create URN from objectId
            const objectId = object.objectId;
            const urn = Buffer.from(objectId).toString('base64');
            
            // Create model object
            const model = {
              id: objectKey,
              objectId,
              fileName,
              bucketKey,
              objectKey,
              urn,
              status: 'ready', // Default status
              uploadedAt: object.lastModifiedDate || new Date().toISOString(),
              description: `Model from bucket: ${bucketKey}`,
              source: 'bucket' // Mark the source
            };
            
            // Try to verify model status (if possible)
            try {
              const status = await this.getTranslationStatus(urn);
              if (status) {
                model.status = status.status === 'success' ? 'ready' : status.status;
              }
            } catch (statusError) {
              console.log(`Could not verify status for model ${fileName}`);
            }
            
            // Add to collection
            allModels.push(model);
            console.log(`Added model from bucket: ${fileName}`);
          } catch (err) {
            console.error(`Error processing bucket object:`, err.message);
          }
        }
      }
    } catch (bucketError) {
      console.error('Error checking bucket for models:', bucketError.message);
    }
    
    // OPTION 2: Only load models.json if no objects found in bucket or we still want those models too
    // This ensures we get previously known models even if bucket is empty
    if (allModels.length === 0 || !forceRefresh) {
      console.log('Loading models from models.json as well');
      try {
        const modelsPath = path.join(__dirname, '../../models.json');
        if (fs.existsSync(modelsPath)) {
          const localModelsData = fs.readFileSync(modelsPath, 'utf8');
          const localModels = JSON.parse(localModelsData);
          
          if (Array.isArray(localModels) && localModels.length > 0) {
            console.log(`Found ${localModels.length} models in local models.json file`);
            
            // Keep track of URNs we already have to avoid duplicates
            const existingUrns = new Set(allModels.map(m => m.urn));
            
            // Add these models to our collection if we don't already have them
            for (const model of localModels) {
              if (!existingUrns.has(model.urn)) {
                allModels.push({
                  ...model,
                  source: 'local_json' // Mark the source
                });
                existingUrns.add(model.urn);
              }
            }
            
            console.log(`Added models from models.json file (after filtering duplicates)`);
          }
        }
      } catch (jsonError) {
        console.error('Error loading models from models.json:', jsonError.message);
      }
    }
    
    // STRATEGY 1: Check hubs and projects directly (Data Management API approach)
    try {
      console.log('Checking for models in Autodesk Hubs and Projects...');
      // Note: Implementing Data Management API integration would require additional OAuth flow
      // This is a placeholder for a more comprehensive APS integration
    } catch (hubError) {
      console.error('Error checking hubs:', hubError.message);
    }
    
    // STRATEGY 2: Check all buckets in OSS
    try {
      console.log('Fetching all buckets in the Autodesk account...');
      const buckets = await this.listBuckets();
      
      if (buckets && buckets.length > 0) {
        console.log(`Found ${buckets.length} buckets in Autodesk account`);
        
        for (const bucket of buckets) {
          try {
            const bucketKey = bucket.bucketKey;
            console.log(`Fetching objects from bucket: ${bucketKey}`);
            
            // List objects in this bucket
            const objects = await this.listObjects(bucketKey);
            console.log(`Found ${objects.length} objects in bucket ${bucketKey}`);
            
            // Process each object in the bucket
            for (const object of objects) {
              try {
                // Extract objectKey and get filename
                const objectKey = object.objectKey;
                
                // Handle filename extraction safely
                let fileName = objectKey;
                const lastSlashIndex = objectKey.lastIndexOf('/');
                if (lastSlashIndex > -1) {
                  fileName = objectKey.substring(lastSlashIndex + 1);
                }
                
                // Remove timestamp prefix if it exists
                const underscoreIndex = fileName.indexOf('_');
                if (underscoreIndex > -1) {
                  // Check if characters before underscore are numeric
                  const possibleTimestamp = fileName.substring(0, underscoreIndex);
                  if (/^\d+$/.test(possibleTimestamp)) {
                    fileName = fileName.substring(underscoreIndex + 1);
                  }
                }
                
                // Extract the URN from objectId
                const objectId = object.objectId;
                const urn = Buffer.from(objectId).toString('base64');
                
                // Create unique ID combining bucket and object
                const id = `${bucketKey}__${objectKey}`.replace(/[\/\s]/g, '_');
                
                // Assume all models are ready to view
                const status = 'ready';
                
                // Create model object
                const model = {
                  id: id,
                  objectId,
                  fileName,
                  bucketKey,
                  objectKey,
                  urn,
                  status,
                  uploadedAt: object.lastModifiedDate || new Date().toISOString(),
                  description: '' // Default empty description
                };
                
                allModels.push(model);
              } catch (objectError) {
                console.error(`Error processing object ${object.objectKey}:`, objectError.message);
                // Continue with next object
              }
            }
          } catch (bucketError) {
            console.error(`Error processing bucket ${bucket.bucketKey}:`, bucketError.message);
            // Continue with next bucket
          }
        }
      } else {
        console.log('No buckets found in Autodesk account, trying default bucket');
        
        // Try with the default app bucket as a fallback
        const bucketKey = 'aps_viewer_app_' + process.env.APS_CLIENT_ID.toLowerCase().replace(/[^0-9a-z]/g, '');
        console.log(`Trying default app bucket: ${bucketKey}`);
        
        // Create this bucket if it doesn't exist
        try {
          await this.createBucketIfNotExists(bucketKey);
          console.log(`Default bucket ${bucketKey} verified or created`);
          
          // Look for objects in this bucket after ensuring it exists
          const objects = await this.listObjects(bucketKey);
          console.log(`Found ${objects.length} objects in default bucket ${bucketKey}`);
          
          // Process each object in default bucket
          for (const object of objects) {
            try {
              // Extract objectKey and get filename
              const objectKey = object.objectKey;
              
              // Handle filename extraction safely
              let fileName = objectKey;
              const underscoreIndex = objectKey.indexOf('_');
              if (underscoreIndex > -1) {
                fileName = objectKey.substring(underscoreIndex + 1); // Remove timestamp prefix
              }
              
              // Extract the URN from objectId
              const objectId = object.objectId;
              const urn = Buffer.from(objectId).toString('base64');
              
              // Assume all models are ready to view
              const status = 'ready';
              
              // Create model object
              const model = {
                id: objectKey, // Use objectKey as ID to avoid issues
                objectId,
                fileName,
                bucketKey,
                objectKey,
                urn,
                status,
                uploadedAt: new Date().toISOString(),
                description: '' // Default empty description
              };
              
              allModels.push(model);
            } catch (objectError) {
              console.error(`Error processing object ${object.objectKey}:`, objectError.message);
              // Continue with next object
            }
          }
        } catch (bucketError) {
          console.error(`Error with default bucket operations:`, bucketError.message);
        }
      }
    } catch (bucketsError) {
      console.error('Error fetching buckets:', bucketsError.message);
    }
    
    // STRATEGY 3: Check Model Derivative Service for translated models
    try {
      console.log('Checking for translated models in Model Derivative Service...');
      // Note: This would require implementing additional APS API calls to the Model Derivative service
      // This is a placeholder for a more comprehensive APS integration
    } catch (derivativeError) {
      console.error('Error checking derivatives:', derivativeError.message);
    }
    
    // If no models found, try to load models from the local models.json file
    if (allModels.length === 0) {
      console.log('No models found in any Autodesk source or bucket, trying local models.json');
      try {
        // Try to load models from models.json in project root
        const modelsPath = path.join(__dirname, '../../models.json');
        if (fs.existsSync(modelsPath)) {
          const localModelsData = fs.readFileSync(modelsPath, 'utf8');
          const localModels = JSON.parse(localModelsData);
          
          if (Array.isArray(localModels) && localModels.length > 0) {
            console.log(`Found ${localModels.length} models in local models.json file`);
            
            // Add these models to our collection
            localModels.forEach(model => {
              allModels.push({
                ...model,
                source: 'local_json' // Mark the source so we know these came from models.json
              });
            });
            
            console.log(`Added ${localModels.length} models from local models.json file`);
          } else {
            console.log('models.json exists but contains no models or is invalid');
          }
        } else {
          console.log('models.json not found in expected location');
        }
      } catch (jsonError) {
        console.error('Error loading models from models.json:', jsonError.message);
      }
      
      // If still no models, provide user guidance
      if (allModels.length === 0) {
        console.log('No models found in any source');
        console.log('You need to upload models to your Autodesk account or create models to view');
        console.log('To upload a model, use the upload form in the app');
      }
    }
    
    // Sort models by date (newest first)
    allModels.sort((a, b) => {
      try {
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      } catch (e) {
        return 0; // Keep original order on error
      }
    });
    
    console.log(`Processed ${allModels.length} total models from Autodesk sources`);
    
    return allModels;
  } catch (error) {
    console.error('Error getting all models:', error.message);
    // Return empty array on error to avoid using fallback models
    return [];
  }
};