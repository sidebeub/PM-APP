import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Snackbar,
  Alert,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { RootState, AppDispatch } from '../store';
import { User, createUser, updateUser, deleteUser } from '../store/usersSlice';

// Define the form data interface
interface UserFormData {
  username: string;
  email: string;
  password?: string;  // Make this optional
  role: string;
  department: string;
}

const TeamMembers: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get users data from Redux store
  const { users, departments, status, error } = useSelector((state: RootState) => state.users);
  const loading = status === 'loading';
  
  // State for dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // State for form data
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    role: 'team_member',
    department: ''
  });
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });


  // Handle dialog open for adding a new user
  const handleAddUser = () => {
    setDialogMode('add');
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'team_member',
      department: ''
    });
    setOpenDialog(true);
  };

  // Handle dialog open for editing a user
  const handleEditUser = (user: User) => {
    setDialogMode('edit');
    setCurrentUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // We don't show the password
      role: user.role,
      department: user.department
    });
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
  };

  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        // Create new user
        await dispatch(createUser(formData));
        setSnackbar({
          open: true,
          message: 'User added successfully!',
          severity: 'success'
        });
      } else {
        // Update existing user
        if (currentUser) {
          // Only include password if it was changed
          const updateData = { ...formData };
          if (!updateData.password) {
            delete updateData.password;
          }
          
          await dispatch(updateUser({ id: currentUser.id, userData: updateData }));
          setSnackbar({
            open: true,
            message: 'User updated successfully!',
            severity: 'success'
          });
        }
      }
      
      // Close dialog
      setOpenDialog(false);
    } catch (err) {
      console.error('Error saving user:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save user. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await dispatch(deleteUser(userId));
        setSnackbar({
          open: true,
          message: 'User deleted successfully!',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error deleting user:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete user. Please try again.',
          severity: 'error'
        });
      }
    }
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'project_manager':
        return 'primary';
      case 'team_member':
        return 'success';
      case 'viewer':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Team Members
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddUser}
        >
          Add Team Member
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)' }}>
          <Table stickyHeader aria-label="team members table">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Department</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No team members found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role.replace('_', ' ')} 
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        aria-label="edit" 
                        color="primary"
                        onClick={() => handleEditUser(user)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        aria-label="delete" 
                        color="error"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Team Member' : 'Edit Team Member'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required={dialogMode === 'add'}
              fullWidth
              id="password"
              label={dialogMode === 'add' ? "Password" : "New Password (leave blank to keep current)"}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleSelectChange}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="project_manager">Project Manager</MenuItem>
                <MenuItem value="team_member">Team Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="department-label">Department</InputLabel>
              <Select
                labelId="department-label"
                id="department"
                name="department"
                value={formData.department}
                label="Department"
                onChange={handleSelectChange}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
                <MenuItem value="Management">Management</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Programming">Programming</MenuItem>
                <MenuItem value="Purchasing">Purchasing</MenuItem>
                <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                <MenuItem value="Quality">Quality</MenuItem>
                <MenuItem value="Shipping">Shipping</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TeamMembers;
