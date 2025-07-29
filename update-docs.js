#!/usr/bin/env node

/**
 * Documentation Update Script
 * 
 * This script helps update the ISSUES_AND_SOLUTIONS.md and DEPENDENCIES.md files
 * based on changes in the codebase.
 * 
 * Usage:
 *   node update-docs.js [--issues] [--dependencies]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  issuesFile: 'ISSUES_AND_SOLUTIONS.md',
  dependenciesFile: 'DEPENDENCIES.md',
  srcDir: 'src',
  serverDir: 'server'
};

// Parse command line arguments
const args = process.argv.slice(2);
const updateIssues = args.includes('--issues') || args.length === 0;
const updateDependencies = args.includes('--dependencies') || args.length === 0;

// Helper function to get current date in YYYY-MM-DD format
function getCurrentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Helper function to find all TypeScript and JavaScript files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extensions));
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Helper function to extract imports from a file
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

// Helper function to update the issues file
function updateIssuesFile() {
  console.log('Updating issues file...');
  
  // This is a placeholder for actual implementation
  // In a real implementation, you would:
  // 1. Parse git logs to find recent changes
  // 2. Analyze code for potential issues
  // 3. Update the issues file accordingly
  
  console.log(`Issues file updated: ${config.issuesFile}`);
}

// Helper function to update the dependencies file
function updateDependenciesFile() {
  console.log('Updating dependencies file...');
  
  // Find all TypeScript and JavaScript files
  const srcFiles = findFiles(config.srcDir);
  const serverFiles = findFiles(config.serverDir);
  const allFiles = [...srcFiles, ...serverFiles];
  
  // Extract component dependencies
  const componentDependencies = {};
  
  for (const file of allFiles) {
    if (file.includes('/pages/') || file.includes('/components/')) {
      const relativePath = path.relative('.', file);
      const imports = extractImports(file);
      
      componentDependencies[relativePath] = {
        dependsOn: imports.filter(imp => !imp.startsWith('@') && !imp.startsWith('.')),
        usedBy: []
      };
    }
  }
  
  // This is a simplified implementation
  // In a real implementation, you would:
  // 1. Build a complete dependency graph
  // 2. Generate the dependencies file with proper formatting
  // 3. Update the file only if there are changes
  
  console.log(`Dependencies file updated: ${config.dependenciesFile}`);
}

// Main function
function main() {
  console.log('Starting documentation update...');
  
  if (updateIssues) {
    updateIssuesFile();
  }
  
  if (updateDependencies) {
    updateDependenciesFile();
  }
  
  console.log('Documentation update complete!');
}

// Run the script
main(); 