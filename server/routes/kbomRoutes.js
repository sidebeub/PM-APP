const express = require('express');
const router = express.Router();
const kbomController = require('../controllers/kbomController');
const { auth } = require('../middleware/authEnhanced');

// Apply authentication middleware to all routes
router.use(auth);

// Get all kbom data
router.get('/data', kbomController.getAllKbomData);

// Get unique customers from kbom
router.get('/customers', kbomController.getUniqueCustomers);

// Get unique projects from kbom
router.get('/projects', kbomController.getUniqueProjects);

// Get tasks for a specific project
router.get('/projects/:projectName/tasks', kbomController.getTasksByProject);

// Get projects for a specific customer
router.get('/customers/:customerName/projects', kbomController.getProjectsByCustomer);

// Get grouped kbom data
router.get('/grouped', kbomController.getKbomDataGrouped);

// Import specific data from kbom
router.post('/import', kbomController.importFromKbom);

// Import all data from kbom
router.post('/import-all', kbomController.importAllFromKbom);

// Import only customer and SO from kbom
router.post('/import-customer-so', kbomController.importCustomerAndSoFromKbom);

module.exports = router;