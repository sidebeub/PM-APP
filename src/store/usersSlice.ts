import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the User interface
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  department: string;
  created_at: string;
  updated_at: string;
}

// Define the state interface
interface UsersState {
  users: User[];
  departments: string[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Define the initial state
const initialState: UsersState = {
  users: [],
  departments: [],
  status: 'idle',
  error: null
};

// Async thunk for fetching users
export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get('http://localhost:3001/api/users', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
});

// Async thunk for fetching departments
export const fetchDepartments = createAsyncThunk('users/fetchDepartments', async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get('http://localhost:3001/api/users/departments', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
});

// Async thunk for creating a user
export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    const token = localStorage.getItem('token');
    const response = await axios.post('http://localhost:3001/api/users', userData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
);

// Async thunk for updating a user
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, userData }: { id: number; userData: Partial<User> }) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`http://localhost:3001/api/users/${id}`, userData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
);

// Async thunk for deleting a user
export const deleteUser = createAsyncThunk('users/deleteUser', async (id: number) => {
  const token = localStorage.getItem('token');
  await axios.delete(`http://localhost:3001/api/users/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return id;
});

// Create the users slice
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // Add any synchronous reducers here if needed
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.status = 'succeeded';
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch users';
      })

      // Handle fetchDepartments
      .addCase(fetchDepartments.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.departments = action.payload;
      })

      // Handle createUser
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.users.push(action.payload);
      })

      // Handle updateUser
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })

      // Handle deleteUser
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<number>) => {
        state.users = state.users.filter(user => user.id !== action.payload);
      });
  }
});

export default usersSlice.reducer;
