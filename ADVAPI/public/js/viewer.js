class ViewerManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.viewer = null;
    this.currentModel = null;
    this.token = null;
  }

  /**
   * Initialize the Autodesk Viewer with a very simple approach
   */
  async initialize() {
    try {
      console.log('Initializing viewer with simplified approach');
      
      // Get an access token for the viewer
      const response = await fetch('/api/advapi/auth/token');
      const json = await response.json();
      
      if (!json.access_token) {
        throw new Error('Failed to get access token');
      }
      
      // Store the token
      this.token = json.access_token;

      // Set up the viewer with bare minimum options
      const options = {
        env: 'AutodeskProduction',
        accessToken: this.token
      };

      // Initialize the viewer
      await new Promise((resolve, reject) => {
        Autodesk.Viewing.Initializer(options, () => {
          const container = document.getElementById(this.containerId);
          
          // Configure with minimal settings
          const config = {
            // Using minimal extensions to avoid issues
            disabledExtensions: {
              measure: false,
              viewCubeUi: false
            }
          };
          
          // Create and start the viewer
          this.viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
          const started = this.viewer.start();
          
          if (started > 0) {
            console.error('Failed to start the viewer:', started);
            reject(new Error('Failed to start viewer'));
            return;
          }
          
          console.log('Viewer initialized successfully');
          resolve();
        });
      });
      
      // Set up basic event listeners
      this.setupEvents();
      
    } catch (error) {
      console.error('Error initializing viewer:', error);
    }
  }

  /**
   * Set up basic viewer events
   */
  setupEvents() {
    if (!this.viewer) return;
    
    // Add minimal event listeners
    this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
      console.log('Model geometry loaded');
    });
  }

  /**
   * Load a model with improved error handling and debugging
   */
  async loadModel(urn) {
    if (!this.viewer) {
      console.error('Viewer not initialized');
      return;
    }
    
    try {
      console.log('Loading model with URN:', urn);
      
      // Validate URN format
      if (!urn) {
        throw new Error('URN is null or empty');
      }
      
      // Ensure proper URN format - first determine what type of input we have
      let modelUrn = null;
      
      // Check if we have a string or an object and handle accordingly
      if (typeof urn === 'string') {
        modelUrn = urn;
        console.log('Received URN as string:', modelUrn);
      } else if (typeof urn === 'object' && urn !== null) {
        // We got a model object - extract the URN string
        if (typeof urn.urn === 'string') {
          modelUrn = urn.urn;
          console.log('Extracted URN from model object:', modelUrn);
        } else {
          // Try file_name or fileName as fallback
          modelUrn = urn.urn || urn.file_name || urn.fileName || '';
          console.log('Using fallback URN from model object:', modelUrn);
        }
      } else {
        // Neither string nor object, this is an error
        throw new Error('URN format is invalid: must be a string or an object with a urn property');
      }
      
      // Validate that we now have a string
      if (typeof modelUrn !== 'string') {
        throw new Error('Failed to extract a valid URN string from input');
      }
      
      // Now that we have a verified string, we can safely use string methods
      if (!modelUrn.startsWith('urn:')) {
        console.log('Adding urn: prefix to model identifier');
        modelUrn = 'urn:' + modelUrn;
      }
      
      // Log the full URN we're going to use
      console.log('Full URN being used:', modelUrn);
      
      // If we already have a model loaded, unload it first
      if (this.currentModel) {
        console.log('Unloading previous model before loading new one');
        
        // Try different unloading approaches for compatibility
        try {
          // Clear all models completely
          if (this.viewer.impl && this.viewer.impl.unloadModel) {
            this.viewer.impl.unloadModel(this.viewer.model);
          }
          
          // Use new v7 approach
          if (this.viewer.clearModel) {
            this.viewer.clearModel();
          }
          
          // Use older methods as fallback
          if (this.viewer.tearDown) {
            this.viewer.tearDown();
          }
        } catch (unloadError) {
          console.error('Error unloading previous model:', unloadError);
          // Continue anyway, we'll try to load the new model
        }
      }
      
      // Store current model
      this.currentModel = modelUrn;
      
      // Add message to the viewer container to show loading status
      const container = document.getElementById(this.containerId);
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'model-loading-status';
      loadingDiv.style.position = 'absolute';
      loadingDiv.style.top = '50%';
      loadingDiv.style.left = '50%';
      loadingDiv.style.transform = 'translate(-50%, -50%)';
      loadingDiv.style.background = 'rgba(0,0,0,0.7)';
      loadingDiv.style.color = 'white';
      loadingDiv.style.padding = '15px';
      loadingDiv.style.borderRadius = '8px';
      loadingDiv.style.fontSize = '14px';
      loadingDiv.style.zIndex = '999';
      loadingDiv.innerHTML = 'Loading model...';
      container.appendChild(loadingDiv);
      
      // Store the original URN object if it's an object for KBOM data display
      let modelObject = (typeof urn === 'object' && urn !== null) ? urn : null;
      
      // KBOM information popup has been removed
      
      // Load document with detailed error handling
      try {
        await new Promise((resolve, reject) => {
          Autodesk.Viewing.Document.load(
            modelUrn,
            (document) => {
              try {
                loadingDiv.innerHTML = 'Document loaded, preparing views...';
                
                // Get all available viewables
                console.log('Looking for viewables in document');
                const viewables = document.getRoot().search({'type':'geometry'});
                console.log('Viewables found:', viewables?.length || 0);
                
                if (!viewables || viewables.length === 0) {
                  loadingDiv.innerHTML = 'Error: No viewable content found in this model';
                  console.error('No viewables found in document');
                  reject(new Error('No viewable content found in this model'));
                  return;
                }
                
                // Get default viewable with additional error handling
                let defaultViewable = null;
                
                // Log all available viewables
                viewables.forEach((viewable, index) => {
                  console.log(`Viewable ${index}:`, viewable.data.name || 'unnamed', 
                              'role:', viewable.data.role || 'none');
                });
                
                // Try to get the 3D viewable if available
                defaultViewable = viewables.find(v => 
                  v.data.role === '3d' || 
                  v.data.name?.includes('3D') ||
                  v.data.name?.includes('Primary'));
                
                // Fallback to first viewable if no 3D view found
                if (!defaultViewable && viewables.length > 0) {
                  console.log('No 3D viewable found, using first available viewable');
                  defaultViewable = viewables[0];
                }
                
                if (!defaultViewable) {
                  loadingDiv.innerHTML = 'Error: Could not determine which viewable to load';
                  reject(new Error('Could not determine which viewable to load'));
                  return;
                }
                
                console.log('Selected viewable:', defaultViewable.data.name || 'unnamed');
                
                // Get path
                const path = document.getViewablePath(defaultViewable);
                console.log('Loading viewable from path:', path);
                loadingDiv.innerHTML = 'Loading 3D view...';
                
                // Monkey patch the Model.getUnitScale function to prevent the toLowerCase error
                try {
                  // Store the original function
                  if (!window._originalGetUnitScale) {
                    window._originalGetUnitScale = Autodesk.Viewing.Model.prototype.getUnitScale;
                  }
                  
                  // Replace with our safer version
                  Autodesk.Viewing.Model.prototype.getUnitScale = function(unit) {
                    // If unit is not a string, default to 'mm'
                    if (typeof unit !== 'string') {
                      console.warn('Unit was not a string, defaulting to "mm"', unit);
                      unit = 'mm';
                    }
                    // Call the original function with our sanitized unit
                    return window._originalGetUnitScale.call(this, unit);
                  };
                  
                  console.log('Applied Autodesk Viewer Model.getUnitScale patch');
                } catch (patchError) {
                  console.error('Failed to patch Model.getUnitScale:', patchError);
                }
                
                // Load with absolutely minimal options to avoid errors
                this.viewer.loadModel(
                  path,
                  {},
                  (model) => {
                    console.log('Model loaded successfully:', model);
                    loadingDiv.innerHTML = 'Success! Model loaded successfully.';
                    
                    // Add a success animation and styling
                    loadingDiv.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
                    loadingDiv.style.color = 'white';
                    loadingDiv.style.padding = '15px';
                    loadingDiv.style.borderRadius = '8px';
                    loadingDiv.style.transition = 'all 0.5s ease';
                    
                    // Fit to view
                    this.viewer.fitToView();
                    
                    // Add model info to the loading div
                    try {
                      const modelInfo = model.getDocumentNode().data;
                      const fileName = modelInfo.name || 'Unknown';
                      const fileType = modelInfo.fileType || '';
                      
                      // Create a more detailed success message
                      loadingDiv.innerHTML = `
                        <div style="font-weight: bold;">Model Loaded Successfully!</div>
                        <div style="margin-top: 5px;">File: ${fileName}</div>
                        ${fileType ? `<div>Type: ${fileType}</div>` : ''}
                        <div style="margin-top: 10px; font-size: 12px;">Use mouse to rotate, scroll to zoom</div>
                      `;
                    } catch (infoError) {
                      console.warn('Could not extract model info:', infoError);
                    }
                    
                    // Remove the loading message after a short delay
                    setTimeout(() => {
                      if (container.contains(loadingDiv)) {
                        // Fade out effect
                        loadingDiv.style.opacity = '0';
                        setTimeout(() => {
                          if (container.contains(loadingDiv)) {
                            container.removeChild(loadingDiv);
                          }
                        }, 500);
                      }
                    }, 3000);
                    
                    resolve();
                  },
                  (err) => {
                    console.error('Error loading model geometry:', err);
                    
                    // Try to extract more useful error information
                    let errorDetails = err.message || 'Unknown error';
                    if (err.stack) {
                      console.error('Error stack:', err.stack);
                    }
                    
                    // Check for common error types
                    if (errorDetails.includes('toLowerCase is not a function')) {
                      errorDetails = 'Unit conversion error - model may use incompatible units';
                      
                      // Try reloading without unit specification
                      console.log('Attempting to reload with automatic unit detection...');
                      try {
                        this.viewer.loadModel(
                          path,
                          { applyScaling: false },
                          (model) => {
                            console.log('Model loaded successfully with automatic units:', model);
                            loadingDiv.innerHTML = 'Success! Preparing view...';
                            this.viewer.fitToView();
                            setTimeout(() => {
                              if (container.contains(loadingDiv)) {
                                container.removeChild(loadingDiv);
                              }
                            }, 1000);
                            resolve();
                          },
                          (retryErr) => {
                            console.error('Failed second attempt to load model:', retryErr);
                            loadingDiv.innerHTML = `Error loading model: ${errorDetails}`;
                            reject(err);
                          }
                        );
                        return; // Don't reject yet, waiting for second attempt
                      } catch (retryError) {
                        console.error('Error in retry attempt:', retryError);
                        // Continue to rejection
                      }
                    }
                    
                    loadingDiv.innerHTML = `Error loading model: ${errorDetails}`;
                    reject(err);
                  }
                );
              } catch (viewableError) {
                console.error('Error processing document viewables:', viewableError);
                loadingDiv.innerHTML = `Error processing document: ${viewableError.message}`;
                reject(viewableError);
              }
            },
            (error) => {
              console.error('Error loading document:', error);
              console.error('Error details:', error.message, error.statusCode, error.statusText);
              
              // Add more detailed error message to the viewer
              if (error.statusCode === 404) {
                loadingDiv.innerHTML = 'Error: Model not found (404). The URN may be invalid or the model may not be available.';
              } else if (error.statusCode === 401 || error.statusCode === 403) {
                loadingDiv.innerHTML = 'Error: Authorization issue (401/403). You may not have permission to access this model or your token expired.';
              } else {
                loadingDiv.innerHTML = `Error loading model: ${error.message || 'Unknown error'}`;
              }
              
              reject(error);
            }
          );
        });
      } catch (loadError) {
        console.error('Error in model loading process:', loadError);
        
        // Ensure the loading div is updated with error
        const existingLoadingDiv = document.getElementById('model-loading-status');
        if (existingLoadingDiv) {
          existingLoadingDiv.innerHTML = `Loading failed: ${loadError.message || 'Unknown error'}`;
          // Keep error visible but don't remove it
        }
        
        throw loadError;
      }
      
    } catch (error) {
      console.error('Error in loadModel:', error);
      
      // Display error to the user via alert as well
      const errorMsg = error.message || 'Unknown error loading model';
      alert(`Failed to load model: ${errorMsg}`);
      
      // Clear the current model reference since loading failed
      this.currentModel = null;
    }
  }

  /**
   * Get viewer instance
   */
  getViewer() {
    return this.viewer;
  }

  /**
   * Check if the viewer is initialized
   */
  isInitialized() {
    return this.viewer !== null;
  }
}