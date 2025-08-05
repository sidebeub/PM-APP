import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchProjects } from './store/projectsSlice';
import { fetchTasks } from './store/tasksSlice';
import { fetchUsers } from './store/usersSlice';
import { fetchCustomers } from './store/customersSlice';
import { getCurrentUser } from './store/authSlice';
import { RootState, AppDispatch, useAppDispatch } from './store';
import websocketService from './services/websocketService';
import { Snackbar, Alert, Box, CircularProgress } from '@mui/material';
import { UserRole } from './types';

// Layout components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import AppSelection from './pages/AppSelection';

// Page components
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetails from './pages/ProjectDetails';
import TaskList from './pages/TaskList';
import TaskDetails from './pages/TaskDetails';
import TaskForm from './components/forms/TaskForm';
import ProjectForm from './components/forms/ProjectForm';
import DependencyManagement from './pages/DependencyManagement';
import GanttView from './pages/GanttView';
import SimpleKanbanBoard from './pages/SimpleKanbanBoard';
import CalendarView from './pages/CalendarView';
import NotFound from './pages/NotFound';
import TeamMembers from './pages/TeamMembers';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Unauthorized from './pages/Unauthorized';
import KbomDataManager from './components/KbomDataManager';

// Styles
import './App.css';

// Component to update page title
const PageTitleUpdater: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const getPageTitle = (pathname: string) => {
      const baseName = 'Project Management Pro';
      switch (pathname) {
        case '/':
        case '/dashboard':
          return `${baseName} - Dashboard`;
        case '/projects':
          return `${baseName} - Projects`;
        case '/tasks':
          return `${baseName} - Tasks`;
        case '/users':
          return `${baseName} - Team`;
        case '/customers':
          return `${baseName} - Customers`;
        case '/gantt':
          return `${baseName} - Gantt Chart`;
        case '/kanban':
          return `${baseName} - Kanban Board`;
        case '/simple-kanban':
          return `${baseName} - Simple Kanban`;
        case '/dependencies':
          return `${baseName} - Dependencies`;
        case '/kbom':
          return `${baseName} - KBOM Import`;
        default:
          if (pathname.includes('/projects/')) return `${baseName} - Project Details`;
          if (pathname.includes('/tasks/')) return `${baseName} - Task Details`;
          return baseName;
      }
    };

    document.title = getPageTitle(location.pathname);
  }, [location.pathname]);

  return null;
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, status, user } = useSelector((state: RootState) => state.auth);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'info' | 'warning' | 'error'
  });

  useEffect(() => {
    // Check for current user when app starts
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token found, fetching current user...');
      dispatch(getCurrentUser())
        .unwrap()
        .then(() => {
          console.log('User authenticated successfully');
        })
        .catch((error) => {
          console.error('Error authenticating user:', error);
          localStorage.removeItem('token');
        });
    }
  }, [dispatch]);

  useEffect(() => {
    // Initialize WebSocket connection only after successful authentication
    const token = localStorage.getItem('token');
    if (isAuthenticated && token) {
      websocketService.updateAuthToken(token);
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated]);

  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Router>
      <PageTitleUpdater />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<AppSelection />} />
        <Route path="/app-selection" element={<AppSelection />} />

        {/* Project Management authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Project Management app routes (require authentication) */}
        <Route path="/dashboard/*" element={<AuthenticatedLayout />} />
        <Route path="/projects/*" element={<AuthenticatedLayout />} />
        <Route path="/tasks/*" element={<AuthenticatedLayout />} />
        <Route path="/gantt/*" element={<AuthenticatedLayout />} />
        <Route path="/kanban/*" element={<AuthenticatedLayout />} />
        <Route path="/calendar/*" element={<AuthenticatedLayout />} />
        <Route path="/team/*" element={<AuthenticatedLayout />} />
        <Route path="/customers/*" element={<AuthenticatedLayout />} />
        <Route path="/settings/*" element={<AuthenticatedLayout />} />
        <Route path="/dependencies/*" element={<AuthenticatedLayout />} />
        <Route path="/kbom/*" element={<AuthenticatedLayout />} />
      </Routes>

      {/* Real-time update notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Router>
  );
};

// Authenticated layout component
const AuthenticatedLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, status, token } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Check if we have a token in localStorage
  const storedToken = localStorage.getItem('token');

  // Load data when authenticated or when we have a token
  useEffect(() => {
    if (isAuthenticated || storedToken) {
      console.log('AuthenticatedLayout: Loading data...');
      dispatch(fetchProjects());
      dispatch(fetchTasks());
    }
  }, [dispatch, isAuthenticated, storedToken]);

  // Get the current user from the state
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Load admin-specific data when user is authenticated and is an admin
  useEffect(() => {
    if (status === 'succeeded' && isAuthenticated && currentUser?.role === 'admin') {
      dispatch(fetchUsers());
      dispatch(fetchCustomers());
    }
  }, [dispatch, status, isAuthenticated, currentUser]);

  // Save current route to localStorage when it changes
  useEffect(() => {
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      localStorage.setItem('lastRoute', location.pathname);
    }
  }, [location]);

  // If not authenticated and no token, redirect to login
  if (!isAuthenticated && !storedToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/app-selection" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/new" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER]}>
                <ProjectForm mode="create" />
              </RoleProtectedRoute>
            } />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/projects/:id/edit" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER]}>
                <ProjectForm mode="edit" />
              </RoleProtectedRoute>
            } />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/tasks/new" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]}>
                <TaskForm mode="create" />
              </RoleProtectedRoute>
            } />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            <Route path="/tasks/:id/edit" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]}>
                <TaskForm mode="edit" />
              </RoleProtectedRoute>
            } />
            <Route path="/tasks/:id/dependencies" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER]}>
                <DependencyManagement />
              </RoleProtectedRoute>
            } />
            <Route path="/dependencies" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER]}>
                <DependencyManagement />
              </RoleProtectedRoute>
            } />
            <Route path="/gantt" element={<GanttView />} />
            <Route path="/kanban" element={<SimpleKanbanBoard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/team" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER]}>
                <TeamMembers />
              </RoleProtectedRoute>
            } />
            <Route path="/customers" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER]}>
                <Customers />
              </RoleProtectedRoute>
            } />
            <Route path="/kbom" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER]}>
                <KbomDataManager />
              </RoleProtectedRoute>
            } />
            <Route path="/settings" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <Settings />
              </RoleProtectedRoute>
            } />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
