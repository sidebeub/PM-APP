#!/usr/bin/env node

const { killPortProcess } = require('./killPortProcess');

// Get port from command line arguments
const port = parseInt(process.argv[2], 10);

if (isNaN(port)) {
  console.error('Please provide a valid port number');
  console.log('Usage: node killPort.js <port>');
  process.exit(1);
}

// Kill the process using the specified port
killPortProcess(port)
  .then(killed => {
    if (killed) {
      console.log(`Successfully killed process using port ${port}`);
    } else {
      console.log(`No process was found using port ${port}`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }); 