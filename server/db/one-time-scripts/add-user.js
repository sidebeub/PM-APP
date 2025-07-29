const bcrypt = require('bcryptjs');
const db = require('../connection');

async function addUser() {
  try {
    // User details
    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'password123'; // Plain text password
    const role = 'admin';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('User already exists with this email. Updating password...');
      
      // Update existing user's password
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      );
      
      console.log('Password updated successfully!');
    } else {
      // Create new user
      const result = await db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [username, email, hashedPassword, role]
      );
      
      console.log(`User created successfully with ID: ${result.rows[0].id}`);
    }

    console.log('\nLogin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    
    // Close database connection
    await db.end();
    
  } catch (error) {
    console.error('Error adding user:', error);
  }
}

// Run the function
addUser(); 