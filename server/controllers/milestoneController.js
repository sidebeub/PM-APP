const MilestoneModel = require('../models/milestoneModel');

// Milestone controller
const MilestoneController = {
  // Get all milestones
  getAllMilestones: async (req, res) => {
    try {
      const milestones = await MilestoneModel.getAllMilestones();
      res.json(milestones);
    } catch (error) {
      console.error('Error in getAllMilestones controller:', error);
      res.status(500).json({ error: 'Failed to retrieve milestones' });
    }
  },

  // Get milestone by ID
  getMilestoneById: async (req, res) => {
    const { id } = req.params;
    
    try {
      const milestone = await MilestoneModel.getMilestoneById(id);
      
      if (!milestone) {
        return res.status(404).json({ error: `Milestone with ID ${id} not found` });
      }
      
      res.json(milestone);
    } catch (error) {
      console.error(`Error in getMilestoneById controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve milestone' });
    }
  },

  // Get milestones by project ID
  getMilestonesByProject: async (req, res) => {
    const { projectId } = req.params;
    
    try {
      const milestones = await MilestoneModel.getMilestonesByProject(projectId);
      res.json(milestones);
    } catch (error) {
      console.error(`Error in getMilestonesByProject controller for project ID ${projectId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve milestones for project' });
    }
  },

  // Create a new milestone
  createMilestone: async (req, res) => {
    const milestoneData = req.body;
    
    // Validate required fields
    if (!milestoneData.project_id || !milestoneData.department || !milestoneData.milestone_name) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['project_id', 'department', 'milestone_name'] 
      });
    }
    
    try {
      const newMilestone = await MilestoneModel.createMilestone(milestoneData);
      res.status(201).json(newMilestone);
    } catch (error) {
      console.error('Error in createMilestone controller:', error);
      res.status(500).json({ error: 'Failed to create milestone' });
    }
  },

  // Update a milestone
  updateMilestone: async (req, res) => {
    const { id } = req.params;
    const milestoneData = req.body;
    
    try {
      const updatedMilestone = await MilestoneModel.updateMilestone(id, milestoneData);
      
      if (!updatedMilestone) {
        return res.status(404).json({ error: `Milestone with ID ${id} not found` });
      }
      
      res.json(updatedMilestone);
    } catch (error) {
      console.error(`Error in updateMilestone controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to update milestone' });
    }
  },

  // Delete a milestone
  deleteMilestone: async (req, res) => {
    const { id } = req.params;
    
    try {
      const deletedMilestone = await MilestoneModel.deleteMilestone(id);
      
      if (!deletedMilestone) {
        return res.status(404).json({ error: `Milestone with ID ${id} not found` });
      }
      
      res.json({ message: 'Milestone deleted successfully', milestone: deletedMilestone });
    } catch (error) {
      console.error(`Error in deleteMilestone controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to delete milestone' });
    }
  },

  // Get milestones by department
  getMilestonesByDepartment: async (req, res) => {
    const { department } = req.params;
    
    try {
      const milestones = await MilestoneModel.getMilestonesByDepartment(department);
      res.json(milestones);
    } catch (error) {
      console.error(`Error in getMilestonesByDepartment controller for department ${department}:`, error);
      res.status(500).json({ error: 'Failed to retrieve milestones for department' });
    }
  }
};

module.exports = MilestoneController;
