import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../store';
import { fetchTasks, deleteTask, fetchTaskDependencies } from '../store/tasksSlice';
import { fetchProjects } from '../store/projectsSlice';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider,
  Button,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import FlagIcon from '@mui/icons-material/Flag';
import DescriptionIcon from '@mui/icons-material/Description';
import { Task, TaskStatus, TaskPriority, TaskStatusType, TaskPriorityType, Project } from '../types';

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tasks, loading: tasksLoading } = useSelector((state: RootState) => state.tasks);
  const { projects, loading: projectsLoading } = useSelector((state: RootState) => state.projects);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchProjects());

    // Fetch dependencies for the current task when the component mounts
    if (id) {
      const taskId = parseInt(id, 10);
      dispatch(fetchTaskDependencies(taskId));
    }
  }, [dispatch, id]);

  const loading = tasksLoading || projectsLoading;
  const task = tasks.find(t => t && t.id === Number(id));
  const project = task ? projects.find(p => p && p.id === task.project_id) : null;

  // Handle delete confirmation
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await dispatch(deleteTask(Number(id))).unwrap();
      navigate('/tasks');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete task');
    }
  };

  // Get status color
  const getStatusColor = (status: TaskStatusType) => {
    // Convert string status to enum if needed
    const statusEnum = typeof status === 'string' 
      ? Object.values(TaskStatus).find(enumStatus => enumStatus === status) || TaskStatus.Pending
      : status;

    switch(statusEnum) {
      case TaskStatus.Pending:
        return 'warning';
      case TaskStatus.InProgress:
        return 'info';
      case TaskStatus.Completed:
        return 'success';
      case TaskStatus.Blocked:
        return 'error';
      case TaskStatus.Delayed:
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: TaskPriorityType) => {
    // Convert string priority to enum if needed
    const priorityEnum = typeof priority === 'string'
      ? Object.values(TaskPriority).find(enumPriority => enumPriority === priority) || TaskPriority.Medium
      : priority;

    switch(priorityEnum) {
      case TaskPriority.Low:
        return 'success';
      case TaskPriority.Medium:
        return 'info';
      case TaskPriority.High:
        return 'warning';
      case TaskPriority.Critical:
        return 'error';
      default:
        return 'default';
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!task) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Task not found
        </Typography>
        <Button
          variant="contained"
          component={Link}
          to="/tasks"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Tasks
        </Button>
      </Box>
    );
  }

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            component={Link}
            to="/tasks"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {task.title}
          </Typography>
          <Chip
            label={task.status}
            color={getStatusColor(task.status) as any}
            sx={{ ml: 2 }}
          />
          <Chip
            label={task.priority}
            color={getPriorityColor(task.priority) as any}
            sx={{ ml: 1 }}
          />
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            component={Link}
            to={`/tasks/${id}/edit`}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenDeleteDialog}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Task Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <AssignmentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Project"
                      secondary={
                        project ? (
                          <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                            {project.project_number}
                          </Link>
                        ) : 'N/A'
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Assignee"
                      secondary={task.assignee_name || 'Unassigned'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <FlagIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Department"
                      secondary={task.department || 'N/A'}
                    />
                  </ListItem>
                </List>
              </Box>
              <Box>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarTodayIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Start Date"
                      secondary={formatDate(task.start_date)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarTodayIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Due Date"
                      secondary={formatDate(task.due_date)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarTodayIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Completed Date"
                      secondary={formatDate(task.completed_date)}
                    />
                  </ListItem>
                </List>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={task.progress ?? 0}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">
                      {`${task.progress ?? 0}%`}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1">
                  {task.description || 'No description available.'}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Dependencies
              </Typography>
              <Button
                variant="outlined"
                component={Link}
                to={`/tasks/${id}/dependencies`}
                startIcon={<EditIcon />}
              >
                Manage Dependencies
              </Button>
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                This task depends on:
              </Typography>
              {task.dependencies && task.dependencies.length > 0 ? (
                <List>
                  {task.dependencies.map(dependencyId => {
                    const dependentTask = tasks.find(t => t.id === dependencyId);
                    return (
                      <ListItem key={dependencyId} divider>
                        <ListItemText
                          primary={
                            <Link to={`/tasks/${dependencyId}`} style={{ textDecoration: 'none' }}>
                              {dependentTask?.title || `Task #${dependencyId}`}
                            </Link>
                          }
                          secondary={dependentTask?.status || 'Unknown status'}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No dependencies found.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Tasks that depend on this:
              </Typography>
              {tasks.some(t => t.dependencies?.includes(Number(id))) ? (
                <List>
                  {tasks
                    .filter(t => t.dependencies?.includes(Number(id)))
                    .map(dependentTask => (
                      <ListItem key={dependentTask.id} divider>
                        <ListItemText
                          primary={
                            <Link to={`/tasks/${dependentTask.id}`} style={{ textDecoration: 'none' }}>
                              {dependentTask.title}
                            </Link>
                          }
                          secondary={dependentTask.status}
                        />
                      </ListItem>
                    ))}
                </List>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No dependent tasks found.
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>

        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status History
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status changes would be displayed here.
              </Typography>
              {/* This would be populated from a status_history table if available */}
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Created as Pending"
                    secondary={formatDate(task.created_at)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Changed to ${task.status}`}
                    secondary={formatDate(task.updated_at)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Update
              </Typography>
              <TextField
                select
                fullWidth
                label="Status"
                value={task.status}
                sx={{ mb: 2 }}
                disabled
              >
                <MenuItem value={TaskStatus.Pending}>Pending</MenuItem>
                <MenuItem value={TaskStatus.InProgress}>In Progress</MenuItem>
                <MenuItem value={TaskStatus.Completed}>Completed</MenuItem>
                <MenuItem value={TaskStatus.Delayed}>Delayed</MenuItem>
                <MenuItem value={TaskStatus.Blocked}>Blocked</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Progress"
                type="number"
                value={task.progress}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                sx={{ mb: 2 }}
                disabled
              />
              <Button
                variant="contained"
                fullWidth
                disabled
              >
                Update
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                (This is a demo - updates are disabled)
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the task "{task.title}"? This action cannot be undone.
            {tasks.some(t => t.dependencies?.includes(Number(id))) && (
              <Typography color="error" sx={{ mt: 2 }}>
                Warning: Other tasks depend on this task. Deleting it may affect those tasks.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TaskDetails;
