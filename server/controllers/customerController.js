const CustomerModel = require('../models/customerModel');

// Customer controller
const CustomerController = {
  // Get all customers
  getAllCustomers: async (req, res) => {
    try {
      const customers = await CustomerModel.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Error in getAllCustomers controller:', error);
      res.status(500).json({ error: 'Failed to retrieve customers' });
    }
  },

  // Get customer by ID
  getCustomerById: async (req, res) => {
    const { id } = req.params;
    
    try {
      const customer = await CustomerModel.getCustomerById(id);
      
      if (!customer) {
        return res.status(404).json({ error: `Customer with ID ${id} not found` });
      }
      
      res.json(customer);
    } catch (error) {
      console.error(`Error in getCustomerById controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve customer' });
    }
  },

  // Get projects by customer ID
  getProjectsByCustomerId: async (req, res) => {
    const { id } = req.params;
    
    try {
      const projects = await CustomerModel.getProjectsByCustomerId(id);
      res.json(projects);
    } catch (error) {
      console.error(`Error in getProjectsByCustomerId controller for customer ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve projects for customer' });
    }
  },

  // Create a new customer
  createCustomer: async (req, res) => {
    const customerData = req.body;
    
    // Validate required fields
    if (!customerData.name) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['name'] 
      });
    }
    
    try {
      const newCustomer = await CustomerModel.createCustomer(customerData);
      res.status(201).json(newCustomer);
    } catch (error) {
      console.error('Error in createCustomer controller:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  },

  // Update a customer
  updateCustomer: async (req, res) => {
    const { id } = req.params;
    const customerData = req.body;
    
    try {
      const updatedCustomer = await CustomerModel.updateCustomer(id, customerData);
      
      if (!updatedCustomer) {
        return res.status(404).json({ error: `Customer with ID ${id} not found` });
      }
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error(`Error in updateCustomer controller for ID ${id}:`, error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  },

  // Delete a customer
  deleteCustomer: async (req, res) => {
    const { id } = req.params;
    
    try {
      const deletedCustomer = await CustomerModel.deleteCustomer(id);
      
      if (!deletedCustomer) {
        return res.status(404).json({ error: `Customer with ID ${id} not found` });
      }
      
      res.json({ message: 'Customer deleted successfully', customer: deletedCustomer });
    } catch (error) {
      console.error(`Error in deleteCustomer controller for ID ${id}:`, error);
      
      // Check if the error is due to associated projects
      if (error.message && error.message.includes('associated projects')) {
        return res.status(409).json({ 
          error: 'Cannot delete customer with associated projects',
          message: error.message
        });
      }
      
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  },

  // Search customers by name
  searchCustomersByName: async (req, res) => {
    const { term } = req.query;
    
    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    try {
      const customers = await CustomerModel.searchCustomersByName(term);
      res.json(customers);
    } catch (error) {
      console.error(`Error in searchCustomersByName controller for term "${term}":`, error);
      res.status(500).json({ error: 'Failed to search customers' });
    }
  }
};

module.exports = CustomerController;
