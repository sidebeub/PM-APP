import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../../store';
import { fetchProjects, createProject, updateProject, fetchProjectById } from '../../store/projectsSlice';
import { fetchCustomers } from '../../store/customersSlice';
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
} from '@mui/material';
import { Project, ProjectStatus } from '../../types';

interface ProjectFormProps {
  mode: 'create' | 'edit';
}

const ProjectForm: React.FC<ProjectFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { projects, currentProject, loading } = useSelector((state: RootState) => state.projects);
  const { customers } = useSelector((state: RootState) => state.customers);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Project>>({
    project_number: '',
    customer_id: undefined,
    status: ProjectStatus.PENDING,
    start_date: '',
    expected_completion_date: '',
    actual_completion_date: '',
    shipping_date: '',
    order_date: '',
    total_budget: 0,
    progress: 0,
    notes: '',
    project_manager_id: undefined,
    project_type: '',
  });

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchCustomers());

    if (mode === 'edit' && id) {
      dispatch(fetchProjectById(Number(id)));
    }
  }, [dispatch, mode, id]);

  useEffect(() => {
    if (mode === 'edit' && currentProject) {
      setFormData({
        ...currentProject,
        status: currentProject.status || ProjectStatus.PENDING,
      });
    }
  }, [mode, currentProject]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? 0 : Number(value),
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Format the date properly for the database
    let formattedDate = value;
    if (value) {
      // Ensure the date is in YYYY-MM-DD format for the database
      const dateParts = value.split('/');
      if (dateParts.length === 3) {
        // If entered as MM/DD/YYYY, convert to YYYY-MM-DD
        formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedDate || '',
    }));
  };

  const handleProgressChange = (event: Event, newValue: number | number[]) => {
    setFormData(prev => ({
      ...prev,
      progress: newValue as number,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Create a copy of formData with status explicitly set to 'Pending' for new projects
      const projectData = {
        ...formData,
        status: mode === 'create' ? 'Pending' : formData.status,
        // Convert empty strings to undefined for database
        start_date: formData.start_date === '' ? undefined : formData.start_date,
        expected_completion_date: formData.expected_completion_date === '' ? undefined : formData.expected_completion_date,
        actual_completion_date: formData.actual_completion_date === '' ? undefined : formData.actual_completion_date,
        shipping_date: formData.shipping_date === '' ? undefined : formData.shipping_date,
        order_date: formData.order_date === '' ? undefined : formData.order_date,
        total_budget: formData.total_budget || 0,
        project_manager_id: formData.project_manager_id || null,
      } as Partial<Project>;

      console.log('Submitting project data:', projectData);

      if (mode === 'create') {
        await dispatch(createProject(projectData)).unwrap();
        setSuccess('Project created successfully!');
      } else if (mode === 'edit' && id) {
        // Only update if there are actual changes
        const currentProject = projects.find(p => p.id === Number(id));
        if (currentProject) {
          const hasChanges = Object.keys(projectData).some(key => {
            const typedKey = key as keyof Project;
            return JSON.stringify(projectData[typedKey]) !== JSON.stringify(currentProject[typedKey]);
          });

          if (hasChanges) {
            await dispatch(updateProject({ id: Number(id), project: projectData })).unwrap();
            setSuccess('Project updated successfully!');
          }
        }
      }

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(mode === 'create' ? '/projects' : `/projects/${id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      console.error('Error saving project:', err);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {mode === 'create' ? 'Create New Project' : 'Edit Project'}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <TextField
              required
              fullWidth
              label="Project Number"
              name="project_number"
              value={formData.project_number || ''}
              onChange={handleInputChange}
            />
          </Box>

          <Box>
            <FormControl fullWidth required>
              <InputLabel id="customer-label">Customer</InputLabel>
              <Select
                labelId="customer-label"
                name="customer_id"
                value={formData.customer_id ?? ''}
                onChange={handleSelectChange}
                label="Customer"
              >
                <MenuItem value="">
                  <em>Select a customer</em>
                </MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>
            <FormControl fullWidth required>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                name="status"
                value={formData.status || ProjectStatus.PENDING}
                onChange={handleSelectChange}
                label="Status"
              >
                <MenuItem value={ProjectStatus.PENDING}>{ProjectStatus.PENDING}</MenuItem>
                <MenuItem value={ProjectStatus.IN_PROGRESS}>{ProjectStatus.IN_PROGRESS}</MenuItem>
                <MenuItem value={ProjectStatus.COMPLETED}>{ProjectStatus.COMPLETED}</MenuItem>
                <MenuItem value={ProjectStatus.DELAYED}>{ProjectStatus.DELAYED}</MenuItem>
                <MenuItem value={ProjectStatus.BLOCKED}>{ProjectStatus.BLOCKED}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box>
            <FormControl fullWidth>
              <InputLabel id="project-manager-label">Project Manager</InputLabel>
              <Select
                labelId="project-manager-label"
                name="project_manager_id"
                value={formData.project_manager_id ?? ''}
                onChange={handleSelectChange}
                label="Project Manager"
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                <MenuItem value={1}>John Doe</MenuItem>
                <MenuItem value={2}>Jane Smith</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Project Type"
              name="project_type"
              value={formData.project_type || ''}
              onChange={handleInputChange}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Total Budget"
              name="total_budget"
              type="number"
              value={formData.total_budget}
              onChange={handleNumberInputChange}
              InputProps={{
                startAdornment: <span>$</span>,
              }}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Start Date"
              name="start_date"
              type="date"
              value={formData.start_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Expected Completion Date"
              name="expected_completion_date"
              type="date"
              value={formData.expected_completion_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Actual Completion Date"
              name="actual_completion_date"
              type="date"
              value={formData.actual_completion_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Order Date"
              name="order_date"
              type="date"
              value={formData.order_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Shipping Date"
              name="shipping_date"
              type="date"
              value={formData.shipping_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography gutterBottom>Progress: {formData.progress}%</Typography>
          <Slider
            value={formData.progress || 0}
            onChange={handleProgressChange}
            aria-labelledby="progress-slider"
            valueLabelDisplay="auto"
            step={5}
            marks
            min={0}
            max={100}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
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
              disabled={loading}
            >
              {mode === 'create' ? 'Create Project' : 'Update Project'}
            </Button>
          </Stack>
        </Box>
      </form>
    </Paper>
  );
};

export default ProjectForm;
