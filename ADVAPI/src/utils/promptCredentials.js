const readline = require('readline');

/**
 * Prompts for database credentials from the command line
 * @returns {Promise<Object>} Object containing user and password
 */
const promptForDatabaseCredentials = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    let credentials = {};

    rl.question('Database username: ', (username) => {
      credentials.user = username;
      
      // Use a masked input for password
      process.stdout.write('Database password: ');
      let password = '';
      
      // Handle password input (with masking)
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', (char) => {
        char = char.toString();
        
        // Detect Ctrl+C
        if (char === '\u0003') {
          console.log('\nOperation canceled');
          process.exit();
        }
        
        // Detect Enter key
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          console.log('');
          credentials.password = password;
          rl.close();
          resolve(credentials);
          return;
        }
        
        // Detect backspace
        if (char === '\u0008' || char === '\u007f') {
          if (password.length > 0) {
            password = password.substring(0, password.length - 1);
            process.stdout.write('\b \b'); // Erase character from terminal
          }
          return;
        }
        
        // Add character to password and print asterisk
        password += char;
        process.stdout.write('*');
      });
    });
  });
};

module.exports = {
  promptForDatabaseCredentials
};