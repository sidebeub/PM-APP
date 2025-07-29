# Server Utilities

This directory contains utility scripts for the server.

## Port Management Utilities

### killPortProcess.js

A utility module that can find and kill processes using specific ports. This is used internally by the server to automatically free up ports before starting.

```javascript
const { killPortProcess } = require('./killPortProcess');

// Kill a process using port 3001
killPortProcess(3001)
  .then(killed => {
    if (killed) {
      console.log('Process killed successfully');
    } else {
      console.log('No process was found using the port');
    }
  });
```

### killPort.js

A command-line script that can be run directly to kill processes on specific ports.

```bash
# Kill a process using port 3001
node killPort.js 3001

# Or use the npm script
npm run kill-port 3001
```

## Usage

These utilities are particularly useful when:

1. The server fails to start because a port is already in use
2. You need to manually free up a port for development
3. You want to ensure a clean server startup

The server automatically uses these utilities during startup to ensure it can bind to the required ports.

## Platform Support

The utilities work on:
- Windows
- macOS
- Linux

Each platform uses the appropriate commands to find and kill processes using specific ports. 