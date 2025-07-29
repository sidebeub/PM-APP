import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../../store';
import { 
  fetchTasks, 
  fetchTaskDependencies, 
  addTaskDependency, 
  removeTaskDependency 
} from '../../store/tasksSlice';
import {
  Box,
  Button,
  Typography,
  Paper,
  Divider,
  Alert,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Task } from '../../types';

interface DependencyFormProps {
  taskId: number;
}

const DependencyForm: React.FC<DependencyFormProps> = ({ taskId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tasks, loading, error: reduxError } = useSelector((state: RootState) => state.tasks);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchTaskDependencies(taskId));
  }, [dispatch, taskId]);

  const currentTask = tasks.find(task => task.id === taskId);
  
  // Get the dependencies for the current task
  const dependencies = currentTask?.dependencies || [];
  
  // Filter out the current task and tasks that are already dependencies
  const availableTasks = tasks.filter(
    task => 
      task.id !== taskId && 
      !dependencies.includes(task.id)
  );

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    setSelectedTaskId(event.target.value);
  };

  const handleAddDependency = async () => {
    if (!selectedTaskId) {
      setLocalError('Please select a task to add as a dependency');
      return;
    }

    const dependsOnTaskId = parseInt(selectedTaskId, 10);
    const dependsOnTask = tasks.find(task => task.id === dependsOnTaskId);
    
    if (!dependsOnTask) {
      setLocalError('Selected task not found');
      return;
    }

    try {
      await dispatch(addTaskDependency({ taskId, dependsOnTaskId })).unwrap();
      setSelectedTaskId('');
      setSuccess('Dependency added successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setLocalError('Failed to add dependency. Please try again.');
    }
  };

  const handleRemoveDependency = async (dependencyId: number) => {
    try {
      await dispatch(removeTaskDependency({ taskId, dependencyId })).unwrap();
      setSuccess('Dependency removed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setLocalError('Failed to remove dependency. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentTask) {
    return <Typography>Task not found</Typography>;
  }

  const error = localError || reduxError;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Manage Dependencies for "{currentTask.title}"
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

      <Typography variant="h6" gutterBottom>
        This task depends on:
      </Typography>

      {dependencies.length > 0 ? (
        <List>
          {dependencies.map((dependencyId) => {
            const dependentTask = tasks.find(t => t.id === dependencyId);
            return (
              <ListItem key={dependencyId} divider>
                <ListItemText
                  primary={dependentTask?.title || `Task #${dependencyId}`}
                  secondary={dependentTask?.status || 'Unknown status'}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveDependency(dependencyId)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No dependencies found. This task can start anytime.
        </Typography>
      )}

      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Add Dependency
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl fullWidth>
            <InputLabel id="dependency-select-label">Select Task</InputLabel>
            <Select
              labelId="dependency-select-label"
              value={selectedTaskId}
              label="Select Task"
              onChange={handleSelectChange}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select a task</em>
              </MenuItem>
              {availableTasks.map((task) => (
                <MenuItem key={task.id} value={task.id.toString()}>
                  {task.title}
                  {task.project_number && (
                    <Chip
                      label={task.project_number}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddDependency}
            disabled={!selectedTaskId}
          >
            Add
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Dependencies determine the order in which tasks must be completed. A task cannot start until all of its dependencies are completed.
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />
      
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate(`/tasks/${taskId}`)}
        >
          Back to Task
        </Button>
      </Stack>
    </Paper>
  );
};

export default DependencyForm;
