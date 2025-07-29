import React, { useState, useEffect, ReactNode } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography
} from '@mui/material';
import { DepartmentMilestone, Project, MilestoneStatus } from '../../types';

interface MilestoneFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (milestone: Partial<DepartmentMilestone>) => void;
  projects: Project[];
  milestone?: DepartmentMilestone;
  title?: string;
}

interface FormData {
  project_id: number;
  department: string;
  milestone_name: string;
  planned_date: string;
  status: string;
  type: 'deadline' | 'review' | 'delivery' | 'other';
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({
  open,
  onClose,
  onSave,
  projects,
  milestone,
  title = 'Add Milestone'
}) => {
  const [formData, setFormData] = useState<FormData>({
    project_id: projects[0]?.id || 0,
    department: '',
    milestone_name: '',
    planned_date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    type: 'deadline'
  });

  // Initialize form data when editing an existing milestone
  useEffect(() => {
    if (milestone) {
      setFormData({
        project_id: milestone.project_id,
        department: milestone.department || '',
        milestone_name: milestone.milestone_name,
        planned_date: milestone.planned_date || new Date().toISOString().split('T')[0],
        status: milestone.status,
        type: (milestone as any).type || 'deadline'
      });
    }
  }, [milestone]);

  // Handle text field changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent<unknown>, child: ReactNode) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create milestone object
    const newMilestone: Partial<DepartmentMilestone> & { type?: string } = {
      project_id: formData.project_id,
      department: formData.department,
      milestone_name: formData.milestone_name,
      planned_date: formData.planned_date,
      actual_date: undefined,
      status: formData.status as MilestoneStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: formData.type
    };
    
    onSave(newMilestone);
    onClose();
  };

  const departments = [
    'Design',
    'Engineering',
    'Manufacturing',
    'Programming',
    'Quality Assurance',
    'Shipping',
    'Installation',
    'Support'
  ];

  const statuses = [
    'Pending',
    'In Progress',
    'Completed',
    'Delayed'
  ];

  const milestoneTypes = [
    { value: 'deadline', label: 'Deadline' },
    { value: 'review', label: 'Review' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="project-select-label">Project</InputLabel>
            <Select
              labelId="project-select-label"
              name="project_id"
              value={formData.project_id}
              label="Project"
              onChange={handleSelectChange}
              required
            >
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.project_number} - {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <FormControl fullWidth required>
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                  labelId="department-label"
                  name="department"
                  value={formData.department}
                  label="Department"
                  onChange={handleSelectChange}
                >
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <TextField
                required
                fullWidth
                label="Milestone Name"
                name="milestone_name"
                value={formData.milestone_name}
                onChange={handleTextChange}
              />
            </Box>

            <Box>
              <TextField
                required
                fullWidth
                label="Planned Date"
                name="planned_date"
                type="date"
                value={formData.planned_date}
                onChange={handleTextChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>

            <Box>
              <FormControl fullWidth required>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  label="Status"
                  onChange={handleSelectChange}
                >
                  {statuses.map(status => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormControl fullWidth required>
                <InputLabel id="type-label">Type</InputLabel>
                <Select
                  labelId="type-label"
                  name="type"
                  value={formData.type}
                  label="Type"
                  onChange={handleSelectChange}
                >
                  {milestoneTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Note: Milestone types determine the visual representation on the Gantt chart:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#f44336', mr: 1 }} />
                <Typography variant="body2">Deadline</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#2196f3', mr: 1 }} />
                <Typography variant="body2">Review</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50', mr: 1 }} />
                <Typography variant="body2">Delivery</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#9e9e9e', mr: 1 }} />
                <Typography variant="body2">Other</Typography>
              </Box>
            </Box>
          </Box>
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

export default MilestoneForm;
