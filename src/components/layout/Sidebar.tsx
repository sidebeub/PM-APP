import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box
} from '@mui/material';
import ScrambleHover from '../animations/ScrambleHover';
import Float from '../animations/Float';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TimelineIcon from '@mui/icons-material/Timeline';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import SettingsIcon from '@mui/icons-material/Settings';
import PixelIcon from '@mui/icons-material/Grain';
import StorageIcon from '@mui/icons-material/Storage';

interface SidebarProps {
  isOpen?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

const drawerWidth = 220;

const Sidebar: React.FC<SidebarProps> = ({ isOpen, collapsed, onToggle, onNavigate }) => {
  const drawerOpen = isOpen !== undefined ? isOpen : !collapsed;
  const location = useLocation();
  const navigate = useNavigate();
  const [shouldClose, setShouldClose] = useState(false);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Projects', icon: <AssignmentIcon />, path: '/projects' },
    { text: 'Tasks', icon: <ViewListIcon />, path: '/tasks' },
    { text: 'Gantt Chart', icon: <TimelineIcon />, path: '/gantt' },
    { text: 'Kanban Board', icon: <ViewKanbanIcon />, path: '/kanban' },
    { text: 'Calendar', icon: <CalendarTodayIcon />, path: '/calendar' },
  ];

  const secondaryMenuItems = [
    { text: 'Team Members', icon: <PeopleIcon />, path: '/team' },
    { text: 'Customers', icon: <BusinessIcon />, path: '/customers' },
    { text: 'KBOM Data', icon: <StorageIcon />, path: '/kbom' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Pixel Trail Demo', icon: <PixelIcon />, path: '/pixel-trail' },
  ];

  // Handle navigation
  const handleNavigation = (path: string) => {
    setShouldClose(true);
    navigate(path);
  };

  // Handle drawer state changes
  useEffect(() => {
    if (shouldClose && onNavigate) {
      onNavigate();
      setShouldClose(false);
    }
  }, [shouldClose, onNavigate]);

  return (
    <Drawer
      variant="temporary"
      open={drawerOpen}
      keepMounted={true}
      ModalProps={{
        keepMounted: true,
        disableEnforceFocus: false,
        disableAutoFocus: false,
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'fixed',
          zIndex: 1200,
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.text}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                <Float amplitude={5} speed={0.5}>
                  {item.icon}
                </Float>
              </ListItemIcon>
              <ListItemText
                primary={
                  <ScrambleHover
                    text={item.text}
                    scrambleSpeed={30}
                    maxIterations={5}
                  />
                }
              />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <List>
          {secondaryMenuItems.map((item) => (
            <ListItemButton
              key={item.text}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                <Float amplitude={5} speed={0.5}>
                  {item.icon}
                </Float>
              </ListItemIcon>
              <ListItemText
                primary={
                  <ScrambleHover
                    text={item.text}
                    scrambleSpeed={30}
                    maxIterations={5}
                  />
                }
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
