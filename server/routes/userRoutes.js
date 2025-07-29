const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { auth, adminAuth } = require('../middleware/auth');

// GET all users - Admin and Project Managers only
router.get('/', auth, UserController.getAllUsers);

// GET all departments
router.get('/departments', auth, UserController.getAllDepartments);

// GET users by role - Admin only
router.get('/role/:role', adminAuth, UserController.getUsersByRole);

// GET users by department
router.get('/department/:department', auth, UserController.getUsersByDepartment);

// GET user by ID
router.get('/:id', auth, UserController.getUserById);

// POST create a new user - Admin only
router.post('/', adminAuth, UserController.createUser);

// PUT update a user - Admin only for role changes
router.put('/:id', auth, UserController.updateUser);

// DELETE a user - Admin only
router.delete('/:id', adminAuth, UserController.deleteUser);

module.exports = router;
