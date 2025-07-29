const axios = require('axios');

async function addTask() {
  try {
    const response = await axios.post('http://localhost:3001/api/tasks', {
      project_id: 1,
      title: 'Final testing and delivery',
      description: 'Perform final testing and prepare for delivery to customer',
      status: 'Pending',
      priority: 'High',
      start_date: '2025-04-01',
      due_date: '2025-04-15',
      progress: 0
    });
    console.log('Task added:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addTask(); 