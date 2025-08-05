const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

// User controller
const UserController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await UserModel.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error in getAllUsers controller:', error);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    const { id } = req.params;
    
    try {
      const user = await UserModel.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ error: `User with ID ${id} not found` });
      }
      
      res.json(user);
    } catch (error) {
      console.error(`Error in getUserById controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  },

  // Get users by role
  getUsersByRole: async (req, res) => {
    const { role } = req.params;
    
    try {
      const users = await UserModel.getUsersByRole(role);
      res.json(users);
    } catch (error) {
      console.error(`Error in getUsersByRole controller for role ${role}:`, error);
      res.status(500).json({ error: 'Failed to retrieve users by role' });
    }
  },

  // Get users by department
  getUsersByDepartment: async (req, res) => {
    const { department } = req.params;
    
    try {
      const users = await UserModel.getUsersByDepartment(department);
      res.json(users);
    } catch (error) {
      console.error(`Error in getUsersByDepartment controller for department ${department}:`, error);
      res.status(500).json({ error: 'Failed to retrieve users by department' });
    }
  },

  // Create a new user
  createUser: async (req, res) => {
    const userData = req.body;
    
    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['username', 'email', 'password'] 
      });
    }
    
    try {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Replace password with password_hash
      const userDataWithHash = {
        ...userData,
        password_hash: hashedPassword
      };
      delete userDataWithHash.password; // Remove the plain text password
      
      const newUser = await UserModel.createUser(userDataWithHash);
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error in createUser controller:', error);
      
      // Check for duplicate key violation
      if (error.code === '23505') {
        if (error.detail.includes('username')) {
          return res.status(409).json({ error: 'Username already exists' });
        } else if (error.detail.includes('email')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
      }
      
      res.status(500).json({ error: 'Failed to create user' });
    }
  },

  // Update a user
  updateUser: async (req, res) => {
    const { id } = req.params;
    const userData = req.body;
    
    try {
      // If password is being updated, hash it
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        // Replace password with password_hash
        userData.password_hash = hashedPassword;
        delete userData.password; // Remove the plain text password
      }
      
      const updatedUser = await UserModel.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: `User with ID ${id} not found` });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error(`Error in updateUser controller for ID ${id}:`, error);
      
      // Check for duplicate key violation
      if (error.code === '23505') {
        if (error.detail.includes('username')) {
          return res.status(409).json({ error: 'Username already exists' });
        } else if (error.detail.includes('email')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
      }
      
      res.status(500).json({ error: 'Failed to update user' });
    }
  },

  // Delete a user
  deleteUser: async (req, res) => {
    const { id } = req.params;
    
    try {
      const deletedUser = await UserModel.deleteUser(id);
      
      if (!deletedUser) {
        return res.status(404).json({ error: `User with ID ${id} not found` });
      }
      
      res.json({ message: 'User deleted successfully', user: deletedUser });
    } catch (error) {
      console.error(`Error in deleteUser controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  },

  // Get all departments
  getAllDepartments: async (req, res) => {
    try {
      const departments = await UserModel.getAllDepartments();
      res.json(departments);
    } catch (error) {
      console.error('Error in getAllDepartments controller:', error);
      res.status(500).json({ error: 'Failed to retrieve departments' });
    }
  },

  // Update user app permissions
  updateUserPermissions: async (req, res) => {
    const { id } = req.params;
    const { canAccessProjectManagement, canAccess3dViewer } = req.body;

    try {
      // Build update object with only provided fields
      const updateData = {};
      if (canAccessProjectManagement !== undefined) {
        updateData.can_access_project_management = canAccessProjectManagement;
      }
      if (canAccess3dViewer !== undefined) {
        updateData.can_access_3d_viewer = canAccess3dViewer;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No permissions to update' });
      }

      const updatedUser = await UserModel.updateUser(id, updateData);

      if (!updatedUser) {
        return res.status(404).json({ error: `User with ID ${id} not found` });
      }

      res.json({
        message: 'User permissions updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error(`Error in updateUserPermissions controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to update user permissions' });
    }
  }
};

module.exports = UserController;
