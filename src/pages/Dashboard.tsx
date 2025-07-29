import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../store';
import { fetchProjects } from '../store/projectsSlice';
import { fetchTasks } from '../store/tasksSlice';
import { fetchUsers } from '../store/usersSlice';
import { fetchCustomers } from '../store/customersSlice';
import { getCurrentUser } from '../store/authSlice';
import GlitchTitle from '../components/animations/GlitchTitle';
import GlitchCardHeader from '../components/animations/GlitchCardHeader';
import {
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Paper
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TaskIcon from '@mui/icons-material/Task';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import { Project, Task, ProjectStatus, ProjectStatusType, TaskStatus, TaskStatusType } from '../types';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects, loading: projectsLoading } = useSelector((state: RootState) => state.projects);
  const { tasks, loading: tasksLoading } = useSelector((state: RootState) => state.tasks);
  const { users, status: usersStatus } = useSelector((state: RootState) => state.users);
  const { customers, status: customersStatus } = useSelector((state: RootState) => state.customers);
  const { user, status: authStatus } = useSelector((state: RootState) => state.auth);

  // Load data when component mounts and we have a token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Dashboard mounted with token, loading data...');
      dispatch(fetchProjects());
      dispatch(fetchTasks());
    }
  }, [dispatch]);

  // Also reload data when auth status changes
  useEffect(() => {
    if (authStatus === 'succeeded' && user) {
      console.log('Auth status succeeded, reloading data...');
      dispatch(fetchProjects());
      dispatch(fetchTasks());

      // Only fetch users and customers if user is admin
      if (user.role === 'admin') {
        dispatch(fetchUsers());
        dispatch(fetchCustomers());
      }
    }
  }, [dispatch, authStatus, user]);

  const loading = projectsLoading || tasksLoading || usersStatus === 'loading' || customersStatus === 'loading' || authStatus === 'loading';

  // Calculate statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length;
  const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
  const pendingProjects = projects.filter(p => p.status === ProjectStatus.PENDING).length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === TaskStatus.Completed).length;
  const inProgressTasks = tasks.filter(t => t.status === TaskStatus.InProgress).length;
  const blockedTasks = tasks.filter(t => t.status === TaskStatus.Blocked).length;

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get recent projects and tasks
  const recentProjects = [...projects].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  const recentTasks = [...tasks].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

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
      case TaskStatus.Blocked:
      case ProjectStatus.BLOCKED:
      case 'Blocked':
        return 'error';
      case ProjectStatus.DELAYED:
      case TaskStatus.Delayed:
      case 'Delayed':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <GlitchTitle
        text="Dashboard"
        variant="h4"
        glitchInterval={5000}
        glitchDuration={300}
        intensity={7}
        gutterBottom
      />

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* Statistics Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <Box>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <AssignmentIcon />
                    </Avatar>
                    <Typography variant="h6">Projects</Typography>
                  </Box>
                  <Typography variant="h3" align="center" sx={{ my: 2 }}>
                    {totalProjects}
                  </Typography>
                  <Box display="flex" justifyContent="space-between">
                    <Chip
                      label={`${activeProjects} Active`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${completedProjects} Completed`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${pendingProjects} Pending`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                      <TaskIcon />
                    </Avatar>
                    <Typography variant="h6">Tasks</Typography>
                  </Box>
                  <Typography variant="h3" align="center" sx={{ my: 2 }}>
                    {totalTasks}
                  </Typography>
                  <Box display="flex" justifyContent="space-between">
                    <Chip
                      label={`${completedTasks} Completed`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${inProgressTasks} In Progress`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                    <Chip
                      label={`${blockedTasks} Blocked`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                      <PeopleIcon />
                    </Avatar>
                    <Typography variant="h6">Team Members</Typography>
                  </Box>
                  <Typography variant="h3" align="center" sx={{ my: 2 }}>
                    {users.length}
                  </Typography>
                  <Box display="flex" justifyContent="space-between">
                    <Chip
                      label={`${users.filter(u => u.role === 'admin' || u.role === 'project_manager').length} Managers`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${users.filter(u => u.role === 'team_member').length} Team Members`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                      <BusinessIcon />
                    </Avatar>
                    <Typography variant="h6">Customers</Typography>
                  </Box>
                  <Typography variant="h3" align="center" sx={{ my: 2 }}>
                    {customers.length}
                  </Typography>
                  <Box display="flex" justifyContent="center">
                    <Chip
                      label={`${customers.length} Total Customers`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Task Completion Progress */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <GlitchTitle
              text="Task Completion Rate"
              variant="h6"
              glitchInterval={6000}
              glitchDuration={250}
              intensity={5}
              gutterBottom
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={taskCompletionRate ?? 0}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">
                  {`${taskCompletionRate ?? 0}%`}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Recent Projects and Tasks */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Box>
              <Card>
                <GlitchCardHeader
                  title="Recent Projects"
                  glitchInterval={7000}
                  glitchDuration={250}
                  intensity={5}
                />
                <Divider />
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {recentProjects.map((project: Project) => (
                    <React.Fragment key={project.id}>
                      <ListItem>
                        <ListItemText
                          primary={project.project_number}
                          // Use disableTypography to prevent MUI from wrapping the secondary content in a <p> tag
                          disableTypography
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                              <Typography variant="body2" color="text.secondary" component="div">
                                Customer: {project.customer_name || 'N/A'}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" component="div" sx={{ mr: 1 }}>
                                  Status:
                                </Typography>
                                <Chip
                                  label={project.status}
                                  size="small"
                                  color={getStatusColor(project.status) as any}
                                  sx={{ height: 24 }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" component="div" sx={{ mr: 1 }}>
                                  Progress:
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={project.progress ?? 0}
                                  sx={{ height: 8, borderRadius: 5, width: '100%' }}
                                />
                                <Typography variant="body2" color="text.secondary" component="div" sx={{ ml: 1 }}>
                                  {project.progress ?? 0}%
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Card>
            </Box>

            <Box>
              <Card>
                <GlitchCardHeader
                  title="Recent Tasks"
                  glitchInterval={6500}
                  glitchDuration={250}
                  intensity={5}
                />
                <Divider />
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {recentTasks.map((task: Task) => (
                    <React.Fragment key={task.id}>
                      <ListItem>
                        <ListItemText
                          primary={task.title}
                          // Use disableTypography to prevent MUI from wrapping the secondary content in a <p> tag
                          disableTypography
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                              <Typography variant="body2" color="text.secondary" component="div">
                                Project: {task.project_number || 'N/A'}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" component="div" sx={{ mr: 1 }}>
                                  Status:
                                </Typography>
                                <Chip
                                  label={task.status}
                                  size="small"
                                  color={getStatusColor(task.status) as any}
                                  sx={{ height: 24 }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" component="div" sx={{ mr: 1 }}>
                                  Assignee:
                                </Typography>
                                <Typography variant="body2" component="div">
                                  {task.assignee_name || 'Unassigned'}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Card>
            </Box>
          </Box>
        </>
      )}
    </div>
  );
};

export default Dashboard;
