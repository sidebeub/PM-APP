const express = require('express');
const router = express.Router();
const MilestoneController = require('../controllers/milestoneController');
const { auth, adminAuth } = require('../middleware/authEnhanced');

// GET all milestones
router.get('/', auth, MilestoneController.getAllMilestones);

// GET milestone by ID
router.get('/:id', auth, MilestoneController.getMilestoneById);

// GET milestones by project ID
router.get('/project/:projectId', auth, MilestoneController.getMilestonesByProject);

// GET milestones by department
router.get('/department/:department', auth, MilestoneController.getMilestonesByDepartment);

// POST create a new milestone - Project Managers and Admin only
router.post('/', auth, MilestoneController.createMilestone);

// PUT update a milestone - Project Managers and Admin only
router.put('/:id', auth, MilestoneController.updateMilestone);

// DELETE a milestone - Project Managers and Admin only
router.delete('/:id', auth, MilestoneController.deleteMilestone);

module.exports = router;
