import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '../store';
import { logout } from '../store/authSlice';
import DatabaseConfig from '../components/DatabaseConfig';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ViewInAr as ViewInArIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';

const AppSelection: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showDatabaseConfig, setShowDatabaseConfig] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleProjectManagement = () => {
    // Check if user is already authenticated for project management
    if (user) {
      navigate('/dashboard/');
    } else {
      // Redirect to login for project management
      navigate('/login');
    }
  };

  const handle3DViewer = () => {
    // Show database configuration dialog first
    setShowDatabaseConfig(true);
  };

  const handleDatabaseConfigured = () => {
    // After database is configured, open the 3D viewer
    window.location.href = '/advapi';
  };

  return (
    <>
      {user && (
        <AppBar position="static" sx={{ mb: 4 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Welcome, {user?.username || user?.email}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Project Management Suite
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Select the application you'd like to access
          </Typography>
          {!user && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Each application has its own access requirements
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4 }}>
          <Box>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                <DashboardIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" component="h2" gutterBottom>
                  Project Management
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Manage your projects, tasks, milestones, and team collaboration. 
                  Track progress with Gantt charts, Kanban boards, and calendar views.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Features:
                </Typography>
                <Typography variant="body2" color="text.secondary" component="ul" sx={{ textAlign: 'left', mt: 1 }}>
                  <li>Project & Task Management</li>
                  <li>Team Collaboration</li>
                  <li>Gantt Charts & Kanban Boards</li>
                  <li>Calendar Integration</li>
                  <li>Customer Management</li>
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleProjectManagement}
                  sx={{ py: 1.5 }}
                >
                  {user ? 'Open Project Management' : 'Login to Project Management'}
                </Button>
              </CardActions>
            </Card>
          </Box>

          <Box>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                <ViewInArIcon sx={{ fontSize: 80, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h4" component="h2" gutterBottom>
                  3D Model Viewer
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  View and interact with 3D models using Autodesk Platform Services.
                  Upload, translate, and visualize CAD files in your browser with integrated KBOM data.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Features:
                </Typography>
                <Typography variant="body2" color="text.secondary" component="ul" sx={{ textAlign: 'left', mt: 1 }}>
                  <li>3D Model Visualization</li>
                  <li>CAD File Support</li>
                  <li>Model Upload & Translation</li>
                  <li>Interactive 3D Viewer</li>
                  <li>KBOM Data Integration</li>
                  <li>Customer & Work Order Display</li>
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  fullWidth
                  color="secondary"
                  onClick={handle3DViewer}
                  sx={{ py: 1.5 }}
                >
                  Open 3D Model Viewer
                </Button>
              </CardActions>
            </Card>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            You can switch between applications at any time by returning to this page.
          </Typography>
        </Box>
      </Container>

      {/* Database Configuration Dialog */}
      <DatabaseConfig
        open={showDatabaseConfig}
        onClose={() => setShowDatabaseConfig(false)}
        onConfigured={handleDatabaseConfigured}
      />
    </>
  );
};

export default AppSelection;
