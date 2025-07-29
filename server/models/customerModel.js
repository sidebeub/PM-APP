const db = require('../db/connection');

// Customer model
const CustomerModel = {
  // Get all customers
  getAllCustomers: async () => {
    try {
      const result = await db.query(`
        SELECT
          id,
          name,
          contact_person,
          email,
          phone,
          address,
          logo,
          created_at,
          updated_at
        FROM
          customers
        ORDER BY
          name ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error in getAllCustomers:', error);
      throw error;
    }
  },

  // Get customer by ID
  getCustomerById: async (id) => {
    try {
      const result = await db.query(`
        SELECT
          id,
          name,
          contact_person,
          email,
          phone,
          address,
          logo,
          created_at,
          updated_at
        FROM
          customers
        WHERE
          id = $1
      `, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in getCustomerById for ID ${id}:`, error);
      throw error;
    }
  },

  // Get customer by name
  getCustomerByName: async (name) => {
    try {
      const result = await db.query(`
        SELECT
          id,
          name,
          contact_person,
          email,
          phone,
          address,
          logo,
          created_at,
          updated_at
        FROM
          customers
        WHERE
          LOWER(name) = LOWER($1)
      `, [name]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in getCustomerByName for name ${name}:`, error);
      throw error;
    }
  },

  // Get projects by customer ID
  getProjectsByCustomerId: async (customerId) => {
    try {
      const result = await db.query(`
        SELECT
          p.*
        FROM
          projects p
        WHERE
          p.customer_id = $1
        ORDER BY
          p.start_date DESC
      `, [customerId]);
      return result.rows;
    } catch (error) {
      console.error(`Error in getProjectsByCustomerId for customer ID ${customerId}:`, error);
      throw error;
    }
  },

  // Create a new customer
  createCustomer: async (customerData) => {
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      logo
    } = customerData;

    try {
      const result = await db.query(`
        INSERT INTO customers (
          name,
          contact_person,
          email,
          phone,
          address,
          logo,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [
        name,
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        logo || null
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in createCustomer:', error);
      throw error;
    }
  },

  // Update a customer
  updateCustomer: async (id, customerData) => {
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      logo
    } = customerData;

    // Build the query dynamically based on which fields are provided
    let query = 'UPDATE customers SET ';
    const queryParams = [];
    const queryParts = [];

    if (name !== undefined) {
      queryParts.push(`name = $${queryParams.length + 1}`);
      queryParams.push(name);
    }

    if (contact_person !== undefined) {
      queryParts.push(`contact_person = $${queryParams.length + 1}`);
      queryParams.push(contact_person);
    }

    if (email !== undefined) {
      queryParts.push(`email = $${queryParams.length + 1}`);
      queryParams.push(email);
    }

    if (phone !== undefined) {
      queryParts.push(`phone = $${queryParams.length + 1}`);
      queryParams.push(phone);
    }

    if (address !== undefined) {
      queryParts.push(`address = $${queryParams.length + 1}`);
      queryParams.push(address);
    }

    if (logo !== undefined) {
      queryParts.push(`logo = $${queryParams.length + 1}`);
      queryParams.push(logo);
    }

    // Add updated_at timestamp
    queryParts.push(`updated_at = NOW()`);

    // If no fields to update, return the customer unchanged
    if (queryParts.length === 1) {
      return CustomerModel.getCustomerById(id);
    }

    // Complete the query
    query += queryParts.join(', ');
    query += ` WHERE id = $${queryParams.length + 1} RETURNING *`;
    queryParams.push(id);

    try {
      const result = await db.query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in updateCustomer for ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a customer
  deleteCustomer: async (id) => {
    try {
      // First check if the customer has any projects
      const projectsResult = await db.query(`
        SELECT COUNT(*) as project_count
        FROM projects
        WHERE customer_id = $1
      `, [id]);

      const projectCount = parseInt(projectsResult.rows[0].project_count);

      if (projectCount > 0) {
        throw new Error(`Cannot delete customer with ID ${id} because it has ${projectCount} associated projects.`);
      }

      // If no projects, proceed with deletion
      const result = await db.query(`
        DELETE FROM customers
        WHERE id = $1
        RETURNING *
      `, [id]);

      return result.rows[0];
    } catch (error) {
      console.error(`Error in deleteCustomer for ID ${id}:`, error);
      throw error;
    }
  },

  // Search customers by name
  searchCustomersByName: async (searchTerm) => {
    try {
      const result = await db.query(`
        SELECT
          id,
          name,
          contact_person,
          email,
          phone,
          logo
        FROM
          customers
        WHERE
          name ILIKE $1
        ORDER BY
          name ASC
      `, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      console.error(`Error in searchCustomersByName for term "${searchTerm}":`, error);
      throw error;
    }
  }
};

module.exports = CustomerModel;
