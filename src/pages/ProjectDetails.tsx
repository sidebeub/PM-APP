import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../store';
import { fetchProjects } from '../store/projectsSlice';
import { fetchTasks } from '../store/tasksSlice';
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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskIcon from '@mui/icons-material/Task';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';
import { Project, Task, TaskStatus, TaskStatusType, ProjectStatus, ProjectStatusType } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { projects, loading: projectsLoading } = useSelector((state: RootState) => state.projects);
  const { tasks, loading: tasksLoading } = useSelector((state: RootState) => state.tasks);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTasks());
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const loading = projectsLoading || tasksLoading;
  const project = projects.find(p => p.id === Number(id));
  const projectTasks = tasks.filter(t => t.project_id === Number(id));

  // Get status color
  const getStatusColor = (status: ProjectStatusType | TaskStatusType) => {
    switch(status) {
      case ProjectStatus.PENDING:
      case TaskStatus.Pending:
      case 'Pending':
        return 'warning';
      case ProjectStatus.IN_PROGRESS:
      case TaskStatus.InProgress:
      case 'In Progress':
        return 'info';
      case ProjectStatus.COMPLETED:
      case TaskStatus.Completed:
      case 'Completed':
        return 'success';
      case TaskStatus.Delayed:
      case ProjectStatus.DELAYED:
      case 'Delayed':
        return 'warning';
      case TaskStatus.Blocked:
      case ProjectStatus.BLOCKED:
      case 'Blocked':
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

  // Calculate task statistics
  const taskStats = {
    total: projectTasks.length,
    completed: projectTasks.filter(t => t.status === TaskStatus.Completed).length,
    inProgress: projectTasks.filter(t => t.status === TaskStatus.InProgress).length,
    pending: projectTasks.filter(t => t.status === TaskStatus.Pending).length,
    blocked: projectTasks.filter(t => t.status === TaskStatus.Blocked).length,
    delayed: projectTasks.filter(t => t.status === TaskStatus.Delayed).length,
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!project) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Project not found
        </Typography>
        <Button
          variant="contained"
          component={Link}
          to="/projects"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Projects
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
            to="/projects"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {project.project_number}
          </Typography>
          <Chip
            label={project.status}
            color={getStatusColor(project.status) as any}
            sx={{ ml: 2 }}
          />
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            component={Link}
            to={`/projects/${id}/edit`}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              // Handle delete
              console.log('Delete project', id);
              navigate('/projects');
            }}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box>
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="project tabs">
                <Tab label="Overview" />
                <Tab label="Tasks" />
                <Tab label="Timeline" />
                <Tab label="Notes" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <BusinessIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Customer"
                        secondary={project.customer_name || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Project Manager"
                        secondary="John Manager" // This would come from the users table
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AttachMoneyIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Budget"
                        secondary={project.total_budget ? `$${project.total_budget.toLocaleString()}` : 'N/A'}
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
                        secondary={formatDate(project.start_date)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarTodayIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Expected Completion"
                        secondary={formatDate(project.expected_completion_date)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarTodayIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Actual Completion"
                        secondary={formatDate(project.actual_completion_date)}
                      />
                    </ListItem>
                  </List>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Progress
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={project.progress ?? 0}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {`${project.progress}%`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {project.notes || 'No description available.'}
                  </Typography>
                </Box>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Tasks ({projectTasks.length})
                </Typography>
                <Button
                  variant="contained"
                  component={Link}
                  to={`/tasks/new?project=${id}`}
                  startIcon={<TaskIcon />}
                >
                  Add Task
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Assignee</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projectTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.assignee_name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Chip
                            label={task.status}
                            color={getStatusColor(task.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(task.due_date)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={task.progress ?? 0}
                                sx={{ height: 8, borderRadius: 5 }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                              <Typography variant="body2" color="text.secondary">
                                {`${task.progress ?? 0}%`}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View">
                            <IconButton
                              component={Link}
                              to={`/tasks/${task.id}`}
                              size="small"
                            >
                              <AssignmentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              component={Link}
                              to={`/tasks/${task.id}/edit`}
                              size="small"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                // Handle delete
                                console.log('Delete task', task.id);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {projectTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No tasks found for this project
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Project Timeline
              </Typography>
              <Box sx={{ height: 400, position: 'relative', border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                {/* Simple timeline visualization */}
                <Box sx={{ position: 'relative', height: '100%' }}>
                  <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: '10%', width: 2, backgroundColor: '#e0e0e0' }} />

                  {/* Start date */}
                  <Box sx={{ position: 'absolute', left: '10%', top: '10%', transform: 'translateX(-50%)' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'primary.main', mb: 1, mx: 'auto' }} />
                    <Paper sx={{ p: 1, maxWidth: 200 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Start Date
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(project.start_date)}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Current progress */}
                  <Box sx={{ position: 'absolute', left: '10%', top: '40%', transform: 'translateX(-50%)' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'info.main', mb: 1, mx: 'auto' }} />
                    <Paper sx={{ p: 1, maxWidth: 200 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Current Progress
                      </Typography>
                      <Typography variant="body2">
                        {project.progress ?? 0}% Complete
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Expected completion */}
                  <Box sx={{ position: 'absolute', left: '10%', top: '70%', transform: 'translateX(-50%)' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'warning.main', mb: 1, mx: 'auto' }} />
                    <Paper sx={{ p: 1, maxWidth: 200 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Expected Completion
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(project.expected_completion_date)}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                Project Notes
              </Typography>
              <Paper sx={{ p: 2, minHeight: 200 }}>
                <Typography variant="body1">
                  {project.notes || 'No notes available for this project.'}
                </Typography>
              </Paper>
            </TabPanel>
          </Paper>
        </Box>

        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Summary
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Tasks
                </Typography>
                <Typography variant="h4">
                  {taskStats.total}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {taskStats.completed}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {taskStats.inProgress}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {taskStats.pending}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Blocked/Delayed
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {taskStats.blocked + taskStats.delayed}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CalendarTodayIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Order Date"
                    secondary={formatDate(project.order_date)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarTodayIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Shipping Date"
                    secondary={formatDate(project.shipping_date)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <DescriptionIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Project Type"
                    secondary={project.project_type || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarTodayIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Created At"
                    secondary={formatDate(project.created_at)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarTodayIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Last Updated"
                    secondary={formatDate(project.updated_at)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </div>
  );
};

export default ProjectDetails;
