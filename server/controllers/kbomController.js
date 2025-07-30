const kbomModel = require('../models/kbomModel');
const customerModel = require('../models/customerModel');
const projectModel = require('../models/projectModel');
const taskModel = require('../models/taskModel');

const kbomController = {
  // Get all kbom data
  getAllKbomData: async (req, res) => {
    try {
      const data = await kbomModel.getAllKbomData();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error getting kbom data:', error);
      res.status(500).json({ error: 'Failed to get kbom data' });
    }
  },

  // Get unique customers from kbom
  getUniqueCustomers: async (req, res) => {
    try {
      const customers = await kbomModel.getUniqueCustomers();
      res.status(200).json(customers);
    } catch (error) {
      console.error('Error getting unique customers:', error);
      res.status(500).json({ error: 'Failed to get unique customers' });
    }
  },

  // Get unique projects from kbom
  getUniqueProjects: async (req, res) => {
    try {
      const projects = await kbomModel.getUniqueProjects();
      res.status(200).json(projects);
    } catch (error) {
      console.error('Error getting unique projects:', error);
      res.status(500).json({ error: 'Failed to get unique projects' });
    }
  },

  // Get tasks for a specific project
  getTasksByProject: async (req, res) => {
    try {
      const { projectName } = req.params;
      const tasks = await kbomModel.getTasksByProject(projectName);
      res.status(200).json(tasks);
    } catch (error) {
      console.error('Error getting tasks by project:', error);
      res.status(500).json({ error: 'Failed to get tasks by project' });
    }
  },

  // Get projects for a specific customer
  getProjectsByCustomer: async (req, res) => {
    try {
      const { customerName } = req.params;
      const projects = await kbomModel.getProjectsByCustomer(customerName);
      res.status(200).json(projects);
    } catch (error) {
      console.error('Error getting projects by customer:', error);
      res.status(500).json({ error: 'Failed to get projects by customer' });
    }
  },

  // Get grouped kbom data
  getKbomDataGrouped: async (req, res) => {
    try {
      const data = await kbomModel.getKbomDataGrouped();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error getting grouped kbom data:', error);
      res.status(500).json({ error: 'Failed to get grouped kbom data' });
    }
  },

  // Import data from kbom to our system
  importFromKbom: async (req, res) => {
    try {
      const { customerName, projectName, tasks } = req.body;
      
      // Create customer if it doesn't exist
      let customer = await customerModel.getCustomerByName(customerName);
      if (!customer) {
        customer = await customerModel.createCustomer({
          name: customerName,
          email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: 'N/A',
          address: 'N/A'
        });
      }

      // Create project if it doesn't exist
      let project = await projectModel.getProjectByNumber(projectName);
      if (!project) {
        project = await projectModel.createProject({
          project_number: projectName,
          title: projectName,
          description: `Project imported from kbom for ${customerName}`,
          customer_id: customer.id,
          status: 'In Progress',
          start_date: new Date(),
          end_date: null,
          budget: 0,
          manager_id: req.user.id
        });
      }

      // Create tasks
      const createdTasks = [];
      for (const taskName of tasks) {
        const existingTask = await taskModel.getTaskByTitleAndProject(taskName, project.id);
        if (!existingTask) {
          const task = await taskModel.createTask({
            title: taskName,
            description: `Task imported from kbom: ${taskName}`,
            project_id: project.id,
            status: 'Pending',
            priority: 'Medium',
            assignee_id: null,
            due_date: null,
            estimated_hours: 0,
            actual_hours: 0,
            progress: 0
          });
          createdTasks.push(task);
        }
      }

      res.status(200).json({
        message: 'Data imported successfully',
        customer: customer,
        project: project,
        tasksCreated: createdTasks.length,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error importing from kbom:', error);
      res.status(500).json({ error: 'Failed to import from kbom' });
    }
  },

  // Import all data from kbom
  importAllFromKbom: async (req, res) => {
    try {
      const groupedData = await kbomModel.getKbomDataGrouped();
      const results = [];

      for (const item of groupedData) {
        try {
          // Create customer if it doesn't exist
          let customer = await customerModel.getCustomerByName(item.customer);
          if (!customer) {
            customer = await customerModel.createCustomer({
              name: item.customer,
              email: `${item.customer.toLowerCase().replace(/\s+/g, '.')}@example.com`,
              phone: 'N/A',
              address: 'N/A'
            });
          }

          // Create project if it doesn't exist
          let project = await projectModel.getProjectByNumber(item.project_name);
          if (!project) {
            project = await projectModel.createProject({
              project_number: item.project_name,
              title: item.project_name,
              description: `Project imported from kbom for ${item.customer}`,
              customer_id: customer.id,
              status: 'Active',
              start_date: new Date(),
              end_date: null,
              budget: 0,
              manager_id: req.user.id
            });
          }

          // Create tasks
          const createdTasks = [];
          for (const taskName of item.tasks) {
            const existingTask = await taskModel.getTaskByTitleAndProject(taskName, project.id);
            if (!existingTask) {
              const task = await taskModel.createTask({
                title: taskName,
                description: `Task imported from kbom: ${taskName}`,
                project_id: project.id,
                status: 'Pending',
                priority: 'Medium',
                assignee_id: null,
                due_date: null,
                estimated_hours: 0,
                actual_hours: 0,
                progress: 0
              });
              createdTasks.push(task);
            }
          }

          results.push({
            customer: item.customer,
            project: item.project_name,
            tasksCreated: createdTasks.length,
            tasks: createdTasks
          });
        } catch (error) {
          console.error(`Error processing ${item.customer}/${item.project_name}:`, error);
          results.push({
            customer: item.customer,
            project: item.project_name,
            error: error.message
          });
        }
      }

      res.status(200).json({
        message: 'Import completed',
        results: results
      });
    } catch (error) {
      console.error('Error importing all from kbom:', error);
      res.status(500).json({ error: 'Failed to import all from kbom' });
    }
  },

  // Import only customer and SO (project) from kbom
  importCustomerAndSoFromKbom: async (req, res) => {
    try {
      const { customerName, projectName } = req.body;

      // Create customer if it doesn't exist
      let customer = await customerModel.getCustomerByName(customerName);
      if (!customer) {
        customer = await customerModel.createCustomer({
          name: customerName,
          email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: 'N/A',
          address: 'N/A'
        });
      }

      // Create project if it doesn't exist
      let project = await projectModel.getProjectByNumber(projectName);
      if (!project) {
        project = await projectModel.createProject({
          project_number: projectName,
          title: projectName,
          description: `Project imported from kbom for ${customerName}`,
          customer_id: customer.id,
          status: 'Active',
          start_date: new Date(),
          end_date: null,
          budget: 0,
          manager_id: req.user.id
        });
      }

      res.status(200).json({
        message: 'Customer and project imported successfully',
        customer: customer,
        project: project
      });
    } catch (error) {
      console.error('Error importing customer and SO from kbom:', error);
      res.status(500).json({ error: 'Failed to import customer and SO from kbom' });
    }
  }
};

module.exports = kbomController;