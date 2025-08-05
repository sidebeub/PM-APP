class ModelManager {
  constructor(uploadFormId, uploadStatusId, modelsListId) {
    this.uploadFormId = uploadFormId;
    this.uploadStatusId = uploadStatusId;
    this.modelsListId = modelsListId;
    this.models = [];
    this.activeModelId = null;
    this.pollIntervals = {};
    this.searchTerm = '';
    this.editModal = document.getElementById('edit-model-modal');
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the model manager
   */
  init() {
    // Set up the upload form
    this.setupUploadForm();
    
    // Set up search functionality
    this.setupSearch();
    
    // Set up edit modal
    this.setupEditModal();
    
    // Load existing models
    this.loadModels();
  }
  
  /**
   * Set up the edit modal
   */
  setupEditModal() {
    // Get modal elements
    this.editModal = document.getElementById('edit-model-modal');
    if (!this.editModal) {
      console.error('Edit model modal not found in the document');
      return;
    }
    
    const closeBtn = this.editModal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-edit');
    const form = document.getElementById('edit-model-form');
    
    // Add close button event listener
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.editModal.style.display = 'none';
      });
    }
    
    // Add cancel button event listener
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editModal.style.display = 'none';
      });
    }
    
    // Add form submit event listener
    if (form) {
      form.addEventListener('submit', (e) => this.handleEditFormSubmit(e));
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
      if (e.target === this.editModal) {
        this.editModal.style.display = 'none';
      }
    });
  }
  
  /**
   * Set up search functionality
   */
  setupSearch() {
    const searchInput = document.getElementById('model-search');
    const clearButton = document.getElementById('clear-search');
    
    if (!searchInput || !clearButton) return;
    
    // Update the search placeholder text to indicate the enhanced functionality
    searchInput.placeholder = 'Search by filename or description...';
    
    // Add search input event listener
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim().toLowerCase();
      this.renderModelsList();
    });
    
    // Add clear button event listener
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      this.searchTerm = '';
      this.renderModelsList();
      searchInput.focus();
    });
    
    // Add refresh button event listener
    const refreshButton = document.getElementById('refresh-models');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.refreshModelsFromAPS();
      });
    }
  }
  
  /**
   * Refresh models directly from APS API
   */
  async refreshModelsFromAPS() {
    try {
      // Show refresh status
      const container = document.getElementById(this.modelsListId);
      if (container) {
        container.innerHTML = '<div class="loading-message">Refreshing models from Autodesk...</div>';
      }
      
      // Call the refresh API endpoint
      const response = await fetch('/api/advapi/models/refresh');
      
      if (!response.ok) {
        throw new Error(`Failed to refresh models: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update models array with the refreshed data
      if (data.models && Array.isArray(data.models)) {
        this.models = data.models;
        console.log(`Refreshed ${data.models.length} models from APS API`);
      }
      
      // Render the updated models list
      this.renderModelsList();
      
      // Show success message
      alert(`Successfully refreshed ${data.count} models from Autodesk Platform`);
    } catch (error) {
      console.error('Error refreshing models:', error);
      alert(`Error refreshing models: ${error.message}`);
      
      // Ensure the list is still displayed
      this.renderModelsList();
    }
  }

  /**
   * Set up the model upload form
   */
  setupUploadForm() {
    const form = document.getElementById(this.uploadFormId);
    const statusDiv = document.getElementById(this.uploadStatusId);
    
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fileInput = form.querySelector('input[type="file"]');
      const files = fileInput.files;
      
      if (!files || files.length === 0) {
        statusDiv.textContent = 'Please select at least one file to upload';
        return;
      }
      
      try {
        // Clear previous status
        statusDiv.innerHTML = `Uploading ${files.length} file(s)...`;
        
        // Create progress container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'upload-progress-container';
        statusDiv.appendChild(progressContainer);
        
        // Add a progress entry for each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Create file progress container
          const fileProgressDiv = document.createElement('div');
          fileProgressDiv.className = 'file-progress';
          fileProgressDiv.innerHTML = `<div class="file-name">${file.name}</div>`;
          
          // Create progress bar
          const progressBarContainer = document.createElement('div');
          progressBarContainer.className = 'upload-progress';
          const progressBar = document.createElement('div');
          progressBar.className = 'upload-progress-bar';
          progressBarContainer.appendChild(progressBar);
          
          fileProgressDiv.appendChild(progressBarContainer);
          progressContainer.appendChild(fileProgressDiv);
        }
        
        // Loop through each file and upload them one by one
        const uploadedModels = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // Update progress status
          statusDiv.innerHTML = `Uploading file ${i+1} of ${files.length}: ${file.name}`;
          
          // Create form data for this single file
          const formData = new FormData();
          formData.append('model', file);
          
          // Get description and password
          const descriptionInput = form.querySelector('#model-description');
          const description = descriptionInput ? descriptionInput.value : '';
          const passwordInput = form.querySelector('#upload-password');
          const password = passwordInput ? passwordInput.value : '';
          
          console.log('Upload debug - Password provided:', !!password);
          console.log('Upload debug - Password length:', password ? password.length : 0);
          
          // Add description and password to form data
          if (description) {
            formData.append('description', description);
          }
          if (password) {
            formData.append('password', password);
            console.log('Upload debug - Added password to FormData');
          }
          
          // Log FormData contents (for debugging)
          console.log('Upload debug - FormData entries:');
          for (let [key, value] of formData.entries()) {
            console.log(`- ${key}: ${key === 'password' ? '******' : value instanceof File ? value.name : value}`);
          }
          
          // Add password to headers as a fallback mechanism
          const headers = {};
          if (password) {
            headers['X-Upload-Password'] = password;
            console.log('Upload debug - Added password to request headers as fallback');
          }
          
          // Upload the single file
          console.log('Upload debug - Sending POST request to /api/advapi/models/upload-single');
          const response = await fetch('/api/advapi/models/upload-single', {
            method: 'POST',
            headers: headers,
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Failed to upload file ${file.name}`);
          }
          
          const responseData = await response.json();
          if (responseData.models && responseData.models.length > 0) {
            uploadedModels.push(...responseData.models);
          } else if (responseData.id) {
            uploadedModels.push(responseData);
          }
          
          // Set progress bar to 100%
          const progressBars = statusDiv.querySelectorAll('.upload-progress-bar');
          if (progressBars[i]) {
            progressBars[i].style.width = '100%';
          }
        }
        
        // All files uploaded successfully
        statusDiv.innerHTML = `Successfully uploaded ${uploadedModels.length} models.`;
        
        // Use uploaded models data instead of parsing response
        const result = { models: uploadedModels };
        
        // Add the models to the list
        if (result.models && result.models.length > 0) {
          // Multiple models in response
          this.models = this.models.concat(result.models);
          this.renderModelsList();
          
          // Start translation for each model
          statusDiv.textContent = `Starting translation for ${result.models.length} models...`;
          
          // Get password
          const passwordInput = form.querySelector('#upload-password');
          const password = passwordInput ? passwordInput.value : '';
          
          // Process each model sequentially
          for (const model of result.models) {
            try {
              // Create form data for password
              const formData = new FormData();
              if (password) {
                formData.append('password', password);
                console.log(`Translation debug - Added password to FormData for model ${model.id}`);
              }
              
              // Add password to headers as a fallback mechanism
              const headers = {};
              if (password) {
                headers['X-Upload-Password'] = password;
                console.log(`Translation debug - Added password to request headers for model ${model.id}`);
              }
              
              console.log(`Translation debug - Sending POST request to /api/advapi/models/${model.id}/translate`);
              await fetch(`/api/advapi/models/${model.id}/translate`, {
                method: 'POST',
                headers: headers,
                body: formData
              });
              
              // Start polling for translation status
              this.pollTranslationStatus(model.id);
            } catch (err) {
              console.error(`Error starting translation for ${model.fileName}:`, err);
            }
          }
          
          statusDiv.textContent = `All ${result.models.length} models are being processed...`;
        } else if (result.id) {
          // Single model in response (legacy format)
          this.models.push(result);
          this.renderModelsList();
          
          // Start translation
          statusDiv.textContent = 'Starting translation...';
          
          // Get password
          const passwordInput = form.querySelector('#upload-password');
          const password = passwordInput ? passwordInput.value : '';
          
          // Create form data for password
          const translateFormData = new FormData();
          if (password) {
            translateFormData.append('password', password);
            console.log(`Translation debug - Added password to FormData for single model ${result.id}`);
          }
          
          // Add password to headers as a fallback mechanism
          const translateHeaders = {};
          if (password) {
            translateHeaders['X-Upload-Password'] = password;
            console.log(`Translation debug - Added password to request headers for single model ${result.id}`);
          }
          
          console.log(`Translation debug - Sending POST request to /api/advapi/models/${result.id}/translate`);
          const translateResponse = await fetch(`/api/advapi/models/${result.id}/translate`, {
            method: 'POST',
            headers: translateHeaders,
            body: translateFormData
          });
          
          if (!translateResponse.ok) {
            throw new Error('Translation failed to start');
          }
          
          statusDiv.textContent = 'Translation in progress...';
          
          // Start polling for translation status
          this.pollTranslationStatus(result.id);
        }
        
        // Reset form
        form.reset();
      } catch (error) {
        console.error('Error uploading model:', error);
        statusDiv.textContent = `Error: ${error.message}`;
      }
    });
  }

  /**
   * Load models from the server
   */
  async loadModels() {
    try {
      console.log('Loading models from server...');
      let response;
      let data = [];
      
      try {
        // First try the regular endpoint
        console.log('Trying to fetch models from regular endpoint...');
        response = await fetch('/api/advapi/models');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          data = await response.json();
          console.log(`Received ${data.length} models from server`);
          console.log('First few models:', data.slice(0, 3));

    // Debug KBOM data
    const modelsWithKbom = data.filter(model =>
      (model.relatedCustomers && model.relatedCustomers.length > 0) ||
      (model.relatedSalesOrders && model.relatedSalesOrders.length > 0) ||
      (model.relatedWorkOrders && model.relatedWorkOrders.length > 0) ||
      (model.kboms && model.kboms.length > 0)
    );
    console.log('KBOM Debug: Models with KBOM data:', modelsWithKbom.length);
    if (modelsWithKbom.length > 0) {
      console.log('KBOM Debug: First model with KBOM data:', modelsWithKbom[0]);
    }

    // Check source of models
    const dbModels = data.filter(model => model.source === 'database');
    const apiModels = data.filter(model => model.source !== 'database');
    console.log('KBOM Debug: Database models:', dbModels.length, 'API models:', apiModels.length);
        } else {
          console.warn('Regular endpoint failed with status:', response.status);
          let errorText = '';
          try {
            const errorData = await response.text();
            console.warn('Error response:', errorData);
            errorText = errorData;
          } catch (e) {
            console.error('Could not read error response text:', e);
          }
          
          console.warn('Trying test endpoint as fallback...');
          // If regular endpoint fails, try the test endpoint
          const testResponse = await fetch('/api/advapi/models/test');
          console.log('Test endpoint response status:', testResponse.status);
          
          if (testResponse.ok) {
            data = await testResponse.json();
            console.log(`Received ${data.length} test models from server`);
          } else {
            throw new Error(`Both endpoints failed. Regular endpoint: ${response.status} - ${errorText}`);
          }
        }
      } catch (fetchError) {
        console.error('Error fetching models:', fetchError);
        console.error('Error details:', fetchError.message, fetchError.stack);
        // Use empty array as fallback
        data = [];
        
        // Show error in UI
        const container = document.getElementById(this.modelsListId);
        if (container) {
          container.innerHTML = `<div class="error-message">Error fetching models: ${fetchError.message}</div>`;
        }
      }
      
      // Set models and render
      this.models = data || [];
      console.log(`Setting this.models with ${this.models.length} models`);
      
      // Log models array contents for debugging
      if (this.models.length > 0) {
        console.log('First model:', this.models[0]);
      } else {
        console.log('No models received from server');
      }
      
      this.renderModelsList();
      
      // Start polling for translation status for any in-progress models
      this.models.forEach(model => {
        if (model.status === 'translating') {
          this.pollTranslationStatus(model.id);
        }
      });
    } catch (error) {
      console.error('Error in loadModels function:', error);
      console.error('Stack trace:', error.stack);
      
      // Safely access the container element
      const container = document.getElementById(this.modelsListId);
      if (container) {
        container.innerHTML = `<div class="error-message">Error loading models: ${error.message}</div>`;
      } else {
        console.error(`Could not find element with ID "${this.modelsListId}" to display error message`);
      }
    }
  }

  /**
   * Render the models list
   */
  renderModelsList() {
    try {
      console.log('Rendering models list...');
      
      // Get the container
      const container = document.getElementById(this.modelsListId);
      if (!container) {
        console.error(`Models list container with ID "${this.modelsListId}" not found`);
        return;
      }
      
      // Clear the container
      container.innerHTML = '';
      
      // Check if models exist and is an array
      if (!this.models || !Array.isArray(this.models)) {
        console.error('Invalid models data:', this.models);
        container.innerHTML = '<p>Error: Invalid model data received from server</p>';
        return;
      }
      
      console.log(`Rendering ${this.models.length} models`);
      
      if (this.models.length === 0) {
        container.innerHTML = `
          <p>No models available. Upload a model to get started.</p>
        `;
        return;
      }
      
      // Continue with rendering...
    } catch (error) {
      console.error('Error rendering models list:', error);
      
      // Try to get the container again to ensure we have it
      try {
        const container = document.getElementById(this.modelsListId);
        if (container) {
          container.innerHTML = `<p>Error rendering models: ${error.message}</p>`;
        } else {
          console.error(`Could not find models list container with ID "${this.modelsListId}"`);
        }
      } catch (innerError) {
        console.error('Error showing error message:', innerError);
      }
      return;
    }
    
    try {
      const container = document.getElementById(this.modelsListId);
      if (!container) {
        console.error(`Container element not found for sorting/filtering`);
        return;
      }
      
      // Sort models by upload date (newest first)
      const sortedModels = [...this.models].sort((a, b) => {
        try {
          return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
        } catch (e) {
          console.warn('Error sorting by date:', e);
          return 0; // Keep original order if date comparison fails
        }
      });
      
      // Filter models by search term if one exists
      const filteredModels = this.searchTerm ? 
        sortedModels.filter(model => {
          try {
            // Search in filename
            const fileNameMatch = model.fileName && 
              model.fileName.toLowerCase().includes(this.searchTerm.toLowerCase());
            
            // Search in display name (if available)
            const displayNameMatch = model.displayName && 
              model.displayName.toLowerCase().includes(this.searchTerm.toLowerCase());
            
            // Search in description (if available)
            const descriptionMatch = model.description && 
              model.description.toLowerCase().includes(this.searchTerm.toLowerCase());

            // Search in KBOM data (customers, sales orders, work orders, source files)
            const customerMatch = model.relatedCustomers && model.relatedCustomers.some(customer => 
              customer.toLowerCase().includes(this.searchTerm.toLowerCase()));
              
            const salesOrderMatch = model.relatedSalesOrders && model.relatedSalesOrders.some(so => 
              so.toString().toLowerCase().includes(this.searchTerm.toLowerCase()));
              
            const workOrderMatch = model.relatedWorkOrders && model.relatedWorkOrders.some(wo => 
              wo.toString().toLowerCase().includes(this.searchTerm.toLowerCase()));
              
            const sourceFileMatch = model.relatedSourceFiles && model.relatedSourceFiles.some(sourceFile => 
              sourceFile.toLowerCase().includes(this.searchTerm.toLowerCase()));
            
            // Return true if any field matches
            return fileNameMatch || displayNameMatch || descriptionMatch || 
                   customerMatch || salesOrderMatch || workOrderMatch || sourceFileMatch;
          } catch (e) {
            console.warn('Error filtering model:', e);
            return false;
          }
        }) : sortedModels;
      
      console.log(`After filtering: ${filteredModels.length} models matched search term: "${this.searchTerm}"`);
      
      // Show message if no results found
      if (filteredModels.length === 0) {
        container.innerHTML = `<p>No models found matching "${this.searchTerm}". <a href="#" id="reset-search">Clear search</a></p>`;
        
        // Add event listener to the reset link
        const resetLink = container.querySelector('#reset-search');
        if (resetLink) {
          resetLink.addEventListener('click', (e) => {
            e.preventDefault();
            const searchInput = document.getElementById('model-search');
            if (searchInput) searchInput.value = '';
            this.searchTerm = '';
            this.renderModelsList();
          });
        }
        return;
      }
      
      // Create model items for filtered models
      filteredModels.forEach(model => {
        try {
          const item = document.createElement('div');
          item.className = `model-item${model.id === this.activeModelId ? ' active' : ''}`;
          item.dataset.id = model.id;
          
          // Status class (with fallback to 'unknown')
          const status = model.status || 'unknown';
          const statusClass = `status-${status}`;
          
          // Get display name - use custom displayName if available, otherwise use fileName
          const fileName = model.fileName || 'Unnamed Model';
          const displayNameText = model.displayName || fileName;
          
          // Highlight search terms in all fields if a search is active
          let displayName = displayNameText;
          let modelFileName = model.fileName || 'Unnamed Model';
          let description = model.description || '';
          
          if (this.searchTerm) {
            try {
              // Create regex for highlighting, escaping special characters
              const regex = new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
              
              // Highlight in display name
              displayName = displayNameText.replace(regex, '<span class="highlight">$1</span>');
              
              // Highlight in file name
              modelFileName = modelFileName.replace(regex, '<span class="highlight">$1</span>');
              
              // Highlight in description if it exists
              if (description) {
                description = description.replace(regex, '<span class="highlight">$1</span>');
              }
            } catch (e) {
              console.warn('Error highlighting search term:', e);
              // Use fallbacks if highlighting fails
              displayName = displayNameText;
              modelFileName = model.fileName || 'Unnamed Model';
              description = model.description || '';
            }
          }
          
          // Check if this model has KBOM data
          // Check model KBOM data
          
          const hasKbomData = (model.relatedCustomers && model.relatedCustomers.length > 0) || 
                             (model.relatedSalesOrders && model.relatedSalesOrders.length > 0) ||
                             (model.relatedWorkOrders && model.relatedWorkOrders.length > 0) ||
                             (model.relatedSourceFiles && model.relatedSourceFiles.length > 0);
          const customersList = model.relatedCustomers && model.relatedCustomers.length > 0 ? 
            model.relatedCustomers.join(', ') : '';
          const soList = model.relatedSalesOrders && model.relatedSalesOrders.length > 0 ? 
            model.relatedSalesOrders.join(', ') : '';
          const woList = model.relatedWorkOrders && model.relatedWorkOrders.length > 0 ?
            model.relatedWorkOrders.join(', ') : '';
          const sourceFileList = model.relatedSourceFiles && model.relatedSourceFiles.length > 0 ?
            model.relatedSourceFiles.join(', ') : '';
          
          // Build item content with highlighted search matches and KBOM data if available
          item.innerHTML = `
            <div class="model-item-content">
              <div class="model-item-header">
                <div class="model-name">${displayName}</div>
              </div>
              <div class="model-filename">${modelFileName}</div>
              ${description ? `<div class="model-description">${description}</div>` : ''}
              ${hasKbomData || (model.kboms && model.kboms.length > 0) ? `
                <div class="model-kbom-info">
                  ${customersList ? `<div class="model-customer"><strong>Customer:</strong> ${this.searchTerm ? customersList.replace(new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>') : customersList}</div>` : ''}
                  ${soList ? `<div class="model-so"><strong>Sales Order:</strong> ${this.searchTerm ? soList.replace(new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>') : soList}</div>` : ''}
                  ${woList ? `<div class="model-wo"><strong>Work Order:</strong> ${this.searchTerm ? woList.replace(new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>') : woList}</div>` : ''}
                  ${sourceFileList ? `<div class="model-source-file"><strong>Source File:</strong> ${this.searchTerm ? sourceFileList.replace(new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>') : sourceFileList}</div>` : ''}
                </div>
              ` : ''}
              <div class="model-footer">
                <div class="model-status ${statusClass}">${this.formatStatus(status)}</div>
                <div class="model-actions">
                  <button class="edit-button" data-id="${model.id}" title="Edit model info">
                    ✏️
                  </button>
                  <button class="delete-button" data-id="${model.id}" title="Remove model">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `;
          
          // Add click event for the item
          item.addEventListener('click', (e) => {
            // Only trigger model selection if not clicking action buttons
            if (!e.target.matches('.delete-button')) {
              this.onModelItemClick(model.id);
            }
          });
          
          // Add delete button click event
          const deleteButton = item.querySelector('.delete-button');
          if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent the item click event
              this.onDeleteButtonClick(model.id, model.fileName || 'Unnamed Model');
            });
          }
          
          // Add edit button click event
          const editButton = item.querySelector('.edit-button');
          if (editButton) {
            editButton.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent the item click event
              this.onEditButtonClick(model.id);
            });
          }
          
          container.appendChild(item);
        } catch (modelError) {
          console.error('Error rendering model item:', modelError);
          // Continue with next model
        }
      });
    } catch (renderError) {
      console.error('Error in final rendering step:', renderError);
      
      // Try to show a minimal error message
      try {
        const container = document.getElementById(this.modelsListId);
        if (container) {
          container.innerHTML = '<p>Error rendering model list. See console for details.</p>';
        }
      } catch (e) {
        // Nothing more we can do
      }
    }
  }

  /**
   * Format the model status for display
   */
  formatStatus(status) {
    switch(status) {
      case 'uploaded': return 'Uploaded';
      case 'translating': return 'Processing...';
      case 'ready': return 'Ready to View';
      case 'failed': return 'Translation Failed';
      case 'unknown': return 'Status Unknown';
      default: return status;
    }
  }

  /**
   * Handle model item click
   */
  onModelItemClick(modelId) {
    try {
      console.log(`Model clicked: ${modelId}`);
      
      // Find the model with safer comparison
      const model = this.models.find(m => {
        try {
          return m && m.id && m.id === modelId;
        } catch (e) {
          console.warn('Error comparing model IDs:', e);
          return false;
        }
      });
      
      if (!model) {
        console.warn(`Model with ID ${modelId} not found in the models list`);
        return;
      }
      
      // Get display name with fallback to fileName
      const displayName = model.displayName || model.fileName || 'Unnamed';
      console.log(`Selected model: ${displayName} (${model.status || 'unknown status'})`);
      
      // Update active model
      this.activeModelId = modelId;
      this.renderModelsList();
      
      // If status is unknown, check the real status
      if (model.status === 'unknown') {
        console.log(`Starting status polling for model with unknown status: ${modelId}`);
        this.pollTranslationStatus(modelId);
      }
      
      // Dispatch event for loading the model in the viewer
      try {
        const event = new CustomEvent('modelSelected', {
          detail: { model }
        });
        document.dispatchEvent(event);
        console.log('modelSelected event dispatched');
      } catch (eventError) {
        console.error('Error dispatching model selection event:', eventError);
      }
    } catch (error) {
      console.error('Error in model click handler:', error);
    }
  }

  /**
   * Poll for translation status
   */
  pollTranslationStatus(modelId) {
    // Clear any existing interval for this model
    if (this.pollIntervals[modelId]) {
      clearInterval(this.pollIntervals[modelId]);
    }
    
    console.log(`Starting translation status polling for model ${modelId}`);
    
    // Set up polling interval
    this.pollIntervals[modelId] = setInterval(async () => {
      try {
        console.log(`Checking translation status for model ${modelId}...`);
        const response = await fetch(`/api/advapi/models/${modelId}/status`);
        if (!response.ok) {
          throw new Error('Failed to get translation status');
        }
        
        const data = await response.json();
        console.log(`Translation status for model ${modelId}: ${data.status}`);
        
        // Find the model in our list
        const modelIndex = this.models.findIndex(m => m.id === modelId);
        if (modelIndex === -1) {
          console.log(`Model ${modelId} not found in models list, stopping polling`);
          clearInterval(this.pollIntervals[modelId]);
          delete this.pollIntervals[modelId];
          return;
        }
        
        // Get old status for comparison
        const oldStatus = this.models[modelIndex].status;
        
        // Update the model status
        this.models[modelIndex].status = data.status;
        
        // Re-render the models list
        this.renderModelsList();
        
        // If status changed from translating to ready, and this is the active model, reload it
        if (oldStatus !== 'ready' && data.status === 'ready' && modelId === this.activeModelId) {
          console.log(`Model ${modelId} is now ready and is the active model. Triggering reload.`);
          
          // Wait a moment for rendering to complete
          setTimeout(() => {
            // Dispatch event to reload model in viewer
            const model = this.models[modelIndex];
            const event = new CustomEvent('modelSelected', {
              detail: { model }
            });
            document.dispatchEvent(event);
            console.log('Dispatched modelSelected event to reload ready model');
            
            // Update viewer display if previously showing "translation in progress"
            const viewerDiv = document.getElementById('viewer');
            if (viewerDiv && viewerDiv.innerHTML.includes('Translation Started')) {
              viewerDiv.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #666;">
                  <h3 style="margin-bottom: 1rem;">Translation Complete</h3>
                  <p>The model has been successfully translated and is loading...</p>
                </div>
              `;
            }
          }, 1000);
        }
        
        // If translation is complete or failed, stop polling
        if (data.status === 'ready' || data.status === 'failed') {
          console.log(`Translation ${data.status} for model ${modelId}, stopping polling`);
          clearInterval(this.pollIntervals[modelId]);
          delete this.pollIntervals[modelId];
          
          const statusDiv = document.getElementById(this.uploadStatusId);
          if (statusDiv && statusDiv.textContent.includes('Translation in progress')) {
            statusDiv.textContent = data.status === 'ready' ? 
              'Translation complete! Model is ready to view.' : 
              `Translation failed: ${data.error || 'Unknown error'}`;
          }
          
          // Show notification about translation completion
          if (data.status === 'ready') {
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = '#4CAF50';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            notification.style.zIndex = '1000';
            notification.innerHTML = `
              <strong>Translation Complete</strong>
              <p>Model "${this.models[modelIndex].fileName}" is now ready to view</p>
            `;
            document.body.appendChild(notification);
            
            // Remove notification after 5 seconds
            setTimeout(() => {
              notification.style.opacity = '0';
              notification.style.transition = 'opacity 0.5s';
              setTimeout(() => notification.remove(), 500);
            }, 5000);
          }
        }
      } catch (error) {
        console.error('Error polling translation status:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get all models
   */
  getModels() {
    return this.models;
  }

  /**
   * Get the active model
   */
  getActiveModel() {
    return this.models.find(m => m.id === this.activeModelId);
  }
  
  // Share functionality removed
  
  /**
   * Handle delete button click
   */
  async onDeleteButtonClick(modelId, modelName) {
    try {
      console.log(`Delete button clicked for model: ${modelId} (${modelName})`);
      
      // Confirm deletion with more info
      const confirmMessage = `Are you sure you want to remove "${modelName}" from your list?\n\nNote: This only removes the model from your list but it will still exist in Autodesk's system.`;
      
      if (!confirm(confirmMessage)) {
        console.log('Deletion cancelled by user');
        return;
      }
      
      // Prompt for password
      const password = prompt("Please enter admin password to delete this model:", "");
      
      // Check if password was provided
      if (!password) {
        console.log('Deletion cancelled - no password provided');
        alert('Password is required to delete models.');
        return;
      }
      
      console.log(`Sending delete request for model ${modelId}...`);
      
      // Send delete request to API with password
      const response = await fetch(`/api/advapi/models/${modelId}?password=${encodeURIComponent(password)}`, {
        method: 'DELETE',
        headers: {
          'X-Upload-Password': password
        }
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to remove model';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // Show a more specific message for authentication errors
          if (response.status === 401) {
            errorMessage = 'Password is required to delete models.';
          } else if (response.status === 403) {
            errorMessage = 'Invalid password. Please try again with the correct password.';
          }
        } catch (jsonError) {
          console.warn('Could not parse error response:', jsonError);
          
          // Show a more specific message for authentication errors even if JSON parsing fails
          if (response.status === 401) {
            errorMessage = 'Password is required to delete models.';
          } else if (response.status === 403) {
            errorMessage = 'Invalid password. Please try again with the correct password.';
          }
        }
        throw new Error(errorMessage);
      }
      
      console.log(`Delete request successful for model ${modelId}`);
      
      // Find the model index
      const modelIndex = this.models.findIndex(m => {
        try {
          return m && m.id === modelId;
        } catch (e) {
          return false;
        }
      });
      
      if (modelIndex !== -1) {
        // Remove the model from our list
        this.models.splice(modelIndex, 1);
        console.log(`Removed model from local array at index ${modelIndex}`);
        
        // Re-render the models list
        this.renderModelsList();
        
        // If this was the active model, clear the viewer
        if (this.activeModelId === modelId) {
          console.log('Removing the currently active model, will clear viewer');
          this.activeModelId = null;
          
          // Dispatch event to notify that the active model was deleted
          try {
            const event = new CustomEvent('modelDeleted', {
              detail: { modelId }
            });
            document.dispatchEvent(event);
            console.log('modelDeleted event dispatched');
          } catch (eventError) {
            console.error('Error dispatching model deleted event:', eventError);
          }
        }
        
        // Show success message
        alert(`Model "${modelName}" removed from your list`);
      } else {
        console.warn(`Model ${modelId} not found in local array after deletion`);
        // Still show success since the API call succeeded
        alert(`Model removed from the server`);
        // Refresh the model list to ensure it's in sync with the server
        await this.loadModels();
      }
    } catch (error) {
      console.error('Error removing model:', error);
      alert(`Error removing model: ${error.message}`);
    }
  }
  
  /**
   * Handle edit button click
   */
  onEditButtonClick(modelId) {
    try {
      console.log(`Edit button clicked for model: ${modelId}`);
      
      // Find the model
      const model = this.models.find(m => m.id === modelId);
      if (!model) {
        console.error(`Model with ID ${modelId} not found`);
        return;
      }
      
      // Get form elements
      const form = document.getElementById('edit-model-form');
      const idInput = document.getElementById('edit-model-id');
      const displayNameInput = document.getElementById('edit-model-displayname');
      const descriptionInput = document.getElementById('edit-model-description');
      
      // Set form values
      if (idInput) idInput.value = model.id;
      if (displayNameInput) displayNameInput.value = model.displayName || '';
      if (descriptionInput) descriptionInput.value = model.description || '';
      
      // Show modal
      this.editModal.style.display = 'block';
    } catch (error) {
      console.error('Error handling edit button click:', error);
      alert(`Error opening edit form: ${error.message}`);
    }
  }
  
  /**
   * Handle edit form submission
   */
  async handleEditFormSubmit(e) {
    e.preventDefault();
    
    try {
      // Get form data
      const form = e.target;
      const modelId = document.getElementById('edit-model-id').value;
      const displayName = document.getElementById('edit-model-displayname').value;
      const description = document.getElementById('edit-model-description').value;
      const password = document.getElementById('edit-model-password').value;
      
      if (!modelId) {
        throw new Error('Missing model ID');
      }
      
      if (!password) {
        throw new Error('Admin password is required');
      }
      
      console.log(`Sending update request for model ${modelId}...`);
      
      // Show updating status
      const saveButton = form.querySelector('button[type="submit"]');
      const originalButtonText = saveButton.textContent;
      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;
      
      try {
        // Use URLSearchParams approach which is more reliable for form data
        console.log('Using URLSearchParams for form submission...');
        const params = new URLSearchParams();
        params.append('displayName', displayName);
        params.append('description', description);
        params.append('password', password);
        
        console.log('Edit form debug - Password provided:', !!password);
        console.log('Edit form debug - Password length:', password ? password.length : 0);
        console.log('Edit form debug - Form data params:', Array.from(params.keys()));
        
        // Send update request to API
        console.log(`Edit form debug - Sending PATCH request to /api/advapi/models/${modelId}/metadata`);
        console.log('Edit form debug - Content-Type:', 'application/x-www-form-urlencoded');
        
        // Add password to headers as a fallback mechanism
        const headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        
        if (password) {
          headers['X-Upload-Password'] = password;
          console.log('Edit form debug - Added password to request headers as fallback');
        }
        
        const response = await fetch(`/api/advapi/models/${modelId}/metadata`, {
          method: 'PATCH',
          headers: headers,
          body: params
        });
        
        if (!response.ok) {
          let errorMessage = 'Failed to update model';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (jsonError) {
            console.warn('Could not parse error response:', jsonError);
          }
          throw new Error(errorMessage);
        }
        
        // Get updated model data with better error handling
        let updatedModelData;
        try {
          updatedModelData = await response.json();
          console.log('Update response:', updatedModelData);
        } catch (jsonError) {
          console.error('Error parsing response JSON:', jsonError);
          throw new Error('Invalid response from server when updating model');
        }
        
        // Always log the full response for debugging
        console.log('Full update response:', updatedModelData);
        
        // Update the model in our local array
        const modelIndex = this.models.findIndex(m => m.id === modelId);
        if (modelIndex !== -1) {
          // First update the basic fields we know we changed
          this.models[modelIndex].displayName = displayName;
          this.models[modelIndex].description = description;
          
          // Use any other fields returned from the API
          if (updatedModelData && updatedModelData.metadata) {
            let metadata = updatedModelData.metadata;
            
            // Check if metadata is a complete model object or just metadata fields
            if (typeof metadata === 'object') {
              // If it's a complete model object (from database or models.json)
              if (metadata.id) {
                console.log('Updating with complete model object');
                
                // Preserve fields that might not be in the response
                const preserved = { ...this.models[modelIndex] };
                
                // Apply all fields from the response
                Object.keys(metadata).forEach(key => {
                  this.models[modelIndex][key] = metadata[key];
                });
                
                // Restore any critical fields that might be missing in the response
                if (!this.models[modelIndex].urn && preserved.urn) {
                  this.models[modelIndex].urn = preserved.urn;
                }
              } else {
                // It's just metadata fields
                console.log('Updating with metadata fields only');
                Object.keys(metadata).forEach(key => {
                  this.models[modelIndex][key] = metadata[key];
                });
              }
            }
          }
          
          console.log(`Updated model at index ${modelIndex}:`, this.models[modelIndex]);
          
          // Re-render the models list
          this.renderModelsList();
        } else {
          console.warn(`Model with ID ${modelId} not found in local array after update`);
        }
        
        // Hide modal
        this.editModal.style.display = 'none';
        
        // Reset form
        form.reset();
        
        // Show success message
        alert('Model information updated successfully');
      } finally {
        // Restore button state
        saveButton.textContent = originalButtonText;
        saveButton.disabled = false;
      }
    } catch (error) {
      console.error('Error updating model:', error);
      alert(`Error updating model: ${error.message}`);
    }
  }
}