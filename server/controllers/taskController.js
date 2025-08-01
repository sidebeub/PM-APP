const taskModel = require('../models/taskModel');

const taskController = {
  // Get all tasks
  getAllTasks: async (req, res) => {
    try {
      const tasks = await taskModel.getAllTasks();
      res.status(200).json(tasks);
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  },

  // Get tasks by project ID
  getTasksByProject: async (req, res) => {
    try {
      const { projectId } = req.params;
      const tasks = await taskModel.getTasksByProject(projectId);
      res.status(200).json(tasks);
    } catch (error) {
      console.error(`Error getting tasks for project with ID ${req.params.projectId}:`, error);
      res.status(500).json({ error: 'Failed to get tasks for project' });
    }
  },

  // Get task by ID
  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const task = await taskModel.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.status(200).json(task);
    } catch (error) {
      console.error(`Error getting task with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get task' });
    }
  },

  // Create a new task
  createTask: async (req, res) => {
    try {
      const taskData = req.body;
      
      // Validate required fields
      if (!taskData.project_id || !taskData.title || !taskData.status || !taskData.priority) {
        return res.status(400).json({ 
          error: 'Missing required fields: project_id, title, status, and priority are required' 
        });
      }
      
      const newTask = await taskModel.createTask(taskData);
      
      // Get WebSocket server instance and notify clients
      const wss = req.app.get('wss');
      if (wss) {
        wss.notifyTaskCreated(newTask);
      }
      
      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      
      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Referenced project or user does not exist' });
      }
      
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  // Update a task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const taskData = req.body;

      console.log(`Updating task ${id} with data:`, JSON.stringify(taskData, null, 2));

      // Get the current task to compare changes
      const currentTask = await taskModel.getTaskById(id);
      if (!currentTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Clean the task data to remove any invalid fields
      const cleanTaskData = {
        project_id: taskData.project_id,
        title: taskData.title,
        description: taskData.description,
        assignee_id: taskData.assignee_id,
        status: taskData.status,
        priority: taskData.priority,
        department: taskData.department,
        start_date: taskData.start_date,
        due_date: taskData.due_date,
        completed_date: taskData.completed_date,
        progress: taskData.progress
      };

      // Validate and clamp progress value to be within 0-100 range
      if (cleanTaskData.progress !== undefined && cleanTaskData.progress !== null) {
        const progressNum = Number(cleanTaskData.progress);
        if (isNaN(progressNum)) {
          cleanTaskData.progress = 0;
        } else {
          // Clamp progress between 0 and 100
          cleanTaskData.progress = Math.max(0, Math.min(100, Math.round(progressNum)));
        }
      }

      // Remove undefined values
      Object.keys(cleanTaskData).forEach(key => {
        if (cleanTaskData[key] === undefined) {
          delete cleanTaskData[key];
        }
      });

      console.log(`Cleaned task data:`, JSON.stringify(cleanTaskData, null, 2));

      const updatedTask = await taskModel.updateTask(id, cleanTaskData);

      // Only notify if there are actual changes
      const hasChanges = Object.keys(cleanTaskData).some(key =>
        JSON.stringify(currentTask[key]) !== JSON.stringify(updatedTask[key])
      );

      // Get WebSocket server instance and notify clients only if there are changes
      const wss = req.app.get('wss');
      if (wss && hasChanges) {
        wss.notifyTaskUpdated(updatedTask);
      }

      res.status(200).json(updatedTask);
    } catch (error) {
      console.error(`Error updating task with ID ${req.params.id}:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });

      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Referenced project or user does not exist' });
      }

      // Handle invalid input syntax
      if (error.code === '22P02') {
        return res.status(400).json({ error: 'Invalid data format provided' });
      }

      res.status(500).json({ error: 'Failed to update task', details: error.message });
    }
  },

  // Delete a task
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedTask = await taskModel.deleteTask(id);
      
      if (!deletedTask) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Get WebSocket server instance and notify clients
      const wss = req.app.get('wss');
      if (wss) {
        wss.notifyTaskDeleted(parseInt(id));
      }
      
      res.status(200).json({ message: 'Task deleted successfully', task: deletedTask });
    } catch (error) {
      console.error(`Error deleting task with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },

  // Get task dependencies
  getTaskDependencies: async (req, res) => {
    try {
      const { id } = req.params;
      const dependencies = await taskModel.getTaskDependencies(id);
      res.status(200).json(dependencies);
    } catch (error) {
      console.error(`Error getting dependencies for task with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get task dependencies' });
    }
  },

  // Add task dependency
  addTaskDependency: async (req, res) => {
    try {
      const { id } = req.params;
      const { dependsOnTaskId } = req.body;
      
      if (!dependsOnTaskId) {
        return res.status(400).json({ error: 'dependsOnTaskId is required' });
      }
      
      // Check if task is trying to depend on itself
      if (parseInt(id) === parseInt(dependsOnTaskId)) {
        return res.status(400).json({ error: 'A task cannot depend on itself' });
      }
      
      const dependency = await taskModel.addTaskDependency(id, dependsOnTaskId);
      res.status(201).json(dependency);
    } catch (error) {
      console.error(`Error adding dependency for task with ID ${req.params.id}:`, error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ error: 'This dependency already exists' });
      }
      
      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Referenced task does not exist' });
      }
      
      res.status(500).json({ error: 'Failed to add task dependency' });
    }
  },

  // Remove task dependency
  removeTaskDependency: async (req, res) => {
    try {
      const { id, dependencyId } = req.params;
      const dependency = await taskModel.removeTaskDependency(id, dependencyId);
      
      if (!dependency) {
        return res.status(404).json({ error: 'Dependency not found' });
      }
      
      res.status(200).json({ message: 'Dependency removed successfully', dependency });
    } catch (error) {
      console.error(`Error removing dependency for task with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to remove task dependency' });
    }
  }
};

module.exports = taskController;
