import api from './api';

export const kbomService = {
  // Get all kbom data
  getAllKbomData: async () => {
    try {
      const response = await api.get('/kbom/data');
      return response.data;
    } catch (error) {
      console.error('Error fetching kbom data:', error);
      throw error;
    }
  },

  // Get unique customers from kbom
  getUniqueCustomers: async () => {
    try {
      const response = await api.get('/kbom/customers');
      return response.data;
    } catch (error) {
      console.error('Error fetching unique customers:', error);
      throw error;
    }
  },

  // Get unique projects from kbom
  getUniqueProjects: async () => {
    try {
      const response = await api.get('/kbom/projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching unique projects:', error);
      throw error;
    }
  },

  // Get tasks for a specific project
  getTasksByProject: async (projectName: string) => {
    try {
      const response = await api.get(`/kbom/projects/${encodeURIComponent(projectName)}/tasks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks by project:', error);
      throw error;
    }
  },

  // Get projects for a specific customer
  getProjectsByCustomer: async (customerName: string) => {
    try {
      const response = await api.get(`/kbom/customers/${encodeURIComponent(customerName)}/projects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching projects by customer:', error);
      throw error;
    }
  },

  // Get grouped kbom data
  getKbomDataGrouped: async () => {
    try {
      const response = await api.get('/kbom/grouped');
      return response.data;
    } catch (error) {
      console.error('Error fetching grouped kbom data:', error);
      throw error;
    }
  },

  // Import specific data from kbom
  importFromKbom: async (data: {
    customerName: string;
    projectName: string;
    tasks: string[];
  }) => {
    try {
      const response = await api.post('/kbom/import', data);
      return response.data;
    } catch (error) {
      console.error('Error importing from kbom:', error);
      throw error;
    }
  },

  // Import all data from kbom
  importAllFromKbom: async () => {
    try {
      const response = await api.post('/kbom/import-all');
      return response.data;
    } catch (error) {
      console.error('Error importing all from kbom:', error);
      throw error;
    }
  }
}; 