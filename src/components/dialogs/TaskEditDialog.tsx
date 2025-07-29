import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDispatch } from 'react-redux';
import { updateTask } from '../../store/tasksSlice';
import { AppDispatch } from '../../store';
import { Task, TaskStatus, TaskPriority } from '../../types';

interface TaskEditDialogProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  dependencies: Map<number, number[]>;
  allTasks: Task[];
}

const TaskEditDialog: React.FC<TaskEditDialogProps> = ({
  task,
  open,
  onClose,
  dependencies,
  allTasks
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);

  useEffect(() => {
    setEditedTask(task);
    setSelectedDependencies(dependencies.get(task.id) || []);
  }, [task, dependencies]);

  const handleTextChange = (field: keyof Task) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditedTask(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSelectChange = (field: keyof Task) => (
    event: SelectChangeEvent
  ) => {
    setEditedTask(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setEditedTask(prev => ({
      ...prev,
      due_date: date ? date.toISOString() : undefined
    }));
  };

  const handleDependencyToggle = (dependencyId: number) => {
    setSelectedDependencies(prev => {
      if (prev.includes(dependencyId)) {
        return prev.filter(id => id !== dependencyId);
      }
      return [...prev, dependencyId];
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(updateTask({
        id: task.id,
        task: {
          ...editedTask,
          dependencies: selectedDependencies
        }
      }));
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getDependentTaskTitle = (taskId: number) => {
    const task = allTasks.find(t => t.id === taskId);
    return task ? task.title : `Task ${taskId}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Task</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Title"
            value={editedTask.title}
            onChange={handleTextChange('title')}
            fullWidth
          />
          
          <TextField
            label="Description"
            value={editedTask.description || ''}
            onChange={handleTextChange('description')}
            multiline
            rows={4}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={editedTask.status}
              onChange={handleSelectChange('status')}
              label="Status"
            >
              <MenuItem value={TaskStatus.Pending}>Pending</MenuItem>
              <MenuItem value={TaskStatus.InProgress}>In Progress</MenuItem>
              <MenuItem value={TaskStatus.Completed}>Completed</MenuItem>
              <MenuItem value={TaskStatus.Blocked}>Blocked</MenuItem>
              <MenuItem value={TaskStatus.Delayed}>Delayed</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={editedTask.priority}
              onChange={handleSelectChange('priority')}
              label="Priority"
            >
              <MenuItem value={TaskPriority.Low}>Low</MenuItem>
              <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
              <MenuItem value={TaskPriority.High}>High</MenuItem>
              <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Due Date"
              value={editedTask.due_date ? new Date(editedTask.due_date) : null}
              onChange={handleDateChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>

          <TextField
            label="Assignee"
            value={editedTask.assignee_name || ''}
            onChange={handleTextChange('assignee_name')}
            fullWidth
          />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Dependencies
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {allTasks
                .filter(t => t.id !== task.id)
                .map(t => (
                  <Chip
                    key={t.id}
                    label={t.title}
                    color={selectedDependencies.includes(t.id) ? 'primary' : 'default'}
                    onClick={() => handleDependencyToggle(t.id)}
                    sx={{ m: 0.5 }}
                  />
                ))}
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