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
  Box,
  Snackbar,
  Alert,
  Avatar,
  Grid
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { RootState, AppDispatch } from '../store';
import { Customer, createCustomer, updateCustomer, deleteCustomer } from '../store/customersSlice';

// Define the form data interface
interface CustomerFormData {
  name: string;
  logo: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const Customers: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get customers data from Redux store
  const { customers, status, error } = useSelector((state: RootState) => state.customers);
  const loading = status === 'loading';
  
  // State for dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  
  // State for form data
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    logo: 'https://via.placeholder.com/50',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
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

  // Handle dialog open for adding a new customer
  const handleAddCustomer = () => {
    setDialogMode('add');
    setFormData({
      name: '',
      logo: 'https://via.placeholder.com/50',
      contact_person: '',
      email: '',
      phone: '',
      address: ''
    });
    setOpenDialog(true);
  };

  // Handle dialog open for editing a customer
  const handleEditCustomer = (customer: Customer) => {
    setDialogMode('edit');
    setCurrentCustomer(customer);
    setFormData({
      name: customer.name,
      logo: customer.logo,
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        // Create new customer
        const resultAction = await dispatch(createCustomer(formData));
        
        // Check if the action was fulfilled or rejected
        if (createCustomer.fulfilled.match(resultAction)) {
          // Success case
          setSnackbar({
            open: true,
            message: 'Customer added successfully!',
            severity: 'success'
          });
          
          // Close dialog
          setOpenDialog(false);
        } else if (createCustomer.rejected.match(resultAction)) {
          // Error case - get the error message from the payload
          const errorMessage = resultAction.payload as string || 
                              resultAction.error.message || 
                              'Failed to create customer. Please try again.';
          
          setSnackbar({
            open: true,
            message: errorMessage,
            severity: 'error'
          });
          
          // Don't close dialog so user can fix the error
        }
      } else {
        // Update existing customer
        if (currentCustomer) {
          const resultAction = await dispatch(updateCustomer({ id: currentCustomer.id, customerData: formData }));
          
          // Check if the action was fulfilled or rejected
          if (updateCustomer.fulfilled.match(resultAction)) {
            // Success case
            setSnackbar({
              open: true,
              message: 'Customer updated successfully!',
              severity: 'success'
            });
            
            // Close dialog
            setOpenDialog(false);
          } else if (updateCustomer.rejected.match(resultAction)) {
            // Error case - get the error message from the payload
            const errorMessage = resultAction.payload as string || 
                                resultAction.error.message || 
                                'Failed to update customer. Please try again.';
            
            setSnackbar({
              open: true,
              message: errorMessage,
              severity: 'error'
            });
            
            // Don't close dialog so user can fix the error
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error saving customer:', err);
      setSnackbar({
        open: true,
        message: 'An unexpected error occurred. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle customer deletion
  const handleDeleteCustomer = async (customerId: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const resultAction = await dispatch(deleteCustomer(customerId));
        
        // Check if the action was fulfilled or rejected
        if (deleteCustomer.fulfilled.match(resultAction)) {
          // Success case
          setSnackbar({
            open: true,
            message: 'Customer deleted successfully!',
            severity: 'success'
          });
        } else if (deleteCustomer.rejected.match(resultAction)) {
          // Error case - get the error message from the payload
          const errorMessage = resultAction.payload as string || 
                              resultAction.error.message || 
                              'Failed to delete customer. Please try again.';
          
          setSnackbar({
            open: true,
            message: errorMessage,
            severity: 'error'
          });
        }
      } catch (err) {
        console.error('Unexpected error deleting customer:', err);
        setSnackbar({
          open: true,
          message: 'An unexpected error occurred. Please try again.',
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Customers
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddCustomer}
        >
          Add Customer
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)' }}>
          <Table stickyHeader aria-label="customers table">
            <TableHead>
              <TableRow>
                <TableCell>Logo</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Contact Email</TableCell>
                <TableCell>Contact Phone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">Loading...</TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No customers found</TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>
                      <Avatar 
                        src={customer.logo} 
                        alt={customer.name}
                        sx={{ width: 40, height: 40 }}
                        variant="rounded"
                      />
                    </TableCell>
                    <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.contact_person || '-'}</TableCell>
              <TableCell>{customer.email || '-'}</TableCell>
              <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditCustomer(customer)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteCustomer(customer.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Customer' : 'Edit Customer'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Customer Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              fullWidth
              id="logo"
              label="Logo URL"
              name="logo"
              value={formData.logo}
              onChange={handleInputChange}
              helperText="URL to customer's logo image"
            />
            <TextField
              margin="normal"
              fullWidth
              id="contact_person"
              label="Contact Person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleInputChange}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Contact Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
              <TextField
                margin="normal"
                fullWidth
                id="phone"
                label="Contact Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </Box>
            <TextField
              margin="normal"
              fullWidth
              id="address"
              label="Address"
              name="address"
              multiline
              rows={3}
              value={formData.address}
              onChange={handleInputChange}
            />
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

export default Customers;
