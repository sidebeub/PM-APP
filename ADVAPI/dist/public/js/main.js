// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the viewer
  const viewerManager = new ViewerManager('viewer');
  viewerManager.initialize();
  
  // Initialize the model manager
  const modelManager = new ModelManager('upload-form', 'upload-status', 'models-list');
  
  // Initialize the application
  console.log('Application initialized');
  
  // Handle model selection events
  document.addEventListener('modelSelected', (event) => {
    try {
      console.log('Model selection event received');
      
      const { model } = event.detail;
      if (!model) {
        console.error('No model data in the selection event');
        return;
      }
      
      console.log(`Selected model: ${model.fileName} (Status: ${model.status})`);
      console.log('Model URN:', model.urn);
      
      // Only load models that are ready
      if (model.status === 'ready') {
        try {
          console.log(`Loading model with URN: ${model.urn}`);
          // Get detailed model information for KBOM data
          fetch(`/api/models/${model.id}`)
            .then(response => response.json())
            .then(detailedModel => {
              // Pass the full model object to the viewer
              viewerManager.loadModel(detailedModel);
            })
            .catch(error => {
              console.error('Error fetching detailed model info:', error);
              // Fallback to just loading by URN
              viewerManager.loadModel(model.urn);
            });
        } catch (loadError) {
          console.error('Error loading model in viewer:', loadError);
          alert(`Error loading model: ${loadError.message || 'Unknown error'}`);
        }
      } else {
        console.log(`Model is not ready yet (Status: ${model.status}). Can't load in viewer.`);
        
        // Show appropriate message to user based on status
        let message = '';
        if (model.status === 'uploaded') {
          message = 'This model has been uploaded but not yet translated. Please click the "Translate" button to start the translation process.';
        } else if (model.status === 'translating') {
          message = 'This model is currently being translated. Please wait a few minutes and try again.';
        } else if (model.status === 'failed') {
          message = 'Translation failed for this model. Please check the model file and try uploading it again.';
        } else {
          message = `The model is in '${model.status}' state and cannot be loaded in the viewer yet.`;
        }
        
        // Display the message in the viewer area
        const viewerDiv = document.getElementById('viewer');
        if (viewerDiv) {
          viewerDiv.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #666;">
              <h3 style="margin-bottom: 1rem;">Model Not Ready</h3>
              <p>${message}</p>
              ${model.status === 'uploaded' ? 
                `<button id="translate-now-btn" style="
                  background-color: #0696d7; 
                  color: white; 
                  padding: 10px 20px; 
                  border: none; 
                  border-radius: 4px; 
                  cursor: pointer;
                  margin-top: 1rem;
                ">Translate Now</button>` : ''}
            </div>
          `;
          
          // Add event listener for translate button if shown
          if (model.status === 'uploaded') {
            const translateBtn = document.getElementById('translate-now-btn');
            if (translateBtn) {
              translateBtn.addEventListener('click', async () => {
                try {
                  translateBtn.textContent = 'Starting Translation...';
                  translateBtn.disabled = true;
                  
                  // Create form data with admin password
                  const formData = new FormData();
                  formData.append('password', 'admin123'); // Hardcoded for convenience
                  
                  // Send translate request
                  const response = await fetch(`/api/models/${model.id}/translate`, {
                    method: 'POST',
                    headers: {
                      'X-Upload-Password': 'admin123' // Also send in header
                    },
                    body: formData
                  });
                  
                  if (response.ok) {
                    translateBtn.textContent = 'Translation Started';
                    viewerDiv.innerHTML = `
                      <div style="padding: 2rem; text-align: center; color: #666;">
                        <h3 style="margin-bottom: 1rem;">Translation Started</h3>
                        <p>The model is now being translated. This process may take several minutes.</p>
                        <p>You will be able to view the model once translation is complete.</p>
                      </div>
                    `;
                    
                    // Start polling for status updates
                    const modelManager = new ModelManager('upload-form', 'upload-status', 'models-list');
                    modelManager.pollTranslationStatus(model.id);
                  } else {
                    translateBtn.textContent = 'Translation Failed';
                    translateBtn.disabled = false;
                    alert('Failed to start translation. Please try again.');
                  }
                } catch (error) {
                  console.error('Error starting translation:', error);
                  translateBtn.textContent = 'Translation Error';
                  translateBtn.disabled = false;
                  alert(`Translation error: ${error.message}`);
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling model selection:', error);
    }
  });
  
  // Handle model deletion events
  document.addEventListener('modelDeleted', (event) => {
    const { modelId } = event.detail;
    console.log('Model deleted event received for ID:', modelId);
    
    // If viewer is initialized and has a model loaded
    if (viewerManager.isInitialized() && viewerManager.currentModel) {
      console.log('Unloading deleted model from viewer');
      
      try {
        // Try different unloading approaches for compatibility
        const viewer = viewerManager.getViewer();
        
        if (viewer.impl && viewer.impl.unloadModel) {
          viewer.impl.unloadModel(viewer.model);
        }
        
        if (viewer.clearModel) {
          viewer.clearModel();
        }
        
        if (viewer.tearDown) {
          viewer.tearDown();
        }
        
        // Reset current model reference
        viewerManager.currentModel = null;
      } catch (error) {
        console.error('Error unloading model from viewer:', error);
      }
    }
  });
});

