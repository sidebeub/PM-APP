import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../../store';
import { fetchTasks, createTask, updateTask } from '../../store/tasksSlice';
import { fetchProjects } from '../../store/projectsSlice';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Slider,
  Divider,
  Alert,
  Stack,
  SelectChangeEvent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
// Using native date inputs instead of DatePicker to avoid dependency issues
import { Task, TaskStatus, TaskStatusType, TaskPriority, TaskPriorityType, TaskDependency } from '../../types';
import { fetchTaskDependencies, addTaskDependency, removeTaskDependency } from '../../store/tasksSlice';

interface TaskFormProps {
  mode: 'create' | 'edit';
}

const TaskForm: React.FC<TaskFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tasks, loading: tasksLoading, dependencies } = useSelector((state: RootState) => state.tasks);
  const { projects, loading: projectsLoading } = useSelector((state: RootState) => state.projects);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const initialFormData: Partial<Task> = {
    title: '',
    description: '',
    project_id: undefined,
    assignee_id: undefined,
    status: TaskStatus.Pending,
    priority: TaskPriority.Medium,
    department: '',
    start_date: undefined,
    due_date: undefined,
    progress: 0,
    dependencies: []
  };
  const [formData, setFormData] = useState<Partial<Task>>(initialFormData);

  // State for dependency management
  const [selectedDependencyId, setSelectedDependencyId] = useState<string>('');
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [dependencySuccess, setDependencySuccess] = useState<string | null>(null);
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);

  // Handle adding a dependency
  const handleAddDependency = async () => {
    if (!selectedDependencyId) {
      setDependencyError('Please select a task to add as a dependency');
      return;
    }

    const dependsOnTaskId = parseInt(selectedDependencyId, 10);

    try {
      if (mode === 'edit' && id) {
        // For existing tasks, use the API
        await dispatch(addTaskDependency({
          taskId: Number(id),
          dependsOnTaskId
        })).unwrap();

        // Refresh dependencies after adding
        const result = await dispatch(fetchTaskDependencies(Number(id))).unwrap();
        if (result && 'dependencies' in result) {
          setTaskDependencies(result.dependencies);
        }
      } else {
        // For new tasks, just update the form data
        setFormData(prev => ({
          ...prev,
          dependencies: [...(prev.dependencies || []), dependsOnTaskId]
        }));
      }

      setSelectedDependencyId('');
      setDependencySuccess('Dependency added successfully');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setDependencySuccess(null);
      }, 3000);
    } catch (err: any) {
      setDependencyError(err.message || 'Failed to add dependency');
    }
  };

  // Handle removing a dependency
  const handleRemoveDependency = async (dependencyId: number) => {
    try {
      if (mode === 'edit' && id) {
        // For existing tasks, use the API
        await dispatch(removeTaskDependency({
          taskId: Number(id),
          dependencyId
        })).unwrap();

        // Refresh dependencies after removing
        const result = await dispatch(fetchTaskDependencies(Number(id))).unwrap();
        if (result && 'dependencies' in result) {
          setTaskDependencies(result.dependencies);
        }
      } else {
        // For new tasks, just update the form data
        setFormData(prev => ({
          ...prev,
          dependencies: (prev.dependencies || []).filter(id => id !== dependencyId)
        }));
      }

      setDependencySuccess('Dependency removed successfully');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setDependencySuccess(null);
      }, 3000);
    } catch (err: any) {
      setDependencyError(err.message || 'Failed to remove dependency');
    }
  };

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTasks());
  }, [dispatch]);

  // Fetch task dependencies when editing an existing task
  useEffect(() => {
    let isMounted = true;

    const fetchDeps = async () => {
      if (!mode || !id) return;

      try {
        // Check if we already have the dependencies in the store
        const taskId = Number(id);
        if (dependencies[taskId]?.length > 0) {
          if (isMounted) {
            setTaskDependencies(dependencies[taskId]);
          }
          return;
        }

        const result = await dispatch(fetchTaskDependencies(taskId)).unwrap();
        if (isMounted && result && 'dependencies' in result) {
          setTaskDependencies(result.dependencies);
        }
      } catch (error) {
        console.error('Error fetching dependencies:', error);
      }
    };

    if (mode === 'edit' && id) {
      void fetchDeps();
    }

    return () => {
      isMounted = false;
    };
  }, [dispatch, mode, id]);

  useEffect(() => {
    if (mode === 'edit' && id && tasks.length > 0) {
      const task = tasks.find(t => t && t.id === Number(id));
      if (task) {
        setFormData({
          ...task,
          status: task.status || TaskStatus.Pending,
          progress: task.progress || 0,
          project_id: task.project_id || undefined,
          assignee_id: task.assignee_id || undefined,
          priority: task.priority || TaskPriority.Medium,
          department: task.department || '',
          start_date: task.start_date || undefined,
          due_date: task.due_date || undefined,
          description: task.description || '',
          dependencies: task.dependencies || [],
        });
      }
    }
  }, [mode, id, tasks]);

  // Handle progress change
  const handleProgressChange = (_event: Event, newValue: number | number[]) => {
    try {
      const progressValue = Array.isArray(newValue) ? newValue[0] : newValue;
      setFormData(prev => ({
        ...prev,
        progress: progressValue
      }));
    } catch (error) {
      console.error('Error handling progress change:', error);
      setError('An error occurred while updating progress');
    }
  };

  // Handle select change
  const handleSelectChange = (field: keyof Task) => (event: SelectChangeEvent) => {
    try {
      const value = event.target.value;
      setFormData(prevData => ({
        ...prevData,
        [field]: field === 'assignee_id' || field === 'project_id' || field === 'milestone_id'
          ? (value ? parseInt(value) : undefined)
          : (value || (field === 'status' ? TaskStatus.Pending : field === 'priority' ? TaskPriority.Medium : undefined))
      }));
    } catch (error) {
      console.error('Error handling select change:', error);
      setError('An error occurred while updating the field');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    try {
      const { name, value } = e.target;

      // Handle date inputs specially to convert to ISO string
      if (name === 'start_date' || name === 'due_date') {
        if (value) {
          // Convert YYYY-MM-DD to ISO string
          const date = new Date(value);
          setFormData(prev => ({
            ...prev,
            [name]: date.toISOString(),
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            [name]: undefined,
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }));
      }
    } catch (error) {
      console.error('Error updating input:', error);
      setError('Failed to update input');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.title) {
        setError('Task title is required');
        return;
      }
      if (!formData.project_id) {
        setError('Project is required');
        return;
      }

      // Create a copy of formData with explicit string values for status and priority
      const taskData = {
        ...formData,
        status: formData.status || 'Pending',
        priority: formData.priority || 'Medium',
        progress: formData.progress || 0
      } as Task; // Type assertion to Task

      console.log('Submitting task data:', taskData);

      if (mode === 'create') {
        await dispatch(createTask(taskData)).unwrap();
        setSuccess('Task created successfully!');
      } else if (mode === 'edit' && id) {
        // Only update if there are actual changes
        const currentTask = tasks.find(t => t && t.id === Number(id));
        if (currentTask) {
          const hasChanges = Object.keys(taskData).some(key => {
            const typedKey = key as keyof Task;
            return JSON.stringify(taskData[typedKey]) !== JSON.stringify(currentTask[typedKey]);
          });

          if (hasChanges) {
            await dispatch(updateTask({ id: Number(id), task: taskData })).unwrap();
            setSuccess('Task updated successfully!');
          }
        }
      }

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(mode === 'create' ? '/tasks' : `/tasks/${id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving task:', err);
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  const loading = tasksLoading || projectsLoading;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {mode === 'create' ? 'Create New Task' : 'Edit Task'}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <TextField
              required
              fullWidth
              label="Task Title"
              name="title"
              value={formData.title || ''}
              onChange={handleInputChange}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <FormControl fullWidth required>
                <InputLabel id="project-label">Project</InputLabel>
                <Select
                  labelId="project-label"
                  value={formData.project_id?.toString() || ''}
                  onChange={handleSelectChange('project_id')}
                  label="Project"
                >
                  <MenuItem value="">
                    <em>Select a project</em>
                  </MenuItem>
                  {projects.map(project => (
                    <MenuItem key={project.id} value={project.id.toString()}>
                      {project.project_number} - {project.name} - {project.customer_name || 'No Customer'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormControl fullWidth>
                <InputLabel id="assignee-label">Assignee</InputLabel>
                <Select
                  labelId="assignee-label"
                  value={formData.assignee_id?.toString() || ''}
                  onChange={handleSelectChange('assignee_id')}
                  label="Assignee"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value={1}>John Doe (Project Manager)</MenuItem>
                  <MenuItem value={2}>Jane Smith (Engineer)</MenuItem>
                  <MenuItem value={3}>Bob Johnson (Designer)</MenuItem>
                  <MenuItem value={4}>Alice Williams (Purchasing)</MenuItem>
                  <MenuItem value={5}>Michael Brown (Programming)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormControl fullWidth required>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={formData.status || TaskStatus.Pending}
                  onChange={handleSelectChange('status')}
                  label="Status"
                >
                  <MenuItem value={TaskStatus.Pending}>Pending</MenuItem>
                  <MenuItem value={TaskStatus.InProgress}>In Progress</MenuItem>
                  <MenuItem value={TaskStatus.Completed}>Completed</MenuItem>
                  <MenuItem value={TaskStatus.Delayed}>Delayed</MenuItem>
                  <MenuItem value={TaskStatus.Blocked}>Blocked</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormControl fullWidth required>
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  name="priority"
                  value={formData.priority || 'Medium'}
                  onChange={handleSelectChange('priority')}
                  label="Priority"
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={formData.department || ''}
                onChange={handleInputChange}
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Start Date"
                name="start_date"
                type="date"
                value={formData.start_date ? formData.start_date.split('T')[0] : ''}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Due Date"
                name="due_date"
                type="date"
                value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Progress: {formData.progress ?? 0}%</Typography>
            <Slider
              value={formData.progress ?? 0}
              onChange={handleProgressChange}
              aria-labelledby="progress-slider"
              valueLabelDisplay="auto"
              step={5}
              marks
              min={0}
              max={100}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
            />
          </Box>

          {/* Dependencies Section */}
          {(
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Task Dependencies
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Current Dependencies */}
              <Typography variant="subtitle1" gutterBottom>
                This task depends on:
              </Typography>

              {(mode === 'edit' ? taskDependencies : formData.dependencies || [])?.length > 0 ? (
                <List sx={{ mb: 3 }}>
                  {(mode === 'edit' ? taskDependencies : formData.dependencies || [])?.map(dependency => {
                    const dependencyId = mode === 'edit'
                      ? (dependency as TaskDependency).depends_on_task_id
                      : dependency as number;
                    const dependentTask = tasks.find(t => t && t.id === dependencyId);
                    return (
                      <ListItem key={dependencyId} divider>
                        <ListItemText
                          primary={dependentTask?.title || `Task #${dependencyId}`}
                          secondary={dependentTask?.status || 'Unknown status'}
                        />
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleRemoveDependency(dependencyId)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  No dependencies. This task can start anytime.
                </Typography>
              )}

              {/* Add Dependency */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Add Dependency:
                </Typography>

                {dependencyError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {dependencyError}
                  </Alert>
                )}

                {dependencySuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {dependencySuccess}
                  </Alert>
                )}

                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControl fullWidth>
                    <Select
                      value={selectedDependencyId}
                      onChange={(e) => setSelectedDependencyId(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Choose task</em>
                      </MenuItem>
                      {tasks
                        .filter(task =>
                          task &&
                          task.id !== Number(id) &&
                          (mode === 'edit'
                            ? !taskDependencies.some(dep => dep.depends_on_task_id === task.id)
                            : !formData.dependencies?.includes(task.id))
                        )
                        .map((task) => (
                          <MenuItem key={task.id} value={task.id.toString()}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                              <Typography variant="body1" noWrap sx={{ maxWidth: '70%' }}>
                                {task.title}
                              </Typography>
                              {task.project_number && (
                                <Chip
                                  label={task.project_number}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddDependency}
                    disabled={!selectedDependencyId}
                  >
                    Add
                  </Button>
                </Stack>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Dependencies determine the order in which tasks must be completed. A task cannot start until all of its dependencies are completed.
              </Typography>
            </Box>
          )}

          <Box>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !formData.title || !formData.project_id}
              >
                {mode === 'create' ? 'Create Task' : 'Update Task'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </form>
    </Paper>
  );
};

export default TaskForm;
