const projectModel = require('../models/projectModel');

const projectController = {
  // Get all projects
  getAllProjects: async (req, res) => {
    try {
      const projects = await projectModel.getAllProjects();
      res.status(200).json(projects);
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({ error: 'Failed to get projects' });
    }
  },

  // Get project by ID
  getProjectById: async (req, res) => {
    try {
      const { id } = req.params;
      const project = await projectModel.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.status(200).json(project);
    } catch (error) {
      console.error(`Error getting project with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get project' });
    }
  },

  // Create a new project
  createProject: async (req, res) => {
    try {
      const projectData = req.body;
      
      // Validate required fields
      if (!projectData.project_number || !projectData.customer_id || !projectData.status) {
        return res.status(400).json({ 
          error: 'Missing required fields: project_number, customer_id, and status are required' 
        });
      }
      
      const newProject = await projectModel.createProject(projectData);
      
      // Get WebSocket server instance and notify clients
      const wss = req.app.get('wss');
      if (wss) {
        wss.notifyProjectCreated(newProject);
      }
      
      res.status(201).json(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Project number already exists' });
      }
      
      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Referenced customer or user does not exist' });
      }
      
      res.status(500).json({ error: 'Failed to create project' });
    }
  },

  // Update a project
  updateProject: async (req, res) => {
    try {
      const { id } = req.params;
      const projectData = req.body;
      
      const updatedProject = await projectModel.updateProject(id, projectData);
      
      if (!updatedProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get WebSocket server instance and notify clients
      const wss = req.app.get('wss');
      if (wss) {
        wss.notifyProjectUpdated(updatedProject);
      }
      
      res.status(200).json(updatedProject);
    } catch (error) {
      console.error(`Error updating project with ID ${req.params.id}:`, error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Project number already exists' });
      }
      
      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Referenced customer or user does not exist' });
      }
      
      res.status(500).json({ error: 'Failed to update project' });
    }
  },

  // Delete a project
  deleteProject: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedProject = await projectModel.deleteProject(id);
      
      if (!deletedProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get WebSocket server instance and notify clients
      const wss = req.app.get('wss');
      if (wss) {
        wss.notifyProjectDeleted(parseInt(id));
      }
      
      res.status(200).json({ message: 'Project deleted successfully', project: deletedProject });
    } catch (error) {
      console.error(`Error deleting project with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  },

  // Get project progress
  getProjectProgress: async (req, res) => {
    try {
      const { id } = req.params;
      const progress = await projectModel.getProjectProgress(id);
      
      if (!progress) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.status(200).json(progress);
    } catch (error) {
      console.error(`Error getting progress for project with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get project progress' });
    }
  }
};

module.exports = projectController;
