import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, TaskDependency } from '../types';
import { taskService } from '../services/api';
import { RootState } from '../store';

// Define the state interface
interface TasksState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
  dependencies: Record<number, TaskDependency[]>;
}

// Initial state
const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  dependencies: {}
};

// Async thunks for API calls
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (_, { rejectWithValue }) => {
    try {
      return await taskService.getAllTasks();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tasks');
    }
  }
);

export const fetchTasksByProject = createAsyncThunk(
  'tasks/fetchTasksByProject',
  async (projectId: number, { rejectWithValue }) => {
    try {
      return await taskService.getTasksByProject(projectId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tasks for project');
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await taskService.getTaskById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch task');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (task: Partial<Task>, { rejectWithValue }) => {
    try {
      return await taskService.createTask(task);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create task');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, task }: { id: number; task: Partial<Task> }, { getState, rejectWithValue }) => {
    try {
      // Skip if this is a duplicate update within the debounce window
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current;
      if (lastUpdate && 
          lastUpdate.taskId === id && 
          now - lastUpdate.timestamp < 500) {
        return { id, task };
      }
      
      lastUpdateRef.current = { taskId: id, timestamp: now };
      
      // First fetch the current task state
      const currentTask = await taskService.getTaskById(id);
      
      // Merge current task with updates
      const updatedTask = {
        ...currentTask,
        ...task,
        id,
        dependencies: currentTask.dependencies || []
      };
      
      const response = await taskService.updateTask(id, updatedTask);
      return { id, task: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: number, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete task');
    }
  }
);

export const fetchTaskDependencies = createAsyncThunk(
  'tasks/fetchTaskDependencies',
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const task = state.tasks.tasks.find(t => t && t.id === id);
      
      if (!task) {
        // If task not found in state, fetch it first
        await taskService.getTaskById(id);
      }
      
      const dependencies = await taskService.getTaskDependencies(id);
      return { taskId: id, dependencies };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch task dependencies');
    }
  }
);

export const addTaskDependency = createAsyncThunk(
  'tasks/addTaskDependency',
  async ({ taskId, dependsOnTaskId }: { taskId: number; dependsOnTaskId: number }, { rejectWithValue }) => {
    try {
      return await taskService.addTaskDependency(taskId, dependsOnTaskId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add task dependency');
    }
  }
);

export const removeTaskDependency = createAsyncThunk(
  'tasks/removeTaskDependency',
  async ({ taskId, dependencyId }: { taskId: number; dependencyId: number }, { rejectWithValue }) => {
    try {
      await taskService.removeTaskDependency(taskId, dependencyId);
      return { taskId, dependencyId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove task dependency');
    }
  }
);

// Create the slice
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setCurrentTask: (state, action: PayloadAction<Task | null>) => {
      state.currentTask = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateTaskProgress: (state, action: PayloadAction<{ id: number; progress: number }>) => {
      const { id, progress } = action.payload;
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.progress = progress;
      }
      if (state.currentTask?.id === id) {
        state.currentTask.progress = progress;
      }
    },
    // Add a task directly to the state (for WebSocket updates)
    addTask: (state, action: PayloadAction<Task>) => {
      // Check if task already exists
      const existingTaskIndex = state.tasks.findIndex(t => t.id === action.payload.id);
      if (existingTaskIndex === -1) {
        state.tasks.push(action.payload);
      }
    },
    // Remove a task directly from the state (for WebSocket updates)
    removeTask: (state, action: PayloadAction<number>) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
      if (state.currentTask?.id === action.payload) {
        state.currentTask = null;
      }
    },
    // Update a task directly in the state (for WebSocket updates)
    updateTaskInState: (state, action: PayloadAction<Task>) => {
      const updatedTask = action.payload;
      const index = state.tasks.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        state.tasks[index] = updatedTask;
      }
      if (state.currentTask?.id === updatedTask.id) {
        state.currentTask = updatedTask;
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch all tasks
    builder.addCase(fetchTasks.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks = action.payload;
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch tasks by project
    builder.addCase(fetchTasksByProject.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTasksByProject.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks = action.payload;
    });
    builder.addCase(fetchTasksByProject.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch task by ID
    builder.addCase(fetchTaskById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTaskById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentTask = action.payload;
    });
    builder.addCase(fetchTaskById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create task
    builder.addCase(createTask.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks.push(action.payload);
      state.currentTask = action.payload;
    });
    builder.addCase(createTask.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update task
    builder.addCase(updateTask.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateTask.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload && action.payload.id) {
        const taskId = action.payload.id;
        
        // Ensure we have a valid task object with dependencies
        const updatedTask = {
          ...action.payload.task,
          id: taskId,
          dependencies: action.payload.task?.dependencies || []
        };

        // Update task in tasks array
        const index = state.tasks.findIndex(t => t && t.id === taskId);
        if (index !== -1) {
          state.tasks[index] = updatedTask;
        }

        // Update current task if it matches
        if (state.currentTask?.id === taskId) {
          state.currentTask = updatedTask;
        }
        
        // Update dependencies in state if they were changed
        if (action.payload.task?.dependencies !== undefined) {
          state.dependencies[taskId] = action.payload.task.dependencies.map((depId: number) => ({
            id: Number(`${taskId}${depId}`),
            task_id: taskId,
            depends_on_task_id: depId,
            created_at: new Date().toISOString(),
            depends_on_task_title: state.tasks.find(t => t && t.id === depId)?.title || `Task ${depId}`
          }));
        }
      }
    });
    builder.addCase(updateTask.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Delete task
    builder.addCase(deleteTask.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
      if (state.currentTask?.id === action.payload) {
        state.currentTask = null;
      }
    });
    builder.addCase(deleteTask.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Fetch task dependencies
    builder.addCase(fetchTaskDependencies.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTaskDependencies.fulfilled, (state, action) => {
      state.loading = false;
      const { taskId, dependencies } = action.payload;
      const task = state.tasks.find(t => t && t.id === taskId);
      
      if (task) {
        // Update task's dependencies array
        task.dependencies = dependencies.map((dep: TaskDependency) => dep.depends_on_task_id);
        
        // Update dependencies in state
        state.dependencies[taskId] = dependencies;
      } else {
        // If task not found, store dependencies anyway
        state.dependencies[taskId] = dependencies;
      }
    });
    builder.addCase(fetchTaskDependencies.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Add task dependency
    builder.addCase(addTaskDependency.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addTaskDependency.fulfilled, (state, action) => {
      state.loading = false;
      const { taskId, dependsOnTaskId } = action.meta.arg;
      const task = state.tasks.find(t => t && t.id === taskId);
      
      if (task) {
        // Add dependency to task
        if (!task.dependencies) {
          task.dependencies = [];
        }
        if (!task.dependencies.includes(dependsOnTaskId)) {
          task.dependencies.push(dependsOnTaskId);
        }
        
        // Update dependencies in state
        if (!state.dependencies[taskId]) {
          state.dependencies[taskId] = [];
        }
        state.dependencies[taskId].push({
          id: Number(`${taskId}${dependsOnTaskId}`),
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
          created_at: new Date().toISOString(),
          depends_on_task_title: state.tasks.find(t => t && t.id === dependsOnTaskId)?.title || `Task ${dependsOnTaskId}`
        });
      } else {
        console.warn(`Task with ID ${taskId} not found in state`);
      }
    });
    builder.addCase(addTaskDependency.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Remove task dependency
    builder.addCase(removeTaskDependency.fulfilled, (state, action) => {
      const { taskId, dependencyId } = action.meta.arg;
      const task = state.tasks.find(t => t.id === taskId);
      if (task && task.dependencies) {
        task.dependencies = task.dependencies.filter(depId => depId !== dependencyId);
        
        if (state.dependencies[taskId]) {
          state.dependencies[taskId] = state.dependencies[taskId].filter(
            dep => dep.depends_on_task_id !== dependencyId
          );
        }
      }
    });
    builder.addCase(removeTaskDependency.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  }
});

// Export actions and reducer
export const { setCurrentTask, clearError, updateTaskProgress, addTask, removeTask, updateTaskInState } = tasksSlice.actions;
export default tasksSlice.reducer;

// Add ref for tracking last update
const lastUpdateRef = { current: null as { taskId: number; timestamp: number } | null };
