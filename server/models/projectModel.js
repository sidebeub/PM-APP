const db = require('../db/connection');

const projectModel = {
  // Get all projects with customer information
  getAllProjects: async () => {
    const query = `
      SELECT p.*, c.name as customer_name, c.logo as customer_logo
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC
    `;
    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Get project by ID with customer information
  getProjectById: async (id) => {
    const query = `
      SELECT p.*, c.name as customer_name, c.logo as customer_logo
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = $1
    `;
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get project by project number with customer information
  getProjectByNumber: async (projectNumber) => {
    const query = `
      SELECT p.*, c.name as customer_name, c.logo as customer_logo
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.project_number = $1
    `;
    try {
      const result = await db.query(query, [projectNumber]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getProjectByNumber:', error);
      throw error;
    }
  },

  // Create a new project
  createProject: async (projectData) => {
    const {
      project_number,
      customer_id,
      status,
      start_date,
      expected_completion_date,
      actual_completion_date,
      shipping_date,
      order_date,
      total_budget,
      progress,
      notes,
      project_manager_id,
      project_type
    } = projectData;

    const query = `
      INSERT INTO projects (
        project_number,
        customer_id,
        status,
        start_date,
        expected_completion_date,
        actual_completion_date,
        shipping_date,
        order_date,
        total_budget,
        progress,
        notes,
        project_manager_id,
        project_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      project_number,
      customer_id,
      status || 'Pending',
      start_date,
      expected_completion_date,
      actual_completion_date,
      shipping_date,
      order_date,
      total_budget,
      progress || 0,
      notes,
      project_manager_id,
      project_type
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Update a project
  updateProject: async (id, projectData) => {
    const {
      project_number,
      customer_id,
      status,
      start_date,
      expected_completion_date,
      actual_completion_date,
      shipping_date,
      order_date,
      total_budget,
      progress,
      notes,
      project_manager_id,
      project_type
    } = projectData;

    const query = `
      UPDATE projects
      SET
        project_number = COALESCE($1, project_number),
        customer_id = COALESCE($2, customer_id),
        status = COALESCE($3, status),
        start_date = $4,
        expected_completion_date = $5,
        actual_completion_date = $6,
        shipping_date = $7,
        order_date = $8,
        total_budget = $9,
        progress = COALESCE($10, progress),
        notes = $11,
        project_manager_id = $12,
        project_type = $13
      WHERE id = $14
      RETURNING *
    `;

    const values = [
      project_number,
      customer_id,
      status,
      start_date,
      expected_completion_date,
      actual_completion_date,
      shipping_date,
      order_date,
      total_budget,
      progress,
      notes,
      project_manager_id,
      project_type,
      id
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Delete a project
  deleteProject: async (id) => {
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING *';
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get project progress
  getProjectProgress: async (id) => {
    const query = `
      SELECT
        p.id,
        p.project_number,
        p.progress as overall_progress,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
        ROUND(AVG(t.progress)) as avg_task_progress
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.id = $1
      GROUP BY p.id, p.project_number, p.progress
    `;
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
};

module.exports = projectModel;
