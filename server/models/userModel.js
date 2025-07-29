const db = require('../db/connection');

// User model
const UserModel = {
  // Get all users
  getAllUsers: async () => {
    try {
      const result = await db.query(`
        SELECT 
          id,
          username,
          email,
          role,
          department,
          created_at,
          updated_at
        FROM 
          users
        ORDER BY 
          username ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const result = await db.query(`
        SELECT 
          id,
          username,
          email,
          role,
          department,
          created_at,
          updated_at
        FROM 
          users
        WHERE 
          id = $1
      `, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in getUserById for ID ${id}:`, error);
      throw error;
    }
  },

  // Get users by role
  getUsersByRole: async (role) => {
    try {
      const result = await db.query(`
        SELECT 
          id,
          username,
          email,
          role,
          department,
          created_at,
          updated_at
        FROM 
          users
        WHERE 
          role = $1
        ORDER BY 
          username ASC
      `, [role]);
      return result.rows;
    } catch (error) {
      console.error(`Error in getUsersByRole for role ${role}:`, error);
      throw error;
    }
  },

  // Get users by department
  getUsersByDepartment: async (department) => {
    try {
      const result = await db.query(`
        SELECT 
          id,
          username,
          email,
          role,
          department,
          created_at,
          updated_at
        FROM 
          users
        WHERE 
          department = $1
        ORDER BY 
          username ASC
      `, [department]);
      return result.rows;
    } catch (error) {
      console.error(`Error in getUsersByDepartment for department ${department}:`, error);
      throw error;
    }
  },

  // Create a new user
  createUser: async (userData) => {
    const {
      username,
      email,
      password_hash,
      role,
      department
    } = userData;

    try {
      const result = await db.query(`
        INSERT INTO users (
          username,
          email,
          password_hash,
          role,
          department,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, username, email, role, department, created_at, updated_at
      `, [
        username,
        email,
        password_hash,
        role || 'team_member',
        department
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  },

  // Update a user
  updateUser: async (id, userData) => {
    const {
      username,
      email,
      password_hash,
      role,
      department
    } = userData;

    // Build the query dynamically based on which fields are provided
    let query = 'UPDATE users SET ';
    const queryParams = [];
    const queryParts = [];
    
    if (username !== undefined) {
      queryParts.push(`username = $${queryParams.length + 1}`);
      queryParams.push(username);
    }
    
    if (email !== undefined) {
      queryParts.push(`email = $${queryParams.length + 1}`);
      queryParams.push(email);
    }
    
    if (password_hash !== undefined) {
      queryParts.push(`password_hash = $${queryParams.length + 1}`);
      queryParams.push(password_hash);
    }
    
    if (role !== undefined) {
      queryParts.push(`role = $${queryParams.length + 1}`);
      queryParams.push(role);
    }
    
    if (department !== undefined) {
      queryParts.push(`department = $${queryParams.length + 1}`);
      queryParams.push(department);
    }
    
    // Add updated_at timestamp
    queryParts.push(`updated_at = NOW()`);
    
    // If no fields to update, return the user unchanged
    if (queryParts.length === 1) {
      return this.getUserById(id);
    }
    
    // Complete the query
    query += queryParts.join(', ');
    query += ` WHERE id = $${queryParams.length + 1} RETURNING id, username, email, role, department, created_at, updated_at`;
    queryParams.push(id);

    try {
      const result = await db.query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in updateUser for ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a user
  deleteUser: async (id) => {
    try {
      const result = await db.query(`
        DELETE FROM users
        WHERE id = $1
        RETURNING id, username, email, role, department
      `, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in deleteUser for ID ${id}:`, error);
      throw error;
    }
  },

  // Get all departments (distinct)
  getAllDepartments: async () => {
    try {
      const result = await db.query(`
        SELECT DISTINCT department
        FROM users
        WHERE department IS NOT NULL
        ORDER BY department ASC
      `);
      return result.rows.map(row => row.department);
    } catch (error) {
      console.error('Error in getAllDepartments:', error);
      throw error;
    }
  }
};

module.exports = UserModel;
