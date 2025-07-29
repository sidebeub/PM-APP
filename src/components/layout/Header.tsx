import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '../../store';
import { logout } from '../../store/authSlice';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge, 
  Avatar, 
  Box,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleClose();
  };
  return (
    <AppBar position="fixed" sx={{ 
      zIndex: (theme) => theme.zIndex.drawer + 1,
      backgroundColor: '#000000'
    }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={toggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography
          variant="h6"
          noWrap
          component={Link}
          to="/"
          sx={{ 
            flexGrow: 1, 
            display: { xs: 'none', sm: 'block' },
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          Project Management
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <SearchIcon />
          </IconButton>
          
          <IconButton color="inherit" sx={{ mr: 2 }}>
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleClick}
              size="small"
              sx={{ ml: 2 }}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar 
                alt={user?.username || 'User'} 
                src="/static/images/avatar/1.jpg" 
                sx={{ width: 32, height: 32 }}
              >
                {user?.username ? user.username[0].toUpperCase() : <AccountCircleIcon />}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
        
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem component={Link} to="/settings">
            <Avatar /> Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
