const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { auth, adminAuth } = require('../middleware/auth');
const { projectOwnershipAuth } = require('../middleware/ownershipAuth');

// GET /api/projects - Get all projects
router.get('/', auth, projectController.getAllProjects);

// GET /api/projects/:id - Get project by ID
router.get('/:id', auth, projectOwnershipAuth, projectController.getProjectById);

// POST /api/projects - Create a new project
router.post('/', auth, projectController.createProject);

// PUT /api/projects/:id - Update a project
router.put('/:id', auth, projectOwnershipAuth, projectController.updateProject);

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', auth, adminAuth, projectController.deleteProject);

// GET /api/projects/:id/progress - Get project progress
router.get('/:id/progress', auth, projectOwnershipAuth, projectController.getProjectProgress);

module.exports = router;
