import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the Customer interface
export interface Customer {
  id: number;
  name: string;
  logo: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Define the state interface
interface CustomersState {
  customers: Customer[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Define the initial state
const initialState: CustomersState = {
  customers: [],
  status: 'idle',
  error: null
};

// Async thunk for fetching customers
export const fetchCustomers = createAsyncThunk('customers/fetchCustomers', async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get('http://localhost:3001/api/customers', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
});

// Async thunk for creating a customer
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      // Map frontend field names to backend field names
      const mappedData = {
        name: customerData.name,
        contact_person: customerData.contact_person,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        logo: customerData.logo
      };

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3001/api/customers', mappedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      // Handle axios error
      if (error.response) {
        return rejectWithValue(error.response.data.message || error.response.data.error || 'Failed to create customer');
      } else if (error.request) {
        return rejectWithValue('No response from server. Please try again later.');
      } else {
        return rejectWithValue('Error setting up request. Please try again.');
      }
    }
  }
);

// Async thunk for updating a customer
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, customerData }: { id: number; customerData: Partial<Customer> }, { rejectWithValue }) => {
    try {
      // Map frontend field names to backend field names
      const mappedData = {
        name: customerData.name,
        contact_person: customerData.contact_person,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        logo: customerData.logo
      };

      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:3001/api/customers/${id}`, mappedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      // Handle axios error
      if (error.response) {
        return rejectWithValue(error.response.data.message || error.response.data.error || 'Failed to update customer');
      } else if (error.request) {
        return rejectWithValue('No response from server. Please try again later.');
      } else {
        return rejectWithValue('Error setting up request. Please try again.');
      }
    }
  }
);

// Async thunk for deleting a customer
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: number, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/customers/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return id;
    } catch (error: any) {
      // Handle axios error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = error.response.data.message || error.response.data.error || 'Failed to delete customer';

        // Special handling for associated projects error
        if (errorMessage.includes('associated projects')) {
          return rejectWithValue('Cannot delete this customer because it has associated projects. Please delete the projects first or assign them to another customer.');
        }

        return rejectWithValue(errorMessage);
      } else if (error.request) {
        // The request was made but no response was received
        return rejectWithValue('No response from server. Please try again later.');
      } else {
        // Something happened in setting up the request that triggered an Error
        return rejectWithValue('Error setting up request. Please try again.');
      }
    }
  }
);

// Create the customers slice
const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    // Add any synchronous reducers here if needed
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchCustomers
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCustomers.fulfilled, (state, action: PayloadAction<Customer[]>) => {
        state.status = 'succeeded';
        state.customers = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch customers';
      })

      // Handle createCustomer
      .addCase(createCustomer.fulfilled, (state, action: PayloadAction<Customer>) => {
        state.customers.push(action.payload);
      })

      // Handle updateCustomer
      .addCase(updateCustomer.fulfilled, (state, action: PayloadAction<Customer>) => {
        const index = state.customers.findIndex(customer => customer.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
      })

      // Handle deleteCustomer
      .addCase(deleteCustomer.fulfilled, (state, action: PayloadAction<number>) => {
        state.customers = state.customers.filter(customer => customer.id !== action.payload);
        state.error = null; // Clear any previous errors
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.status = 'failed';
        // Extract the error message from the action
        let errorMessage = action.error.message || 'Failed to delete customer';

        // If the error is from axios and has a response with data
        if (action.error.name === 'AxiosError' && action.error.message) {
          // Check if the error is related to associated projects
          if (action.error.message.includes('associated projects')) {
            errorMessage = 'Cannot delete this customer because it has associated projects. Please delete the projects first or assign them to another customer.';
          }
        }

        state.error = errorMessage;
      });
  }
});

export default customersSlice.reducer;
