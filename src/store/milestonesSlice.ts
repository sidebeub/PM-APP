import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DepartmentMilestone } from '../types';
import { milestoneService } from '../services/milestoneService';

// Define the state interface
interface MilestonesState {
  milestones: DepartmentMilestone[];
  currentMilestone: DepartmentMilestone | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: MilestonesState = {
  milestones: [],
  currentMilestone: null,
  loading: false,
  error: null
};

// Async thunks for API calls
export const fetchMilestones = createAsyncThunk(
  'milestones/fetchMilestones',
  async (_, { rejectWithValue }) => {
    try {
      return await milestoneService.getAllMilestones();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch milestones');
    }
  }
);

export const fetchMilestonesByProject = createAsyncThunk(
  'milestones/fetchMilestonesByProject',
  async (projectId: number, { rejectWithValue }) => {
    try {
      return await milestoneService.getMilestonesByProject(projectId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch milestones for project');
    }
  }
);

export const fetchMilestoneById = createAsyncThunk(
  'milestones/fetchMilestoneById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await milestoneService.getMilestoneById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch milestone');
    }
  }
);

export const createMilestone = createAsyncThunk(
  'milestones/createMilestone',
  async (milestone: Partial<DepartmentMilestone>, { rejectWithValue }) => {
    try {
      return await milestoneService.createMilestone(milestone);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create milestone');
    }
  }
);

export const updateMilestone = createAsyncThunk(
  'milestones/updateMilestone',
  async ({ id, milestone }: { id: number; milestone: Partial<DepartmentMilestone> }, { rejectWithValue }) => {
    try {
      return await milestoneService.updateMilestone(id, milestone);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update milestone');
    }
  }
);

export const deleteMilestone = createAsyncThunk(
  'milestones/deleteMilestone',
  async (id: number, { rejectWithValue }) => {
    try {
      await milestoneService.deleteMilestone(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete milestone');
    }
  }
);

// Create the slice
const milestonesSlice = createSlice({
  name: 'milestones',
  initialState,
  reducers: {
    setCurrentMilestone: (state, action: PayloadAction<DepartmentMilestone | null>) => {
      state.currentMilestone = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch all milestones
    builder.addCase(fetchMilestones.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMilestones.fulfilled, (state, action) => {
      state.loading = false;
      state.milestones = action.payload;
    });
    builder.addCase(fetchMilestones.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch milestones by project
    builder.addCase(fetchMilestonesByProject.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMilestonesByProject.fulfilled, (state, action) => {
      state.loading = false;
      state.milestones = action.payload;
    });
    builder.addCase(fetchMilestonesByProject.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch milestone by ID
    builder.addCase(fetchMilestoneById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMilestoneById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentMilestone = action.payload;
    });
    builder.addCase(fetchMilestoneById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create milestone
    builder.addCase(createMilestone.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createMilestone.fulfilled, (state, action) => {
      state.loading = false;
      state.milestones.push(action.payload);
      state.currentMilestone = action.payload;
    });
    builder.addCase(createMilestone.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update milestone
    builder.addCase(updateMilestone.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateMilestone.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.milestones.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.milestones[index] = action.payload;
      }
      if (state.currentMilestone?.id === action.payload.id) {
        state.currentMilestone = action.payload;
      }
    });
    builder.addCase(updateMilestone.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Delete milestone
    builder.addCase(deleteMilestone.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteMilestone.fulfilled, (state, action) => {
      state.loading = false;
      state.milestones = state.milestones.filter(m => m.id !== action.payload);
      if (state.currentMilestone?.id === action.payload) {
        state.currentMilestone = null;
      }
    });
    builder.addCase(deleteMilestone.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  }
});

// Export actions and reducer
export const { setCurrentMilestone, clearError } = milestonesSlice.actions;
export default milestonesSlice.reducer;
