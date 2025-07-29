const db = require('../db/connection');

const taskModel = {
  // Get all tasks with project, customer, and assignee information
  getAllTasks: async () => {
    const query = `
      SELECT t.*,
             p.project_number,
             c.name as customer_name,
             u.username as assignee_name,
             u.department as assignee_department
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      ORDER BY COALESCE(t.due_date, '9999-12-31'::date) ASC
    `;
    try {
      const result = await db.query(query);
      console.log('Task query results:', result.rows.map(row => ({
        id: row.id,
        title: row.title,
        project_number: row.project_number,
        customer_name: row.customer_name
      })));
      return result.rows;
    } catch (error) {
      console.error('Error in getAllTasks:', error);
      throw error;
    }
  },

  // Get tasks by project ID
  getTasksByProject: async (projectId) => {
    const query = `
      SELECT t.*,
             p.project_number,
             c.name as customer_name,
             u.username as assignee_name,
             u.department as assignee_department
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id = $1
      ORDER BY t.due_date ASC
    `;
    try {
      const result = await db.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Get task by ID with project, customer, and assignee information
  getTaskById: async (id) => {
    const query = `
      SELECT t.*,
             p.project_number,
             c.name as customer_name,
             u.username as assignee_name,
             u.department as assignee_department
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = $1
    `;
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get task by title and project ID
  getTaskByTitleAndProject: async (title, projectId) => {
    const query = `
      SELECT t.*,
             p.project_number,
             c.name as customer_name,
             u.username as assignee_name,
             u.department as assignee_department
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE LOWER(t.title) = LOWER($1) AND t.project_id = $2
    `;
    try {
      const result = await db.query(query, [title, projectId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getTaskByTitleAndProject:', error);
      throw error;
    }
  },

  // Create a new task
  createTask: async (taskData) => {
    const {
      project_id,
      title,
      description,
      assignee_id,
      status,
      priority,
      department,
      start_date,
      due_date,
      completed_date,
      progress
    } = taskData;

    const query = `
      INSERT INTO tasks (
        project_id,
        title,
        description,
        assignee_id,
        status,
        priority,
        department,
        start_date,
        due_date,
        completed_date,
        progress
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      project_id,
      title,
      description,
      assignee_id,
      status,
      priority,
      department,
      start_date,
      due_date,
      completed_date,
      progress || 0
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Update a task
  updateTask: async (id, taskData) => {
    const {
      project_id,
      title,
      description,
      assignee_id,
      status,
      priority,
      department,
      start_date,
      due_date,
      completed_date,
      progress
    } = taskData;

    const query = `
      UPDATE tasks
      SET
        project_id = COALESCE($1, project_id),
        title = COALESCE($2, title),
        description = $3,
        assignee_id = $4,
        status = COALESCE($5, status),
        priority = COALESCE($6, priority),
        department = $7,
        start_date = $8,
        due_date = $9,
        completed_date = $10,
        progress = COALESCE($11, progress)
      WHERE id = $12
      RETURNING *
    `;

    const values = [
      project_id,
      title,
      description,
      assignee_id,
      status,
      priority,
      department,
      start_date,
      due_date,
      completed_date,
      progress,
      id
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Delete a task
  deleteTask: async (id) => {
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get task dependencies
  getTaskDependencies: async (taskId) => {
    const query = `
      SELECT td.*, t.title as depends_on_task_title
      FROM task_dependencies td
      JOIN tasks t ON td.depends_on_task_id = t.id
      WHERE td.task_id = $1
    `;
    try {
      const result = await db.query(query, [taskId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Add task dependency
  addTaskDependency: async (taskId, dependsOnTaskId) => {
    const query = `
      INSERT INTO task_dependencies (task_id, depends_on_task_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    try {
      const result = await db.query(query, [taskId, dependsOnTaskId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Remove task dependency
  removeTaskDependency: async (taskId, dependsOnTaskId) => {
    const query = `
      DELETE FROM task_dependencies
      WHERE task_id = $1 AND depends_on_task_id = $2
      RETURNING *
    `;
    try {
      const result = await db.query(query, [taskId, dependsOnTaskId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
};

module.exports = taskModel;
