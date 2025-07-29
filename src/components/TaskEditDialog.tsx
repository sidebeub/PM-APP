import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, RootState } from '../store';
import { useSelector } from 'react-redux';
import { updateTask, fetchTaskDependencies, addTaskDependency, removeTaskDependency } from '../store/tasksSlice';
import debounce from 'lodash/debounce';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Slider,
  Alert,
  SelectChangeEvent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import { Task, TaskStatus, TaskPriority } from '../types';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

type TaskFormData = Partial<Task>;

interface TaskEditDialogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
}

const TaskEditDialog: React.FC<TaskEditDialogProps> = ({ open, onClose, task }) => {
  const dispatch = useAppDispatch();
  const { projects } = useSelector((state: RootState) => state.projects);
  const { tasks, dependencies } = useSelector((state: RootState) => state.tasks);
  const [formData, setFormData] = useState<TaskFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDependencyId, setSelectedDependencyId] = useState<string>('');
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [dependencySuccess, setDependencySuccess] = useState<string | null>(null);
  const [hasFetchedDependencies, setHasFetchedDependencies] = useState(false);

  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce((updatedTask: TaskFormData) => {
      if (!task) return;
      
      const hasChanges = Object.keys(updatedTask).some(key => {
        const typedKey = key as keyof Task;
        return JSON.stringify(updatedTask[typedKey]) !== JSON.stringify(task[typedKey]);
      });
      
      if (hasChanges) {
        dispatch(updateTask({ id: task.id, task: updatedTask }));
      }
    }, 1000),
    [dispatch, task]
  );

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        start_date: task.start_date,
        due_date: task.due_date,
        status: task.status || TaskStatus.Pending,
        priority: task.priority || TaskPriority.Medium,
        progress: task.progress || 0,
        dependencies: task.dependencies || [],
        assignee_id: task.assignee_id,
        project_id: task.project_id,
        milestone_id: task.milestone_id,
        department: task.department,
        completed_date: task.completed_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
        project_number: task.project_number
      });

      if (!dependencies[task.id] && !hasFetchedDependencies) {
        setHasFetchedDependencies(true);
        dispatch(fetchTaskDependencies(task.id));
      }
    }
  }, [task, dispatch, dependencies, hasFetchedDependencies]);

  useEffect(() => {
    if (task && dependencies[task.id]) {
      const taskDependencies = dependencies[task.id];
      setFormData(prev => ({
        ...prev,
        dependencies: taskDependencies.map(d => d.depends_on_task_id)
      }));
    }
  }, [dependencies, task]);

  useEffect(() => {
    if (!open) {
      setHasFetchedDependencies(false);
      setError(null);
      setSuccess(null);
      setDependencyError(null);
      setDependencySuccess(null);
      setSelectedDependencyId('');
    }
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    try {
      const { name, value } = e.target;
      
      if (name === 'start_date' || name === 'due_date') {
        if (value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
          }
          const newFormData = {
            ...formData,
            [name]: date.toISOString()
          };
          setFormData(newFormData);
          debouncedUpdate(newFormData);
        } else {
          const newFormData = {
            ...formData,
            [name]: undefined
          };
          setFormData(newFormData);
          debouncedUpdate(newFormData);
        }
      } else {
        const newFormData = {
          ...formData,
          [name]: value
        };
        setFormData(newFormData);
        debouncedUpdate(newFormData);
      }
    } catch (error) {
      console.error('Error handling input change:', error);
      setError('An error occurred while updating the field');
    }
  };

  const handleSelectChange = (field: keyof Task) => (event: SelectChangeEvent) => {
    try {
      const value = event.target.value;
      let newValue: any;

      switch (field) {
        case 'assignee_id':
        case 'project_id':
        case 'milestone_id':
          newValue = value ? parseInt(value) : undefined;
          break;
        case 'status':
          newValue = value || TaskStatus.Pending;
          break;
        case 'priority':
          newValue = value || TaskPriority.Medium;
          break;
        default:
          newValue = value || undefined;
      }

      const newFormData = {
        ...formData,
        [field]: newValue
      };
      setFormData(newFormData);
      debouncedUpdate(newFormData);
    } catch (error) {
      console.error('Error handling select change:', error);
      setError('An error occurred while updating the field');
    }
  };

  const handleProgressChange = (_event: Event, newValue: number | number[]) => {
    try {
      const progress = Array.isArray(newValue) ? newValue[0] : newValue;
      const clampedProgress = Math.min(Math.max(progress, 0), 100);
      
      const newFormData = {
        ...formData,
        progress: clampedProgress
      };
      setFormData(newFormData);
      debouncedUpdate(newFormData);
    } catch (error) {
      console.error('Error handling progress change:', error);
      setError('An error occurred while updating progress');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!task) {
        throw new Error('No task selected');
      }

      const updatedTask = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        completed_date: formData.completed_date ? new Date(formData.completed_date).toISOString() : undefined
      };

      await dispatch(updateTask({ id: task.id, task: updatedTask })).unwrap();
      setSuccess('Task updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const handleAddDependency = async () => {
    try {
      if (!selectedDependencyId || !task) {
        throw new Error('Please select a task to add as a dependency');
      }

      const dependsOnTaskId = parseInt(selectedDependencyId, 10);
      if (isNaN(dependsOnTaskId)) {
        throw new Error('Invalid dependency ID');
      }
      
      if (formData.dependencies?.includes(dependsOnTaskId)) {
        throw new Error('This dependency already exists');
      }
      
      await dispatch(addTaskDependency({ 
        taskId: task.id, 
        dependsOnTaskId 
      })).unwrap();
      
      setFormData(prev => ({
        ...prev,
        dependencies: [...(prev.dependencies || []), dependsOnTaskId]
      }));
      
      setSelectedDependencyId('');
      setDependencySuccess('Dependency added successfully');
      
      setTimeout(() => {
        setDependencySuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error adding dependency:', err);
      setDependencyError(err.message || 'Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (dependencyId: number) => {
    try {
      if (!task) {
        throw new Error('No task selected');
      }
      
      await dispatch(removeTaskDependency({ 
        taskId: task.id, 
        dependencyId 
      })).unwrap();
      
      setFormData(prev => ({
        ...prev,
        dependencies: prev.dependencies?.filter(id => id !== dependencyId) || []
      }));
      
      setDependencySuccess('Dependency removed successfully');
      
      setTimeout(() => {
        setDependencySuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error removing dependency:', err);
      setDependencyError(err.message || 'Failed to remove dependency');
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Task</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3, mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3, mt: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <Box>
            <TextField
              required
              fullWidth
              label="Title"
              name="title"
              value={formData.title || ''}
              onChange={handleInputChange}
            />
          </Box>

          <Box>
            <FormControl fullWidth>
              <InputLabel id="project-label">Project</InputLabel>
              <Select
                labelId="project-label"
                name="project_id"
                value={formData.project_id?.toString() || ''}
                onChange={handleSelectChange('project_id')}
                label="Project"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id.toString()}>
                    {project.project_number} - {project.customer_name || 'No Customer'}
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
                name="assignee_id"
                value={formData.assignee_id?.toString() || ''}
                onChange={handleSelectChange('assignee_id')}
                label="Assignee"
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                <MenuItem value="1">John Doe (Project Manager)</MenuItem>
                <MenuItem value="2">Jane Smith (Engineer)</MenuItem>
                <MenuItem value="3">Bob Johnson (Designer)</MenuItem>
                <MenuItem value="4">Alice Williams (Purchasing)</MenuItem>
                <MenuItem value="5">Michael Brown (Programming)</MenuItem>
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
                value={formData.priority || TaskPriority.Medium}
                onChange={handleSelectChange('priority')}
                label="Priority"
              >
                <MenuItem value={TaskPriority.Low}>Low</MenuItem>
                <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
                <MenuItem value={TaskPriority.High}>High</MenuItem>
                <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
              </Select>
            </FormControl>
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

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Task Dependencies
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Current Dependencies:
            </Typography>
            
            {formData.dependencies && formData.dependencies.length > 0 ? (
              <List sx={{ mb: 3 }}>
                {formData.dependencies.map(dependencyId => {
                  const dependentTask = tasks.find(t => t.id === dependencyId);
                  return (
                    <ListItem
                      key={dependencyId}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleRemoveDependency(dependencyId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={dependentTask?.title || `Task #${dependencyId}`}
                        secondary={`Status: ${dependentTask?.status || 'Unknown'}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography color="textSecondary" sx={{ mb: 3 }}>
                No dependencies set
              </Typography>
            )}

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

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl fullWidth>
                <InputLabel id="dependency-label">Add Dependency</InputLabel>
                <Select
                  labelId="dependency-label"
                  value={selectedDependencyId}
                  onChange={(e) => setSelectedDependencyId(e.target.value)}
                  label="Add Dependency"
                >
                  <MenuItem value="">
                    <em>Select a task</em>
                  </MenuItem>
                  {tasks
                    .filter(t => t.id !== task.id && !formData.dependencies?.includes(t.id))
                    .map(t => (
                      <MenuItem key={t.id} value={t.id.toString()}>
                        {t.title}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <IconButton
                color="primary"
                onClick={handleAddDependency}
                disabled={!selectedDependencyId}
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskEditDialog; 