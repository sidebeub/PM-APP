/**
 * Convert models.json to model_descriptions.json
 * This script extracts descriptions from models.json and creates a new file with just the descriptions
 */

const fs = require('fs');
const path = require('path');

// Path to the old models.json file
const modelsJsonPath = path.join(__dirname, '../../models.json');

// Path to the new model_descriptions.json file
const descriptionsJsonPath = path.join(__dirname, '../data/model_descriptions.json');

// Load models from file
try {
  console.log('Reading models from:', modelsJsonPath);
  const data = fs.readFileSync(modelsJsonPath, 'utf8');
  const models = JSON.parse(data);
  console.log(`Loaded ${models.length} models from storage`);

  // Create descriptions object
  const descriptions = {};
  
  // Extract descriptions
  models.forEach(model => {
    if (model.description) {
      // Use model ID as key and description as value
      descriptions[model.id] = model.description;
      console.log(`Found description for model ${model.id}: ${model.description.substring(0, 30)}...`);
    }
    
    // Also add a reference using the objectKey as an alternative key
    if (model.objectKey && model.description) {
      descriptions[model.objectKey] = model.description;
    }
  });
  
  // Save descriptions to file
  try {
    fs.writeFileSync(descriptionsJsonPath, JSON.stringify(descriptions, null, 2));
    console.log(`Saved descriptions for ${Object.keys(descriptions).length} models to ${descriptionsJsonPath}`);
  } catch (saveError) {
    console.error('Error saving descriptions to file:', saveError);
  }
} catch (error) {
  console.error('Error processing models.json:', error);
}