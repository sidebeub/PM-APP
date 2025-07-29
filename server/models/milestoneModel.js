const db = require('../db/connection');

// Milestone model
const MilestoneModel = {
  // Get all milestones
  getAllMilestones: async () => {
    try {
      const result = await db.query(`
        SELECT 
          dm.*,
          p.project_number
        FROM 
          department_milestones dm
        JOIN 
          projects p ON dm.project_id = p.id
        ORDER BY 
          dm.planned_date ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error in getAllMilestones:', error);
      throw error;
    }
  },

  // Get milestone by ID
  getMilestoneById: async (id) => {
    try {
      const result = await db.query(`
        SELECT 
          dm.*,
          p.project_number
        FROM 
          department_milestones dm
        JOIN 
          projects p ON dm.project_id = p.id
        WHERE 
          dm.id = $1
      `, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in getMilestoneById for ID ${id}:`, error);
      throw error;
    }
  },

  // Get milestones by project ID
  getMilestonesByProject: async (projectId) => {
    try {
      const result = await db.query(`
        SELECT 
          dm.*,
          p.project_number
        FROM 
          department_milestones dm
        JOIN 
          projects p ON dm.project_id = p.id
        WHERE 
          dm.project_id = $1
        ORDER BY 
          dm.planned_date ASC
      `, [projectId]);
      return result.rows;
    } catch (error) {
      console.error(`Error in getMilestonesByProject for project ID ${projectId}:`, error);
      throw error;
    }
  },

  // Create a new milestone
  createMilestone: async (milestoneData) => {
    const {
      project_id,
      department,
      milestone_name,
      planned_date,
      actual_date,
      status
    } = milestoneData;

    try {
      const result = await db.query(`
        INSERT INTO department_milestones (
          project_id,
          department,
          milestone_name,
          planned_date,
          actual_date,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [
        project_id,
        department,
        milestone_name,
        planned_date || null,
        actual_date || null,
        status || 'Pending'
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in createMilestone:', error);
      throw error;
    }
  },

  // Update a milestone
  updateMilestone: async (id, milestoneData) => {
    const {
      project_id,
      department,
      milestone_name,
      planned_date,
      actual_date,
      status
    } = milestoneData;

    try {
      const result = await db.query(`
        UPDATE department_milestones
        SET
          project_id = COALESCE($1, project_id),
          department = COALESCE($2, department),
          milestone_name = COALESCE($3, milestone_name),
          planned_date = COALESCE($4, planned_date),
          actual_date = $5,
          status = COALESCE($6, status),
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `, [
        project_id,
        department,
        milestone_name,
        planned_date,
        actual_date, // Allow setting to null
        status,
        id
      ]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in updateMilestone for ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a milestone
  deleteMilestone: async (id) => {
    try {
      const result = await db.query(`
        DELETE FROM department_milestones
        WHERE id = $1
        RETURNING *
      `, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in deleteMilestone for ID ${id}:`, error);
      throw error;
    }
  },

  // Get milestones by department
  getMilestonesByDepartment: async (department) => {
    try {
      const result = await db.query(`
        SELECT 
          dm.*,
          p.project_number
        FROM 
          department_milestones dm
        JOIN 
          projects p ON dm.project_id = p.id
        WHERE 
          dm.department = $1
        ORDER BY 
          dm.planned_date ASC
      `, [department]);
      return result.rows;
    } catch (error) {
      console.error(`Error in getMilestonesByDepartment for department ${department}:`, error);
      throw error;
    }
  }
};

module.exports = MilestoneModel;
