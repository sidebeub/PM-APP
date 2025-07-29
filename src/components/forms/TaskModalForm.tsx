import React, { useState, useEffect } from 'react';
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
  Grid,
  Typography,
  Slider,
  Box,
  SelectChangeEvent
} from '@mui/material';
import { Task, TaskStatus, TaskPriority, Project } from '../../types';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface TaskModalFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task;
  projects: Project[];
  title: string;
}

const TaskModalForm: React.FC<TaskModalFormProps> = ({
  open,
  onClose,
  onSave,
  task,
  projects,
  title
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    project_id: projects.length > 0 ? projects[0].id : undefined,
    title: '',
    description: '',
    status: TaskStatus.Pending,
    priority: TaskPriority.Medium,
    start_date: '',
    due_date: '',
    progress: 0,
    dependencies: []
  });

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        status: task.status ?? TaskStatus.Pending,
        priority: task.priority ?? TaskPriority.Medium,
        progress: task.progress ?? 0,
        dependencies: task.dependencies ?? []
      });
    } else {
      // Default values for new task
      setFormData({
        project_id: projects.length > 0 ? projects[0].id : undefined,
        title: '',
        description: '',
        status: TaskStatus.Pending,
        priority: TaskPriority.Medium,
        start_date: '',
        due_date: '',
        progress: 0,
        dependencies: []
      });
    }
  }, [task, projects]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProgressChange = (_event: Event, newValue: number | number[]) => {
    setFormData(prev => ({
      ...prev,
      progress: newValue as number
    }));
  };

  const handleDateChange = (name: string, date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [name]: date.toISOString()
      }));
    }
  };

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={3}>
            <Grid sx={{ gridColumn: 'span 6' }}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="project-select-label">Project</InputLabel>
                <Select
                  labelId="project-select-label"
                  id="project_id"
                  name="project_id"
                  value={formData.project_id?.toString() ?? ''}
                  label="Project"
                  onChange={handleSelectChange}
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id.toString()}>
                      {project.project_number} - {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid sx={{ gridColumn: 'span 12' }}>
              <TextField
                fullWidth
                label="Task Title"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>

            <Grid sx={{ gridColumn: 'span 12' }}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={4}
              />
            </Grid>

            <Grid sx={{ gridColumn: 'span 6' }}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  id="status"
                  name="status"
                  value={formData.status ?? TaskStatus.Pending}
                  label="Status"
                  onChange={handleSelectChange}
                >
                  {Object.values(TaskStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid sx={{ gridColumn: 'span 6' }}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="priority-select-label">Priority</InputLabel>
                <Select
                  labelId="priority-select-label"
                  id="priority"
                  name="priority"
                  value={formData.priority ?? TaskPriority.Medium}
                  label="Priority"
                  onChange={handleSelectChange}
                >
                  {Object.values(TaskPriority).map((priority) => (
                    <MenuItem key={priority} value={priority}>
                      {priority}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid sx={{ gridColumn: 'span 6' }}>
              <TextField
                fullWidth
                label="Start Date"
                name="start_date"
                type="date"
                value={formData.start_date ? formData.start_date.split('T')[0] : ''}
                onChange={handleChange}
                margin="normal"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid sx={{ gridColumn: 'span 6' }}>
              <TextField
                fullWidth
                label="Due Date"
                name="due_date"
                type="date"
                value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                onChange={handleChange}
                margin="normal"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid sx={{ gridColumn: 'span 12' }}>
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
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskModalForm;
