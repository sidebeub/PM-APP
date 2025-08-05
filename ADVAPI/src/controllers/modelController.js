const fs = require('fs');
const path = require('path');
const apsService = require('../services/apsService');
const dbService = require('../services/dbService');

// Path for model metadata storage (as fallback)
const modelMetadataPath = path.join(__dirname, '../data/model_metadata.json');

// Load model metadata from file as fallback
let modelMetadata = {};
try {
  // Check if file exists
  if (fs.existsSync(modelMetadataPath)) {
    const data = fs.readFileSync(modelMetadataPath, 'utf8');
    modelMetadata = JSON.parse(data);
    console.log(`Loaded metadata for ${Object.keys(modelMetadata).length} models`);
  } else {
    // Create the file if it doesn't exist
    fs.writeFileSync(modelMetadataPath, '{}');
    console.log('Created new model metadata storage file');
  }
} catch (error) {
  console.error('Error loading model metadata from file:', error);
  // Continue with empty metadata object
}

/**
 * Get all models
 */
exports.getModels = async (req, res) => {
  try {
    console.log('Fetching all models...');
    
    // Start with an empty array - only use real models from Autodesk or database
    let models = [];
    
    // Check if we should force a refresh from APS API
    const forceRefresh = req.query.refresh === 'true';
    
    // Database connection flag
    let dbConnected = false;
    let apiSuccess = false;
    
    // IMPORTANT: We are only using the database for storage, NOT models.json
    console.log('Using database as the sole source of model information...');
    
    // Step 2: Try to get models from database (if the above failed)
    try {
      // Check if database is connected - async operation now
      const isDbConnected = await dbService.isConnected();
      console.log('KBOM Debug: Database connection status:', isDbConnected);
      if (isDbConnected) {
        dbConnected = true;
        console.log('Database is connected, fetching models...');
        const dbModels = await dbService.getAllModels();
        
        if (dbModels && dbModels.length > 0) {
          console.log(`Retrieved ${dbModels.length} models from database`);
          
          // Check if KBOM table exists
          let kbomTableExists = false;
          let kbomService;
          try {
            console.log('KBOM Debug: Checking if KBOM table exists...');
            kbomService = require('../services/kbomService');
            kbomTableExists = await kbomService.checkKbomTableExists();
            console.log('KBOM Debug: KBOM table exists:', kbomTableExists);
          } catch (kbomError) {
            console.error('Error checking KBOM table:', kbomError);
          }
          
          // Transform database models to match API format
          console.log('KBOM Debug: Processing', dbModels.length, 'models from database');
          const formattedDbModels = await Promise.all(dbModels.map(async model => {
            const formattedModel = {
              id: model.id,
              objectId: model.object_id,
              fileName: model.file_name,
              displayName: model.display_name,
              description: model.description,
              bucketKey: model.bucket_key,
              objectKey: model.object_key,
              urn: model.urn,
              status: model.status,
              uploadedAt: model.uploaded_at.toISOString(),
              tags: model.tags,
              category: model.category,
              source: 'database' // Mark the source as database
            };
            
            // Add KBOM data if available
            if (kbomTableExists && kbomService && model.file_name) {
              try {
                console.log(`KBOM Debug: Looking for KBOM data for model "${model.file_name}"`);
                const relatedKboms = await kbomService.findRelatedKboms(model.file_name);
                
                if (relatedKboms && relatedKboms.length > 0) {
                  // Add the related KBOMs to the model response
                  formattedModel.kboms = relatedKboms;
                  
                  // Extract unique customers, sales orders, work order numbers, and source files for easier display
                  const customers = new Set();
                  const salesOrders = new Set();
                  const workOrders = new Set();
                  const sourceFiles = new Set();
                  
                  relatedKboms.forEach(kbom => {
                    if (kbom.customer) customers.add(kbom.customer);
                    if (kbom.so) salesOrders.add(kbom.so);
                    if (kbom.wo_number) workOrders.add(kbom.wo_number);
                    if (kbom.source_file) sourceFiles.add(kbom.source_file);
                  });
                  
                  formattedModel.relatedCustomers = Array.from(customers);
                  formattedModel.relatedSalesOrders = Array.from(salesOrders);
                  formattedModel.relatedWorkOrders = Array.from(workOrders);
                  formattedModel.relatedSourceFiles = Array.from(sourceFiles);
                  
                }
              } catch (kbomError) {
                console.error(`Error getting KBOM data for model ${model.id}:`, kbomError);
              }
            }
            
            return formattedModel;
          }));
          
          // Add database models to the list
          models = models.concat(formattedDbModels);
          
          // If we got models from the database and NOT forcing a refresh, we can skip the API call
          if (!forceRefresh) {
            console.log('Using database as source of truth, skipping API call');
            
            // Use database models exclusively if we have them
            if (formattedDbModels.length > 0) {
              // Use only database models
              models = formattedDbModels;
              console.log(`Using ${models.length} models from database only (database is primary source)`);
              
              // Set apiSuccess flag to false so we don't try to replace these models
              apiSuccess = false;
            }
          }
        } else {
          console.log('No models found in database, will try APS API');
        }
      } else {
        console.log('Database not connected, skipping database fetch');
        // Set flag to indicate we need to try other sources
        dbConnected = false;
      }
    } catch (dbError) {
      console.error('Error fetching models from database:', dbError.message);
      // Set flag to indicate error with database
      dbConnected = false;
    }
    
    // Step 2: Check from APS API if needed
    // Conditions to check API:
    // 1. Force refresh is requested
    // 2. No models found in database (or only test models)
    // 3. Database is not connected
    if (forceRefresh || (models.length <= 3) || !dbConnected) {
      try {
        console.log('Fetching models from APS API (all buckets)...');
        const apiModels = await apsService.getAllModels();
        
        if (apiModels && Array.isArray(apiModels) && apiModels.length > 0) {
          console.log(`APS API returned ${apiModels.length} models`);
          apiSuccess = true;
          
          // Store models in database if connected
          if (dbConnected) {
            try {
              console.log('Storing API models in database...');
              await dbService.storeModelsFromAPS(apiModels);
              console.log('Successfully stored models in database');
            } catch (storeError) {
              console.error('Error storing API models in database:', storeError.message);
            }
          } else {
            console.log('Database not connected, skipping storage');
            
            // Store metadata in file as fallback
            try {
              console.log('Storing model metadata in file as fallback...');
              for (const model of apiModels) {
                if (!modelMetadata[model.id]) {
                  modelMetadata[model.id] = {};
                }
                
                // Set basic metadata
                modelMetadata[model.id].displayName = model.displayName || model.fileName;
                modelMetadata[model.id].description = model.description || '';
                modelMetadata[model.id].lastUpdated = new Date().toISOString();
              }
              
              // Save metadata file
              const dir = path.dirname(modelMetadataPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(modelMetadataPath, JSON.stringify(modelMetadata, null, 2));
              console.log(`Stored metadata for ${Object.keys(modelMetadata).length} models in file`);
            } catch (fileError) {
              console.error('Error storing metadata in file:', fileError.message);
            }
          }
          
          // If this is a force refresh or we have no database models, replace the models array
          if (forceRefresh || (models.length <= 3)) {
            // On force refresh, completely replace the models array
            if (forceRefresh) {
              models = [...apiModels];
              console.log('Force refresh: replaced models array with API results');
            } else {
              // Add API models if they're not already in the list
              const existingIds = new Set(models.map(m => m.id));
              const newApiModels = apiModels.filter(m => !existingIds.has(m.id));
              
              if (newApiModels.length > 0) {
                console.log(`Adding ${newApiModels.length} new models from API to result`);
                models = models.concat(newApiModels);
              }
            }
          }
        } else {
          console.log('No models returned from APS API');
        }
      } catch (apiError) {
        console.error('API Error in getAllModels:', apiError.message);
      }
    }
    
    // Only use real models from Autodesk or database, and sample models if needed
    console.log(`Found ${models.length} models from Autodesk or database`);
    
    // If no models found, we're returning whatever comes from the API
    // This could include sample models if the API added them
    if (models.length === 0) {
      console.log('No models found from Autodesk or database, will use samples if available');
    }
    
    // Remove any duplicates by ID
    const uniqueModels = [];
    const seenIds = new Set();
    
    for (const model of models) {
      if (!seenIds.has(model.id)) {
        uniqueModels.push(model);
        seenIds.add(model.id);
      }
    }
    
    // Sort by upload date (newest first)
    uniqueModels.sort((a, b) => {
      try {
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      } catch (e) {
        return 0;
      }
    });
    
    console.log(`Returning ${uniqueModels.length} unique models`);
    res.json(uniqueModels);
  } catch (error) {
    console.error('Error getting models:', error);
    console.error('Error stack:', error.stack);
    // Return empty array on error to avoid breaking the frontend
    res.json([]);
  }
};

/**
 * Explicitly refresh models from APS (all buckets and all models)
 */
exports.refreshModels = async (req, res) => {
  try {
    console.log('Explicitly refreshing models from APS API (all buckets)...');
    
    // Get models directly from APS API (enhanced function checks all buckets)
    const apiModels = await apsService.getAllModels();
    
    if (!apiModels || !Array.isArray(apiModels)) {
      return res.status(500).json({ 
        error: 'Failed to fetch models from APS API',
        message: 'API returned invalid data'
      });
    }
    
    console.log(`APS API returned ${apiModels.length} models from all buckets`);
    
    // Prioritize database storage with improved reliability
    let storageSuccess = false;
    
    // First, try to store models in database with retry
    if (dbService.isConnected()) {
      try {
        console.log(`Storing ${apiModels.length} models in database using transaction...`);
        const dbSuccess = await dbService.storeModelsFromAPS(apiModels);
        
        if (dbSuccess) {
          console.log(`Successfully stored ${apiModels.length} models in database`);
          storageSuccess = true;
          
          // Also update models.json as a backup/cache but only after database success
          try {
            // Use the atomic file operation approach
            const modelsDir = path.join(__dirname, '../../');
            const modelsPath = path.join(modelsDir, 'models.json');
            const tempPath = path.join(modelsDir, `.models.json.tmp.${Date.now()}`);
            
            // Write to temp file first
            fs.writeFileSync(tempPath, JSON.stringify(apiModels, null, 2));
            
            // Rename temp file to target file (atomic operation)
            fs.renameSync(tempPath, modelsPath);
            
            console.log(`Updated models.json backup with ${apiModels.length} models`);
          } catch (jsonError) {
            console.error('Error updating models.json backup:', jsonError.message);
            // Continue anyway as the database is our source of truth
          }
        } else {
          console.error('Database storeModelsFromAPS returned false, storage may have failed');
        }
      } catch (dbError) {
        console.error('Error storing models in database:', dbError.message);
        console.log('Will fall back to file storage');
      }
    } else {
      console.log('Database not connected, will use file storage as fallback');
    }
    
    // Store in file storage as fallback if database storage failed
    if (!storageSuccess) {
      console.log('Using file storage as fallback for model metadata');
      
      // Create metadata entries for each model
      for (const model of apiModels) {
        if (!modelMetadata[model.id]) {
          modelMetadata[model.id] = {};
        }
        
        // Set basic metadata
        modelMetadata[model.id].displayName = model.displayName || model.fileName;
        modelMetadata[model.id].description = model.description || '';
        modelMetadata[model.id].lastUpdated = new Date().toISOString();
      }
      
      // Save metadata file
      const dir = path.dirname(modelMetadataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Use atomic file operation for metadata too
      try {
        const tempPath = path.join(dir, `.model_metadata.json.tmp.${Date.now()}`);
        fs.writeFileSync(tempPath, JSON.stringify(modelMetadata, null, 2));
        fs.renameSync(tempPath, modelMetadataPath);
        console.log(`Stored metadata for ${Object.keys(modelMetadata).length} models in file storage`);
      } catch (writeError) {
        console.error('Error writing metadata file:', writeError.message);
      }
      
      // Also try to update models.json as our main record when database fails
      try {
        const modelsPath = path.join(__dirname, '../../models.json');
        const tempPath = path.join(path.dirname(modelsPath), `.models.json.tmp.${Date.now()}`);
        
        // Write to temp file first
        fs.writeFileSync(tempPath, JSON.stringify(apiModels, null, 2));
        
        // Rename temp file to target file (atomic operation)
        fs.renameSync(tempPath, modelsPath);
        
        console.log(`Updated models.json with ${apiModels.length} models as primary storage`);
      } catch (jsonError) {
        console.error('Error updating models.json as primary storage:', jsonError.message);
      }
    }
    
    // Format model data for response
    const formattedModels = apiModels.map(model => {
      // Start with the API model data
      const formattedModel = { ...model };
      
      // Add metadata if available from file storage
      if (modelMetadata[model.id]) {
        if (modelMetadata[model.id].displayName) {
          formattedModel.displayName = modelMetadata[model.id].displayName;
        }
        
        if (modelMetadata[model.id].description) {
          formattedModel.description = modelMetadata[model.id].description;
        }
        
        if (modelMetadata[model.id].tags) {
          formattedModel.tags = modelMetadata[model.id].tags;
        }
        
        if (modelMetadata[model.id].category) {
          formattedModel.category = modelMetadata[model.id].category;
        }
      }
      
      return formattedModel;
    });
    
    // Return success with models
    res.json({
      message: `Successfully refreshed ${apiModels.length} models from Autodesk`,
      count: apiModels.length,
      models: formattedModels,
      storedInDatabase: storageSuccess
    });
  } catch (error) {
    console.error('Error refreshing models:', error);
    res.status(500).json({ 
      error: 'Failed to refresh models',
      message: error.message
    });
  }
};

/**
 * Update model metadata
 */
exports.updateModelMetadata = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Updating metadata for model ${id}`);
    console.log('Request body:', req.body);
    
    // Extract fields from req.body
    const metadata = {
      displayName: req.body.displayName,
      description: req.body.description,
      tags: req.body.tags,
      category: req.body.category
    };
    
    // Validate input
    if (!id) {
      console.log('Missing model ID in request');
      return res.status(400).json({ error: 'Model ID is required' });
    }
    
    // Update model in database with better error handling
    try {
      console.log(`Attempting to update model metadata in database for model ${id}`, metadata);
      
      // Check if database is connected - this is an async operation now
      const isDbConnected = await dbService.isConnected();
      if (!isDbConnected) {
        console.log('Database not connected, will use file storage for update');
        throw new Error('Database not connected');
      }
      
      // Multiple attempts to update database
      let updatedModel = null;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts && !updatedModel) {
        try {
          attempts++;
          updatedModel = await dbService.updateModelMetadata(id, metadata);
          
          if (!updatedModel) {
            console.warn(`Database returned null on attempt ${attempts} for model update, model ${id} might not exist`);
            
            if (attempts < maxAttempts) {
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (attemptError) {
          console.error(`Database update attempt ${attempts} failed:`, attemptError.message);
          
          if (attempts < maxAttempts) {
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            // Re-throw on last attempt
            throw attemptError;
          }
        }
      }
      
      if (!updatedModel) {
        throw new Error(`Failed to update model ${id} in database after ${maxAttempts} attempts`);
      }
      
      // Format the response
      const formattedModel = {
        id: updatedModel.id,
        objectId: updatedModel.object_id,
        fileName: updatedModel.file_name,
        displayName: updatedModel.display_name,
        description: updatedModel.description,
        bucketKey: updatedModel.bucket_key,
        objectKey: updatedModel.object_key,
        urn: updatedModel.urn,
        status: updatedModel.status,
        uploadedAt: updatedModel.uploaded_at.toISOString(),
        tags: updatedModel.tags,
        category: updatedModel.category
      };
      
      console.log(`Successfully updated model metadata in database for model ${id}`);
      
      // Skip file-based metadata store since we're only using the database
      console.log(`Database update successful for model ${id}, not updating models.json`);
      
      // Return success response
      res.json({ 
        message: 'Model metadata updated successfully',
        id,
        metadata: formattedModel,
        source: 'database'
      });
    } catch (dbError) {
      // If database update fails, try to use file-based storage as fallback
      console.error('Error updating model in database:', dbError.message);
      
      // Log specific error details to help troubleshoot
      if (dbError.code) {
        console.error(`Database error code: ${dbError.code}`);
      }
      
      // Using file-based fallback mechanism
      console.log(`Using file-based update for model ${id} as fallback`);
      
      // Initialize metadata for this model if it doesn't exist
      if (!modelMetadata[id]) {
        console.log(`Creating new metadata entry for model ${id}`);
        modelMetadata[id] = {};
      }
      
      // Update the metadata fields
      let updated = false;
      
      if (metadata.displayName !== undefined) {
        modelMetadata[id].displayName = metadata.displayName;
        updated = true;
      }
      
      if (metadata.description !== undefined) {
        modelMetadata[id].description = metadata.description;
        updated = true;
      }
      
      if (metadata.tags !== undefined) {
        modelMetadata[id].tags = metadata.tags;
        updated = true;
      }
      
      if (metadata.category !== undefined) {
        modelMetadata[id].category = metadata.category;
        updated = true;
      }
      
      if (!updated) {
        return res.status(400).json({ error: 'No fields provided for update' });
      }
      
      // Add lastUpdated timestamp
      modelMetadata[id].lastUpdated = new Date().toISOString();
      
      // Save metadata with atomic operation
      try {
        const dir = path.dirname(modelMetadataPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write to temporary file first
        const tempPath = path.join(dir, `.model_metadata.json.tmp.${Date.now()}`);
        fs.writeFileSync(tempPath, JSON.stringify(modelMetadata, null, 2));
        
        // Rename for atomic update
        fs.renameSync(tempPath, modelMetadataPath);
        
        console.log(`Updated metadata in file storage for model ${id}`);
      } catch (fileError) {
        console.error('Error saving metadata file:', fileError.message);
        return res.status(500).json({ 
          error: 'Failed to update model metadata',
          message: `File storage error: ${fileError.message}`
        });
      }
      
      // Also try to update the model in models.json
      try {
        // Read current models.json
        const modelsPath = path.join(__dirname, '../../models.json');
        let allModels = [];
        
        if (fs.existsSync(modelsPath)) {
          try {
            const content = fs.readFileSync(modelsPath, 'utf8');
            allModels = JSON.parse(content);
            
            if (!Array.isArray(allModels)) {
              allModels = [];
            }
          } catch (readError) {
            console.error('Error reading models.json:', readError.message);
          }
        }
        
        // Find and update the model
        const modelIndex = allModels.findIndex(m => m.id === id);
        
        if (modelIndex !== -1) {
          // Update fields
          if (metadata.displayName !== undefined) {
            allModels[modelIndex].displayName = metadata.displayName;
          }
          
          if (metadata.description !== undefined) {
            allModels[modelIndex].description = metadata.description;
          }
          
          if (metadata.tags !== undefined) {
            allModels[modelIndex].tags = metadata.tags;
          }
          
          if (metadata.category !== undefined) {
            allModels[modelIndex].category = metadata.category;
          }
          
          // Save models.json with atomic operation
          const tempPath = path.join(path.dirname(modelsPath), `.models.json.tmp.${Date.now()}`);
          fs.writeFileSync(tempPath, JSON.stringify(allModels, null, 2));
          fs.renameSync(tempPath, modelsPath);
          
          console.log(`Updated model ${id} in models.json`);
        } else {
          console.warn(`Model ${id} not found in models.json`);
        }
      } catch (jsonError) {
        console.error('Error updating models.json:', jsonError.message);
      }
      
      // Get the updated model from models.json for consistent response format
      try {
        const modelsPath = path.join(__dirname, '../../models.json');
        let allModels = [];
        
        if (fs.existsSync(modelsPath)) {
          const content = fs.readFileSync(modelsPath, 'utf8');
          allModels = JSON.parse(content);
          
          if (Array.isArray(allModels)) {
            const model = allModels.find(m => m.id === id);
            if (model) {
              // Return rich model information
              console.log(`Using model details from models.json for response`);
              res.json({
                message: 'Model metadata updated successfully (using file storage)',
                id,
                metadata: model,
                source: 'file'
              });
              return;
            }
          }
        }
      } catch (jsonError) {
        console.error('Error getting model from models.json:', jsonError.message);
      }
      
      // Fallback to simple metadata response
      console.log(`Updated metadata in file storage for model ${id} (using simple response)`);
      
      res.json({ 
        message: 'Model metadata updated successfully (using file storage)',
        id,
        metadata: {
          id: id,
          displayName: modelMetadata[id].displayName,
          description: modelMetadata[id].description,
          tags: modelMetadata[id].tags,
          category: modelMetadata[id].category,
          lastUpdated: modelMetadata[id].lastUpdated
        },
        source: 'metadata_file'
      });
    }
  } catch (error) {
    console.error('Error updating model metadata:', error);
    res.status(500).json({ error: 'Failed to update model metadata', message: error.message });
  }
};

/**
 * Search models by filename
 */
exports.searchModels = async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  try {
    console.log(`Searching for models matching "${query}"...`);
    
    // Try to search in database first
    try {
      const dbResults = await dbService.searchModels(query);
      
      if (dbResults && dbResults.length > 0) {
        console.log(`Found ${dbResults.length} matching models in database`);
        
        // Format database results
        const formattedResults = dbResults.map(model => ({
          id: model.id,
          objectId: model.object_id,
          fileName: model.file_name,
          displayName: model.display_name,
          description: model.description,
          bucketKey: model.bucket_key,
          objectKey: model.object_key,
          urn: model.urn,
          status: model.status,
          uploadedAt: model.uploaded_at.toISOString(),
          tags: model.tags,
          category: model.category
        }));
        
        return res.json(formattedResults);
      }
    } catch (dbError) {
      console.error('Error searching models in database:', dbError.message);
    }
    
    // Fallback to API search if database search fails or returns no results
    console.log('No matching models found in database, using APS API...');
    const apiResults = await apsService.searchModels(query);
    
    // Enrich with metadata
    for (const model of apiResults) {
      if (modelMetadata[model.id]) {
        if (modelMetadata[model.id].displayName) {
          model.displayName = modelMetadata[model.id].displayName;
        }
        
        if (modelMetadata[model.id].description) {
          model.description = modelMetadata[model.id].description;
        }
        
        if (modelMetadata[model.id].tags) {
          model.tags = modelMetadata[model.id].tags;
        }
        
        if (modelMetadata[model.id].category) {
          model.category = modelMetadata[model.id].category;
        }
      }
    }
    
    res.json(apiResults);
  } catch (error) {
    console.error('Error searching models:', error);
    res.status(500).json({ error: 'Failed to search models', message: error.message });
  }
};

/**
 * Get a test list of models - REMOVED
 * This feature has been disabled to enforce usage of our database and proper model tracking
 */
exports.getTestModels = async (req, res) => {
  res.status(404).json({ 
    error: 'Feature disabled', 
    message: 'Test models have been disabled to ensure proper model tracking in the database' 
  });
};

/**
 * Get model by ID
 */
exports.getModelById = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Try to get from database first
    let formattedModel = null;
    try {
      const dbModel = await dbService.getModelById(id);
      
      if (dbModel) {
        console.log(`Found model ${id} in database`);
        
        // Format the response
        formattedModel = {
          id: dbModel.id,
          objectId: dbModel.object_id,
          fileName: dbModel.file_name,
          displayName: dbModel.display_name,
          description: dbModel.description,
          bucketKey: dbModel.bucket_key,
          objectKey: dbModel.object_key,
          urn: dbModel.urn,
          status: dbModel.status,
          uploadedAt: dbModel.uploaded_at.toISOString(),
          tags: dbModel.tags,
          category: dbModel.category
        };
      }
    } catch (dbError) {
      console.error('Database error getting model by ID:', dbError.message);
    }
    
    // If not found in database, fallback to APS API
    if (!formattedModel) {
      console.log('Model not found in database, checking APS API...');
      const models = await apsService.getAllModels();
      
      // Find the model by ID
      const model = models.find(m => m.id === id);
      
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }
      
      // Add metadata if available in file storage
      if (modelMetadata[model.id]) {
        if (modelMetadata[model.id].displayName) {
          model.displayName = modelMetadata[model.id].displayName;
        }
        
        if (modelMetadata[model.id].description) {
          model.description = modelMetadata[model.id].description;
        }
        
        if (modelMetadata[model.id].tags) {
          model.tags = modelMetadata[model.id].tags;
        }
        
        if (modelMetadata[model.id].category) {
          model.category = modelMetadata[model.id].category;
        }
      }
      
      // Try to store in database for future access
      try {
        await dbService.createModel(model);
        console.log(`Stored model ${id} in database from APS API`);
      } catch (storeError) {
        console.error('Error storing model in database:', storeError.message);
      }
      
      formattedModel = model;
    }
    
    // Get related KBOM data if available
    try {
      const kbomService = require('../services/kbomService');
      
      // Check if kbom table exists
      const kbomTableExists = await kbomService.checkKbomTableExists();
      
      if (kbomTableExists) {
        // Find related KBOMs for this model
        const fileName = formattedModel.file_name || formattedModel.fileName;
        if (fileName) {
          console.log(`Looking for KBOMs related to model with filename: ${fileName}`);
          const relatedKboms = await kbomService.findRelatedKboms(fileName);
          
          if (relatedKboms && relatedKboms.length > 0) {
            console.log(`Found ${relatedKboms.length} related KBOMs for model ${id}`);
            
            // Add the related KBOMs to the model response
            formattedModel.kboms = relatedKboms;
            
            // Extract unique customers and sales orders for easier display
            const customers = new Set();
            const salesOrders = new Set();
            
            relatedKboms.forEach(kbom => {
              if (kbom.customer) customers.add(kbom.customer);
              if (kbom.so) salesOrders.add(kbom.so);
            });
            
            formattedModel.relatedCustomers = Array.from(customers);
            formattedModel.relatedSalesOrders = Array.from(salesOrders);
          } else {
            console.log(`No related KBOMs found for model ${id}`);
          }
        }
      } else {
        console.log('KBOM table not found in database, skipping KBOM lookup');
      }
    } catch (kbomError) {
      console.error('Error getting related KBOM data:', kbomError);
      // Continue and return the model without KBOM data
    }
    
    res.json(formattedModel);
  } catch (error) {
    console.error('Error getting model:', error);
    res.status(500).json({ error: 'Failed to get model' });
  }
};

/**
 * Upload multiple model files
 */
exports.uploadModels = async (req, res) => {
  try {
    console.log('Upload request received');
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    console.log(`${req.files.length} files received`);
    
    // Create a new bucket if it doesn't exist
    const bucketKey = 'aps_viewer_app_' + process.env.APS_CLIENT_ID.toLowerCase().replace(/[^0-9a-z]/g, '');
    console.log('Bucket key:', bucketKey);
    
    try {
      await apsService.createBucketIfNotExists(bucketKey);
      console.log('Bucket created or verified');
    } catch (bucketError) {
      console.error('Bucket creation error:', bucketError.message);
      throw new Error(`Bucket creation failed: ${bucketError.message}`);
    }
    
    // Try to load the existing models.json file 
    let existingModels = [];
    try {
      const modelsPath = path.join(__dirname, '../../models.json');
      if (fs.existsSync(modelsPath)) {
        const modelsData = fs.readFileSync(modelsPath, 'utf8');
        existingModels = JSON.parse(modelsData);
        if (!Array.isArray(existingModels)) {
          existingModels = [];
        }
        console.log(`Loaded ${existingModels.length} existing models from models.json`);
      }
    } catch (jsonError) {
      console.error('Error reading models.json:', jsonError.message);
      existingModels = []; // Start with empty array if error
    }
    
    // Process each file
    const uploadedModels = [];
    const errors = [];
    
    for (const file of req.files) {
      try {
        const fileName = file.originalname;
        const filePath = file.path;
        
        console.log('Processing file:', fileName);
        
        // Upload the file to APS OSS
        const timestamp = Date.now();
        const objectKey = `${timestamp}_${fileName}`;
        
        const uploadResponse = await apsService.uploadFile(bucketKey, objectKey, filePath);
        console.log('File uploaded to OSS successfully', uploadResponse);
        
        // Get description from request body if available
        const description = req.body.description || '';
        
        // Create model info
        const model = {
          id: timestamp.toString(), // Use timestamp as ID to avoid URL encoding issues
          objectId: uploadResponse.objectId,
          fileName,
          description,
          bucketKey,
          objectKey,
          urn: uploadResponse.urn,
          status: 'uploaded',
          uploadedAt: new Date().toISOString()
        };
        
        // Store model in database with better error handling and retry
        let dbStorageSuccess = false;
        
        // Try to store in database with retry
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const savedModel = await dbService.createModel(model);
            if (savedModel) {
              console.log(`Stored model ${model.id} in database successfully`);
              dbStorageSuccess = true;
              break;
            } else {
              console.warn(`Database returned null result when storing model ${model.id}`);
            }
          } catch (dbError) {
            console.error(`Database storage attempt ${attempt+1} failed:`, dbError.message);
            // Wait a moment before retry
            if (attempt < 1) await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Database storage is required - if it failed, log an error
        if (!dbStorageSuccess) {
          console.error(`Database storage failed for model ${model.id} - this is a critical error`);
          
          // Add to errors list for reporting
          errors.push({
            fileName,
            error: "Failed to store in database - the model will not be available in the app"
          });
        }
        
        uploadedModels.push(model);
        
        // Clean up the uploaded file
        fs.unlinkSync(filePath);
        console.log('Temp file cleaned up');
      } catch (uploadError) {
        console.error(`Error uploading file ${file.originalname}:`, uploadError.message);
        errors.push({
          fileName: file.originalname,
          error: uploadError.message
        });
        
        // Clean up the temp file even if upload failed
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    
    if (uploadedModels.length === 0) {
      return res.status(500).json({ 
        error: 'All uploads failed', 
        details: errors 
      });
    }
    
    // Using database only for model storage, no models.json
    try {
      // Ensure all uploaded models are saved to the database
      if (dbService.isConnected()) {
        console.log('Database is connected, storing models in database ONLY...');
        
        // Track successfully stored models
        const dbStoredModels = [];
        
        // Store each model in database
        for (const model of uploadedModels) {
          try {
            // Attempt to store or update the model in the database
            const dbModel = await dbService.createModel(model);
            if (dbModel) {
              console.log(`Successfully stored/updated model ${model.id} in database`);
              dbStoredModels.push(model);
            } else {
              console.warn(`Failed to store model ${model.id} in database (null result)`);
              // This is an error since we're only using the database
              errors.push({
                fileName: model.fileName,
                error: 'Failed to store in database'
              });
            }
          } catch (modelError) {
            console.error(`Error storing model ${model.id} in database:`, modelError.message);
            // Add to errors since we're only using the database
            errors.push({
              fileName: model.fileName,
              error: `Database error: ${modelError.message}`
            });
          }
        }
        
        console.log(`Stored ${dbStoredModels.length}/${uploadedModels.length} models in database`);
        
        // If no models were stored in the database, this is an error
        if (dbStoredModels.length === 0) {
          return res.status(500).json({
            error: 'Failed to store any models in the database',
            details: errors
          });
        }
      } else {
        // Database connection is required - fail the request
        console.error('Database not connected - cannot store models');
        return res.status(500).json({
          error: 'Database connection required',
          message: 'Database connection is required for model storage'
        });
      }
    } catch (saveError) {
      console.error('Error in model storage process:', saveError.message);
      // Continue anyway - uploads themselves were successful
    }
    
    res.status(201).json({
      models: uploadedModels,
      failedUploads: errors.length > 0 ? errors : undefined,
      success: uploadedModels.length,
      failed: errors.length
    });
  } catch (error) {
    console.error('Error in uploadModels:', error.message);
    res.status(500).json({ error: 'Failed to upload models', message: error.message });
  }
};

/**
 * Upload a single model file (legacy method, kept for backward compatibility)
 */
exports.uploadModel = async (req, res) => {
  try {
    console.log('Single upload request received');
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Create a fake array with the single file
    req.files = [req.file];
    
    // Use the multiple upload method
    return await exports.uploadModels(req, res);
  } catch (error) {
    console.error('Error uploading model:', error.message);
    res.status(500).json({ error: 'Failed to upload model', message: error.message });
  }
};

/**
 * Translate a model to viewable format
 */
exports.translateModel = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('Translation request received for ID:', id);
    
    // Try to get model from database first
    let model = null;
    
    try {
      const dbModel = await dbService.getModelById(id);
      
      if (dbModel) {
        console.log(`Found model ${id} in database`);
        model = {
          id: dbModel.id,
          urn: dbModel.urn
        };
      }
    } catch (dbError) {
      console.error('Database error getting model for translation:', dbError.message);
    }
    
    // If not found in database, check APS API
    if (!model) {
      console.log('Model not found in database, checking APS API...');
      const models = await apsService.getAllModels();
      const apiModel = models.find(m => m.id === id || m.objectId === id);
      
      if (!apiModel) {
        console.log('Model not found with ID:', id);
        return res.status(404).json({ error: 'Model not found' });
      }
      
      model = apiModel;
      
      // Store in database for future access
      try {
        await dbService.createModel(model);
        console.log(`Stored model ${id} in database from APS API`);
      } catch (storeError) {
        console.error('Error storing model in database:', storeError.message);
      }
    }
    
    // Start the translation job
    console.log('Starting translation with URN:', model.urn);
    const response = await apsService.translateModel(model.urn);
    
    // Update status in database with retry mechanism
    let statusUpdateSuccess = false;
    if (dbService.isConnected()) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const updated = await dbService.updateModelStatus(id, 'translating');
          if (updated) {
            console.log(`Updated model ${id} status to 'translating' in database`);
            statusUpdateSuccess = true;
            break;
          } else {
            console.warn(`Failed to update model ${id} status in database (no rows affected)`);
          }
        } catch (updateError) {
          console.error(`Attempt ${attempt+1} - Error updating model status in database:`, updateError.message);
          if (attempt < 1) await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
        }
      }
      
      if (!statusUpdateSuccess) {
        console.warn(`Could not update model ${id} status in database after multiple attempts`);
      }
    } else {
      console.warn('Database not connected, cannot update model status');
    }
    
    console.log('Translation started successfully');
    res.json({ message: 'Translation started', status: 'translating' });
  } catch (error) {
    console.error('Error translating model:', error.message);
    res.status(500).json({ error: 'Failed to translate model', message: error.message });
  }
};

/**
 * Get translation status of a model
 */
exports.getTranslationStatus = async (req, res) => {
  const { id } = req.params;
  
  try {
    // For test models, always return ready
    if (id.startsWith('test')) {
      return res.json({ status: 'ready', progress: '100%' });
    }
    
    // Try to get model from database first
    let model = null;
    
    try {
      const dbModel = await dbService.getModelById(id);
      
      if (dbModel) {
        console.log(`Found model ${id} in database`);
        model = {
          id: dbModel.id,
          urn: dbModel.urn,
          status: dbModel.status
        };
      }
    } catch (dbError) {
      console.error('Database error getting model for status check:', dbError.message);
    }
    
    // If not found in database, check APS API
    if (!model) {
      console.log('Model not found in database, checking APS API...');
      const models = await apsService.getAllModels();
      const apiModel = models.find(m => m.id === id);
      
      if (!apiModel) {
        return res.status(404).json({ error: 'Model not found' });
      }
      
      model = apiModel;
    }
    
    if (model.status === 'uploaded') {
      return res.json({ status: 'not_translated' });
    }
    
    const statusResponse = await apsService.getTranslationStatus(model.urn);
    
    let status = model.status;
    let error = model.error;
    
    // Process the response
    if (statusResponse.status === 'success') {
      status = 'ready';
    } else if (statusResponse.status === 'failed') {
      status = 'failed';
      error = statusResponse.error;
    } else {
      status = 'translating';
    }
    
    // Update status in database if it changed
    if (status !== model.status || error !== model.error) {
      try {
        console.log(`Updating model ${id} status to '${status}' in database`);
        if (error) {
          console.log(`Error message: ${error}`);
        }
        
        await dbService.updateModelStatus(id, status, error);
        console.log(`Successfully updated model ${id} status to '${status}' in database`);
      } catch (updateError) {
        console.error('Error updating model status in database:', updateError.message);
        
        // Try one more time with a more basic query if the first attempt failed
        // This might be needed if the error column doesn't exist
        if (updateError.message.includes('column "error" of relation "models" does not exist')) {
          try {
            console.log('Attempting to update status without error column...');
            
            // Use a basic query without the error column
            if (dbService.pool) {
              await dbService.pool.query(
                'UPDATE models SET status = $1 WHERE id = $2',
                [status, id]
              );
              console.log(`Successfully updated model ${id} status (without error column)`);
              
              // Also log a warning that the schema needs to be updated
              console.warn('WARNING: The models table is missing the error column.');
              console.warn('Run: ALTER TABLE models ADD COLUMN error TEXT;');
            }
          } catch (fallbackError) {
            console.error('Fallback update also failed:', fallbackError.message);
          }
        }
      }
    }
    
    res.json({
      status: status,
      progress: statusResponse.progress,
      error: error
    });
  } catch (error) {
    console.error('Error checking translation status:', error);
    res.status(500).json({ error: 'Failed to check translation status' });
  }
};

/**
 * Get shareable link for a model
 */
exports.getShareableLink = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Try to get model from database first
    let model = null;
    
    try {
      const dbModel = await dbService.getModelById(id);
      
      if (dbModel) {
        console.log(`Found model ${id} in database`);
        model = {
          id: dbModel.id,
          urn: dbModel.urn,
          status: dbModel.status,
          fileName: dbModel.file_name
        };
      }
    } catch (dbError) {
      console.error('Database error getting model for share link:', dbError.message);
    }
    
    // If not found in database, check APS API
    if (!model) {
      const models = await apsService.getAllModels();
      const apiModel = models.find(m => m.id === id);
      
      if (!apiModel) {
        return res.status(404).json({ error: 'Model not found' });
      }
      
      model = apiModel;
    }
    
    if (model.status !== 'ready') {
      return res.status(400).json({ 
        error: 'Model not ready for sharing', 
        message: 'Model must be fully translated before it can be shared' 
      });
    }
    
    // Generate a token that will expire in 48 hours
    const token = await apsService.getPublicToken();
    
    // Create a shareable link that includes the model URN and viewer info
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const shareableLink = `${baseUrl}/basic-viewer.html?urn=${encodeURIComponent(model.urn)}`;
    
    res.json({
      link: shareableLink,
      expiresIn: token.expires_in,
      model: {
        id: model.id,
        fileName: model.fileName,
        urn: model.urn
      }
    });
  } catch (error) {
    console.error('Error generating shareable link:', error);
    res.status(500).json({ error: 'Failed to generate shareable link' });
  }
};

/**
 * Load a model by URN - REMOVED
 * This feature has been disabled to enforce usage of our database and proper model tracking
 */

/**
 * Delete a model
 * 
 * Note: This method only removes the model from our database as we can't delete models
 * from the APS OSS storage with the current API implementation.
 */
exports.deleteModel = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Model ID is required' });
    }
    
    console.log('Delete request received for model ID:', id);
    
    // Try to delete from database first
    try {
      const deletedModel = await dbService.deleteModel(id);
      
      if (deletedModel) {
        console.log(`Deleted model ${id} from database`);
        
        // Format for response
        const formattedModel = {
          id: deletedModel.id,
          objectId: deletedModel.object_id,
          fileName: deletedModel.file_name,
          urn: deletedModel.urn
        };
        
        // Also remove from file metadata if present
        if (modelMetadata[id]) {
          delete modelMetadata[id];
          
          // Save metadata file
          const dir = path.dirname(modelMetadataPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(modelMetadataPath, JSON.stringify(modelMetadata, null, 2));
          
          console.log(`Removed model ${id} from metadata file`);
        }
        
        return res.json({ 
          message: 'Model deleted successfully (note: model still exists in APS)', 
          model: formattedModel 
        });
      }
    } catch (dbError) {
      console.error('Database error deleting model:', dbError.message);
    }
    
    // If not found in database, check APS API
    console.log('Model not found in database or error occurred, checking APS API...');
    const models = await apsService.getAllModels();
    const model = models.find(m => m.id === id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Remove from file metadata if present
    if (modelMetadata[id]) {
      delete modelMetadata[id];
      
      // Save metadata file
      const dir = path.dirname(modelMetadataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(modelMetadataPath, JSON.stringify(modelMetadata, null, 2));
      
      console.log(`Removed model ${id} from metadata file`);
    }
    
    res.json({ 
      message: 'Model metadata deleted successfully (note: model still exists in APS)', 
      model: model 
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model', message: error.message });
  }
};