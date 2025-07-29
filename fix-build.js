const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Fixing localhost references in build files...');

// Find all JavaScript files in the build directory
const jsFiles = glob.sync('build/static/js/*.js');

jsFiles.forEach(file => {
  console.log(`Processing ${file}...`);
  
  // Read the file
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace localhost:3001 with empty string (making URLs relative)
  const originalLength = content.length;
  content = content.replace(/http:\/\/localhost:3001/g, '');
  
  if (content.length !== originalLength) {
    console.log(`✅ Fixed localhost references in ${file}`);
    fs.writeFileSync(file, content);
  } else {
    console.log(`ℹ️  No localhost references found in ${file}`);
  }
});

console.log('Build fix complete!');
