import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../../store';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Divider,
  Alert,
  Stack,
  Avatar
} from '@mui/material';
import { Customer } from '../../types';

interface CustomerFormProps {
  mode: 'create' | 'edit';
}

const CustomerForm: React.FC<CustomerFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mock customers data (in a real app, this would come from Redux)
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 1,
      name: 'Acme Corporation',
      contact_person: 'John Smith',
      email: 'john@acme.com',
      phone: '555-123-4567',
      address: '123 Main St, Anytown, USA',
      logo: 'https://via.placeholder.com/50',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Globex Industries',
      contact_person: 'Jane Doe',
      email: 'jane@globex.com',
      phone: '555-987-6543',
      address: '456 Oak Ave, Somewhere, USA',
      logo: 'https://via.placeholder.com/50',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  // Form state
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    logo: '',
  });

  useEffect(() => {
    if (mode === 'edit' && id) {
      const customerId = parseInt(id, 10);
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setFormData({
          ...customer,
        });
      }
    }
  }, [mode, id, customers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    if (!formData.name) {
      setError('Customer name is required');
      return;
    }

    try {
      // In a real app, this would dispatch an action to save the customer
      console.log('Submitting customer:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (mode === 'create') {
        // Add new customer to the mock data
        const newCustomer: Customer = {
          id: Math.max(0, ...customers.map(c => c.id)) + 1,
          name: formData.name!,
          contact_person: formData.contact_person,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          logo: formData.logo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCustomers([...customers, newCustomer]);
      } else {
        // Update existing customer in the mock data
        setCustomers(customers.map(customer => 
          customer.id === parseInt(id!, 10) ? { ...customer, ...formData, updated_at: new Date().toISOString() } : customer
        ));
      }
      
      setSuccess(mode === 'create' ? 'Customer created successfully!' : 'Customer updated successfully!');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/customers');
      }, 1500);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error saving customer:', err);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {mode === 'create' ? 'Create New Customer' : 'Edit Customer'}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ flex: '1 1 45%', minWidth: '250px' }}>
            <TextField
              required
              fullWidth
              label="Customer Name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 45%', minWidth: '250px' }}>
            <TextField
              fullWidth
              label="Contact Person"
              name="contact_person"
              value={formData.contact_person || ''}
              onChange={handleInputChange}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 45%', minWidth: '250px' }}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 45%', minWidth: '250px' }}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
            />
          </Box>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Address"
            name="address"
            multiline
            rows={2}
            value={formData.address || ''}
            onChange={handleInputChange}
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Logo URL"
            name="logo"
            value={formData.logo || ''}
            onChange={handleInputChange}
            helperText="Enter a URL for the customer's logo"
          />
          {formData.logo && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2 }}>
                Logo Preview:
              </Typography>
              <Avatar
                src={formData.logo}
                alt={formData.name || 'Customer logo'}
                sx={{ width: 50, height: 50 }}
              />
            </Box>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => navigate('/customers')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
          >
            {mode === 'create' ? 'Create Customer' : 'Update Customer'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
};

export default CustomerForm;
