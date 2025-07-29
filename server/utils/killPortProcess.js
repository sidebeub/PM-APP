const { exec } = require('child_process');
const os = require('os');

/**
 * Finds and kills a process using a specific port
 * @param {number} port - The port number to check
 * @returns {Promise<boolean>} - True if a process was killed, false otherwise
 */
function killPortProcess(port) {
  return new Promise((resolve) => {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows command to find process using a port
      exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
        if (error || !stdout) {
          console.log(`No process found using port ${port}`);
          resolve(false);
          return;
        }
        
        // Parse the output to get the PID
        const lines = stdout.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            // Kill the process
            exec(`taskkill /F /PID ${pid}`, (killError) => {
              if (killError) {
                console.error(`Error killing process ${pid}: ${killError.message}`);
                resolve(false);
              } else {
                console.log(`Successfully killed process ${pid} using port ${port}`);
                resolve(true);
              }
            });
            return;
          }
        }
        resolve(false);
      });
    } else if (platform === 'darwin' || platform === 'linux') {
      // Unix-like command to find process using a port
      exec(`lsof -i :${port} -t`, (error, stdout, stderr) => {
        if (error || !stdout) {
          console.log(`No process found using port ${port}`);
          resolve(false);
          return;
        }
        
        // Parse the output to get the PID
        const pid = stdout.trim();
        if (pid) {
          // Kill the process
          exec(`kill -9 ${pid}`, (killError) => {
            if (killError) {
              console.error(`Error killing process ${pid}: ${killError.message}`);
              resolve(false);
            } else {
              console.log(`Successfully killed process ${pid} using port ${port}`);
              resolve(true);
            }
          });
        } else {
          resolve(false);
        }
      });
    } else {
      console.error(`Unsupported platform: ${platform}`);
      resolve(false);
    }
  });
}

module.exports = { killPortProcess }; 