const db = require('../db/connection');

/**
 * Middleware to check if a user owns a project or has admin/project_manager role
 */
const projectOwnershipAuth = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admin and project managers can access any project
    if (userRole === 'admin' || userRole === 'project_manager') {
      return next();
    }
    
    // Check if the user is assigned to the project
    const result = await db.query(
      `SELECT p.id 
       FROM projects p
       LEFT JOIN tasks t ON p.id = t.project_id
       WHERE p.id = $1 AND (p.project_manager_id = $2 OR t.assignee_id = $2)`,
      [projectId, userId]
    );
    
    if (result.rows.length > 0) {
      return next();
    }
    
    return res.status(403).json({ message: 'Access denied: You do not have permission to access this project' });
  } catch (error) {
    console.error('Error in projectOwnershipAuth:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware to check if a user owns a task or has admin/project_manager role
 */
const taskOwnershipAuth = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admin and project managers can access any task
    if (userRole === 'admin' || userRole === 'project_manager') {
      return next();
    }
    
    // Check if the user is assigned to the task
    const result = await db.query(
      `SELECT t.id 
       FROM tasks t
       WHERE t.id = $1 AND t.assignee_id = $2`,
      [taskId, userId]
    );
    
    if (result.rows.length > 0) {
      return next();
    }
    
    return res.status(403).json({ message: 'Access denied: You do not have permission to access this task' });
  } catch (error) {
    console.error('Error in taskOwnershipAuth:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { projectOwnershipAuth, taskOwnershipAuth };
