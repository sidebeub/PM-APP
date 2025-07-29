import api from './api';
import { DepartmentMilestone } from '../types';

// Milestone API services
export const milestoneService = {
  // Get all milestones
  getAllMilestones: async () => {
    try {
      const response = await api.get('/milestones');
      return response.data;
    } catch (error) {
      console.error('Error fetching milestones:', error);
      throw error;
    }
  },

  // Get milestones by project ID
  getMilestonesByProject: async (projectId: number) => {
    try {
      const response = await api.get(`/milestones/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching milestones for project with ID ${projectId}:`, error);
      throw error;
    }
  },

  // Get milestone by ID
  getMilestoneById: async (id: number) => {
    try {
      const response = await api.get(`/milestones/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching milestone with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new milestone
  createMilestone: async (milestoneData: Partial<DepartmentMilestone>) => {
    try {
      const response = await api.post('/milestones', milestoneData);
      return response.data;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  },

  // Update a milestone
  updateMilestone: async (id: number, milestoneData: Partial<DepartmentMilestone>) => {
    try {
      const response = await api.put(`/milestones/${id}`, milestoneData);
      return response.data;
    } catch (error) {
      console.error(`Error updating milestone with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a milestone
  deleteMilestone: async (id: number) => {
    try {
      const response = await api.delete(`/milestones/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting milestone with ID ${id}:`, error);
      throw error;
    }
  }
};

export default milestoneService;
