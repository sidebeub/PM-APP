import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, useAppDispatch } from '../store';
import { fetchProjects } from '../store/projectsSlice';
import { fetchTasks, updateTask, fetchTaskDependencies as fetchTaskDependenciesAction } from '../store/tasksSlice';
import { fetchMilestones } from '../store/milestonesSlice';
import { Project, Task, DepartmentMilestone, TaskDependency } from '../types';
import GanttTaskReactChart from '../components/GanttTaskReactChart';
import './GanttView.css';
import { taskService } from '../services/api';
import { Box, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { AsyncThunkAction, PayloadAction } from '@reduxjs/toolkit';

// Define the return type for fetchTaskDependencies
type FetchTaskDependenciesResult = {
  taskId: number;
  dependencies: TaskDependency[];
};

// Enhanced interface for milestones with more properties
interface EnhancedMilestone extends DepartmentMilestone {
  type: 'deadline' | 'review' | 'delivery' | 'other';
}

const BATCH_SIZE = 5; // Increased batch size for better performance
const RETRY_DELAY = 1000; // Delay between retries in milliseconds
const MAX_RETRIES = 3; // Maximum number of retries for failed requests

const GanttView: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [localDependencies, setLocalDependencies] = useState<TaskDependency[]>([]);
  const [chartKey, setChartKey] = useState(0);
  // State for notification
  const [notification, setNotification] = useState<{open: boolean, message: string, type: 'success' | 'error' | 'info'}>({open: false, message: '', type: 'success'});

  // State to track if a task update is in progress
  const [isUpdating, setIsUpdating] = useState(false);

  // Ref to store pending updates
  const pendingUpdatesRef = useRef<Task[]>([]);
  const retryCount = useRef<Record<number, number>>({});
  const pendingTasks = useRef<number[]>([]);
  const dependencyCache = useRef<Record<number, TaskDependency[]>>({});
  const isFetching = useRef(false);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastUpdate = useRef<{ taskId: number; timestamp: number } | null>(null);
  const pendingUpdates = useRef<Map<number, Task>>(new Map());
  const dependencyFetchQueue = useRef<Set<number>>(new Set());

  const { projects } = useSelector((state: RootState) => state.projects);
  const { tasks, loading: tasksLoading, dependencies } = useSelector((state: RootState) => state.tasks);
  const { milestones } = useSelector((state: RootState) => state.milestones);

  // Function to fetch dependencies for a task
  const fetchTaskDependencies = useCallback(async (taskId: number): Promise<TaskDependency[]> => {
    try {
      // Check cache first
      if (dependencyCache.current[taskId]) {
        return dependencyCache.current[taskId];
      }

      // Check if already in queue
      if (dependencyFetchQueue.current.has(taskId)) {
        return [];
      }

      // Add to queue
      dependencyFetchQueue.current.add(taskId);

      // Check retry count
      if (retryCount.current[taskId] >= MAX_RETRIES) {
        console.warn(`Max retries reached for task ${taskId} dependencies`);
        return [];
      }

      // Increment retry count
      retryCount.current[taskId] = (retryCount.current[taskId] || 0) + 1;

      // Fetch dependencies
      const result = await taskService.getTaskDependencies(taskId);
      console.log(`Fetched dependencies for task ${taskId}:`, result);

      // Store in cache
      dependencyCache.current[taskId] = result;

      // Reset retry count on success
      retryCount.current[taskId] = 0;
      return result;
    } catch (error) {
      console.error(`Error fetching dependencies for task ${taskId}:`, error);
      return [];
    } finally {
      // Remove from queue
      dependencyFetchQueue.current.delete(taskId);
    }
  }, []);

  // Function to update dependencies for a task
  const updateTaskDependencies = useCallback((taskId: number, newDependencies: TaskDependency[]) => {
    // Create a map of existing dependencies
    const existingMap = new Map<number, TaskDependency>();

    // Add existing dependencies to map
    if (dependencyCache.current[taskId]) {
      dependencyCache.current[taskId].forEach(dep => {
        existingMap.set(dep.id, dep);
      });
    }

    // Add new dependencies that don't exist yet
    newDependencies.forEach(dep => {
      if (!existingMap.has(dep.id)) {
        existingMap.set(dep.id, dep);
      }
    });

    // Update cache with all dependencies
    dependencyCache.current[taskId] = Array.from(existingMap.values());
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tasks
        const tasksResult = await dispatch(fetchTasks()).unwrap();
        console.log('Fetched tasks:', tasksResult);

        // Fetch dependencies for each task
        const dependenciesPromises = tasksResult.map((task: Task) =>
          fetchTaskDependencies(task.id)
        );
        const dependenciesResults = await Promise.all(dependenciesPromises);

        // Update dependencies for each task
        tasksResult.forEach((task: Task, index: number) => {
          updateTaskDependencies(task.id, dependenciesResults[index]);
        });

        // Fetch milestones
        await dispatch(fetchMilestones()).unwrap();
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchData();
  }, [dispatch]);

  // Initialize dependencies when tasks are loaded
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('Initializing dependencies from tasks:', tasks);

      // Get all dependencies from the Redux store
      const allDependencies: TaskDependency[] = [];
      Object.values(dependencies).forEach(deps => {
        allDependencies.push(...deps);
      });

      console.log('All dependencies from store:', allDependencies);

      // Update local dependencies
      setLocalDependencies(allDependencies);

      // Find tasks that have dependencies but haven't been fetched yet
      const tasksToFetch = tasks.filter(task => {
        // Check if task's dependencies haven't been fetched yet
        const notInStore = !dependencies[task.id] || dependencies[task.id].length === 0;
        // Check if we haven't already fetched this task's dependencies
        const notInCache = !dependencyCache.current[task.id];
        // Check if not already in queue
        const notInQueue = !dependencyFetchQueue.current.has(task.id);
        return notInStore && notInCache && notInQueue;
      });

      console.log('Tasks to fetch dependencies for:', tasksToFetch);

      if (tasksToFetch.length > 0) {
        // Fetch dependencies for each task
        tasksToFetch.forEach(task => {
          // Mark this task as being fetched to prevent duplicate fetches
          dependencyCache.current[task.id] = [];
          const fetchDeps = async () => {
            try {
              const result = await dispatch(fetchTaskDependenciesAction(task.id)).unwrap();
              if (result && 'dependencies' in result) {
                updateTaskDependencies(task.id, result.dependencies);
              }
            } catch (error) {
              console.error('Error fetching dependencies:', error);
            }
          };
          void fetchDeps();
        });
      }
    }
  }, [tasks, dependencies, dispatch]);

  // Update dependency cache when dependencies change
  useEffect(() => {
    Object.entries(dependencies).forEach(([taskId, deps]) => {
      dependencyCache.current[parseInt(taskId)] = deps;
    });
  }, [dependencies]);

  // Filter tasks based on selected project
  const filteredTasks = useMemo(() => {
    if (!selectedProject) return tasks;
    return tasks.filter(task => task.project_id === selectedProject);
  }, [tasks, selectedProject]);

  // Filter projects based on selection
  const filteredProjects = useMemo(() => {
    if (!selectedProject) return projects;
    return projects.filter(project => project.id === selectedProject);
  }, [projects, selectedProject]);

  // Filter dependencies based on selected project
  const filteredDependencies = useMemo(() => {
    if (!selectedProject) return localDependencies;

    const projectTasks = tasks.filter(task => task.project_id === selectedProject);
    const projectTaskIds = new Set(projectTasks.map(task => task.id));

    return localDependencies.filter(dep =>
      projectTaskIds.has(dep.task_id) || projectTaskIds.has(dep.depends_on_task_id)
    );
  }, [localDependencies, selectedProject, tasks]);

  // Enhance milestones with type information
  const enhancedMilestones = useMemo(() => {
    return milestones.map(milestone => ({
    ...milestone,
      type: 'deadline' as const
    }));
  }, [milestones]);

  // Handle project selection change
  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedProject(value ? parseInt(value) : null);
  };

  // Handle task click - we'll only use this for double-clicks in the Gantt chart
  // Single clicks won't navigate away from the Gantt view
  const handleTaskClick = (task: Task) => {
    // We're using this handler for double-clicks only
    // The double-click handler in GanttTaskReactChart will call this
    console.log(`Task clicked: ${task.id}`);
    navigate(`/tasks/${task.id}`);
  };

  // Handle task update with debouncing and batching
  const handleTaskUpdate = async (task: Task) => {
    try {
      const now = Date.now();

      // Skip if this is a duplicate update within the debounce window
      if (lastUpdate.current &&
          lastUpdate.current.taskId === task.id &&
          now - lastUpdate.current.timestamp < 500) {
        return;
      }

      // Show saving notification if this is the first update
      if (pendingUpdates.current.size === 0) {
        setIsUpdating(true);
        setNotification({
          open: true,
          message: 'Saving changes...',
          type: 'info'
        });
      }

      // Store the update in pending updates
      pendingUpdates.current.set(task.id, task);
      lastUpdate.current = { taskId: task.id, timestamp: now };

      // Clear any existing timeout
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      // Schedule the update
      updateTimeout.current = setTimeout(async () => {
        try {
          // Process all pending updates
          const updates = Array.from(pendingUpdates.current.entries());
          for (const [taskId, taskData] of updates) {
            await dispatch(updateTask({ id: taskId, task: taskData })).unwrap();
          }

          // Clear pending updates
          pendingUpdates.current.clear();

          // Reset updating state
          setIsUpdating(false);

          // Show success notification
          setNotification({
            open: true,
            message: updates.length > 1 ? `${updates.length} tasks updated successfully` : 'Task updated successfully',
            type: 'success'
          });
        } catch (error) {
          console.error('Failed to update tasks:', error);

          // Reset updating state
          setIsUpdating(false);

          // Show error notification
          setNotification({
            open: true,
            message: 'Failed to update tasks. Please try again.',
            type: 'error'
          });
        }
      }, 500); // Wait 500ms before sending updates
    } catch (error) {
      console.error('Failed to schedule task update:', error);

      // Reset updating state
      setIsUpdating(false);

      // Show error notification
      setNotification({
        open: true,
        message: 'Failed to schedule task update. Please try again.',
        type: 'error'
      });
    }
  };

  // Handle milestone click
  const handleMilestoneClick = (milestone: DepartmentMilestone) => {
    navigate(`/milestones/${milestone.id}`);
  };

  // Clean up timeouts and refs on unmount
  useEffect(() => {
    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
      pendingUpdates.current.clear();
      lastUpdate.current = null;
    };
  }, []);

  return (
    <div className="gantt-view">
      <div className="gantt-header">
        <h1>Project Timeline</h1>
        <div className="gantt-controls">
          <select
            className="project-selector"
            value={selectedProject || ''}
                onChange={handleProjectChange}
              >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="gantt-container">
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            <strong>Tip:</strong> Double-click on a task to edit it. Click and drag to reschedule or resize tasks. Changes are saved automatically.
          </Typography>
        </Box>
        {tasksLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          // Always render the GanttTaskReactChart component, even if there are no tasks
          // The component will handle the empty state internally
          <GanttTaskReactChart
            key={chartKey}
            projects={filteredProjects}
            tasks={filteredTasks}
            milestones={enhancedMilestones}
            dependencies={filteredDependencies}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
            onMilestoneClick={handleMilestoneClick}
          />
        )}
      </div>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.type}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default GanttView;
