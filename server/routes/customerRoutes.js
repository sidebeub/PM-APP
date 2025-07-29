const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { auth, adminAuth } = require('../middleware/auth');

// GET all customers
router.get('/', auth, CustomerController.getAllCustomers);

// GET search customers by name
router.get('/search', auth, CustomerController.searchCustomersByName);

// GET customer by ID
router.get('/:id', auth, CustomerController.getCustomerById);

// GET projects by customer ID
router.get('/:id/projects', auth, CustomerController.getProjectsByCustomerId);

// POST create a new customer - Admin and Project Managers only
router.post('/', auth, CustomerController.createCustomer);

// PUT update a customer - Admin and Project Managers only
router.put('/:id', auth, CustomerController.updateCustomer);

// DELETE a customer - Admin only
router.delete('/:id', adminAuth, CustomerController.deleteCustomer);

module.exports = router;
