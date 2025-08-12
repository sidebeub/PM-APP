const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { auth, adminAuth } = require('../middleware/authEnhanced');
const { taskOwnershipAuth } = require('../middleware/ownershipAuth');

// GET /api/tasks - Get all tasks
router.get('/', auth, taskController.getAllTasks);

// GET /api/tasks/:id - Get task by ID
router.get('/:id', auth, taskOwnershipAuth, taskController.getTaskById);

// POST /api/tasks - Create a new task
router.post('/', auth, taskController.createTask);

// PUT /api/tasks/:id - Update a task
router.put('/:id', auth, taskOwnershipAuth, taskController.updateTask);

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', auth, taskOwnershipAuth, taskController.deleteTask);

// GET /api/tasks/project/:projectId - Get tasks by project ID
router.get('/project/:projectId', auth, taskController.getTasksByProject);

// GET /api/tasks/:id/dependencies - Get task dependencies
router.get('/:id/dependencies', auth, taskOwnershipAuth, taskController.getTaskDependencies);

// POST /api/tasks/:id/dependencies - Add task dependency
router.post('/:id/dependencies', auth, taskOwnershipAuth, taskController.addTaskDependency);

// DELETE /api/tasks/:id/dependencies/:dependencyId - Remove task dependency
router.delete('/:id/dependencies/:dependencyId', auth, taskOwnershipAuth, taskController.removeTaskDependency);

module.exports = router;
