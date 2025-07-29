const bomPool = require('../db/bomConnection');

const kbomModel = {
  // Get all kbom data
  getAllKbomData: async () => {
    try {
      const query = `
        SELECT DISTINCT
          so as project_name,
          customer,
          source_file as task_name
        FROM kbom
        WHERE so IS NOT NULL
          AND customer IS NOT NULL
          AND source_file IS NOT NULL
          AND so != ''
          AND source_file != ''
        ORDER BY so, customer, source_file
      `;

      const result = await bomPool.query(query);

      // Normalize customer names
      const processedRows = result.rows.map(row => {
        const normalizedCustomer = String(row.customer).trim().toLowerCase();
        const properCaseCustomer = normalizedCustomer.charAt(0).toUpperCase() + normalizedCustomer.slice(1);

        return {
          ...row,
          customer: properCaseCustomer
        };
      });

      return processedRows;
    } catch (error) {
      console.error('Error fetching kbom data:', error);
      throw error;
    }
  },

  // Get unique customers from kbom
  getUniqueCustomers: async () => {
    try {
      const query = `
        SELECT DISTINCT customer
        FROM kbom
        WHERE customer IS NOT NULL
        ORDER BY customer
      `;

      const result = await bomPool.query(query);

      // Normalize customer names and remove duplicates
      const customerSet = new Set();
      result.rows.forEach(row => {
        const normalizedCustomer = String(row.customer).trim().toLowerCase();
        if (normalizedCustomer) {
          // Convert to proper case (first letter uppercase, rest lowercase)
          const properCase = normalizedCustomer.charAt(0).toUpperCase() + normalizedCustomer.slice(1);
          customerSet.add(properCase);
        }
      });

      return Array.from(customerSet).sort();
    } catch (error) {
      console.error('Error fetching unique customers:', error);
      throw error;
    }
  },

  // Get unique SOs (projects) from kbom
  getUniqueProjects: async () => {
    try {
      const query = `
        SELECT DISTINCT so as project_name
        FROM kbom 
        WHERE so IS NOT NULL 
        ORDER BY so
      `;
      
      const result = await bomPool.query(query);
      return result.rows.map(row => row.project_name);
    } catch (error) {
      console.error('Error fetching unique projects:', error);
      throw error;
    }
  },

  // Get tasks for a specific project
  getTasksByProject: async (projectName) => {
    try {
      const query = `
        SELECT DISTINCT source_file as task_name
        FROM kbom 
        WHERE so = $1 
          AND source_file IS NOT NULL
        ORDER BY source_file
      `;
      
      const result = await bomPool.query(query, [projectName]);
      return result.rows.map(row => row.task_name);
    } catch (error) {
      console.error('Error fetching tasks by project:', error);
      throw error;
    }
  },

  // Get projects for a specific customer
  getProjectsByCustomer: async (customerName) => {
    try {
      // Get all customers and their projects, then filter in JavaScript for case-insensitive matching
      const query = `
        SELECT DISTINCT customer, so as project_name
        FROM kbom
        WHERE so IS NOT NULL
          AND customer IS NOT NULL
          AND so != ''
        ORDER BY so
      `;

      const result = await bomPool.query(query);

      // Normalize the input customer name for comparison
      const normalizedInputCustomer = customerName.trim().toLowerCase();

      // Filter projects for the matching customer (case-insensitive)
      const matchingProjects = result.rows
        .filter(row => {
          const normalizedRowCustomer = String(row.customer).trim().toLowerCase();
          return normalizedRowCustomer === normalizedInputCustomer;
        })
        .map(row => row.project_name);

      return [...new Set(matchingProjects)].sort();
    } catch (error) {
      console.error('Error fetching projects by customer:', error);
      throw error;
    }
  },

  // Get all data grouped by customer and project
  getKbomDataGrouped: async () => {
    try {
      // First, let's test a simple query to see the table structure
      const testQuery = `SELECT * FROM kbom LIMIT 5`;
      const testResult = await bomPool.query(testQuery);
      console.log('KBOM table sample:', testResult.rows);

      // Simple query without any string functions
      const query = `
        SELECT
          customer,
          so as project_name,
          array_agg(DISTINCT source_file) as tasks
        FROM kbom
        WHERE so IS NOT NULL
          AND customer IS NOT NULL
          AND source_file IS NOT NULL
        GROUP BY customer, so
        ORDER BY customer, so
      `;

      const result = await bomPool.query(query);

      // Normalize customer names and group by normalized customer
      const customerGroups = new Map();

      result.rows.forEach(row => {
        const normalizedCustomer = String(row.customer).trim().toLowerCase();
        const properCaseCustomer = normalizedCustomer.charAt(0).toUpperCase() + normalizedCustomer.slice(1);

        const key = `${properCaseCustomer}|${row.project_name}`;

        if (customerGroups.has(key)) {
          // Merge tasks if we already have this customer-project combination
          const existing = customerGroups.get(key);
          const combinedTasks = [...new Set([...existing.tasks, ...row.tasks])];
          customerGroups.set(key, {
            ...existing,
            tasks: combinedTasks
          });
        } else {
          customerGroups.set(key, {
            customer: properCaseCustomer,
            project_name: row.project_name,
            tasks: row.tasks
          });
        }
      });

      return Array.from(customerGroups.values()).sort((a, b) => {
        if (a.customer !== b.customer) {
          return a.customer.localeCompare(b.customer);
        }
        // Convert project_name to string for comparison since it might be a number
        return String(a.project_name).localeCompare(String(b.project_name));
      });
    } catch (error) {
      console.error('Error fetching grouped kbom data:', error);
      throw error;
    }
  }
};

module.exports = kbomModel; 