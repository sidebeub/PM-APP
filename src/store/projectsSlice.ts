import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Project, ProjectStatus } from '../types';
import { projectService } from '../services/api';

// Define the state interface
interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null
};

// Async thunks for API calls
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      return await projectService.getAllProjects();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch projects');
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await projectService.getProjectById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch project');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (project: Partial<Project>, { rejectWithValue }) => {
    try {
      return await projectService.createProject(project);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create project');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, project }: { id: number; project: Partial<Project> }, { rejectWithValue }) => {
    try {
      return await projectService.updateProject(id, project);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update project');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (id: number, { rejectWithValue }) => {
    try {
      await projectService.deleteProject(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete project');
    }
  }
);

// Create the slice
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Add a project directly to the state (for WebSocket updates)
    addProject: (state, action: PayloadAction<Project>) => {
      // Check if project already exists
      const existingProjectIndex = state.projects.findIndex(p => p.id === action.payload.id);
      if (existingProjectIndex === -1) {
        state.projects.push(action.payload);
      }
    },
    // Remove a project directly from the state (for WebSocket updates)
    removeProject: (state, action: PayloadAction<number>) => {
      state.projects = state.projects.filter(p => p.id !== action.payload);
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch all projects
    builder.addCase(fetchProjects.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProjects.fulfilled, (state, action) => {
      state.loading = false;
      state.projects = action.payload;
    });
    builder.addCase(fetchProjects.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch project by ID
    builder.addCase(fetchProjectById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProjectById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentProject = action.payload;
    });
    builder.addCase(fetchProjectById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create project
    builder.addCase(createProject.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createProject.fulfilled, (state, action) => {
      state.loading = false;
      state.projects.push(action.payload);
      state.currentProject = action.payload;
    });
    builder.addCase(createProject.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update project
    builder.addCase(updateProject.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateProject.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      if (state.currentProject?.id === action.payload.id) {
        state.currentProject = action.payload;
      }
    });
    builder.addCase(updateProject.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Delete project
    builder.addCase(deleteProject.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteProject.fulfilled, (state, action) => {
      state.loading = false;
      state.projects = state.projects.filter(p => p.id !== action.payload);
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
      }
    });
    builder.addCase(deleteProject.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  }
});

// Export actions and reducer
export const { setCurrentProject, clearError, addProject, removeProject } = projectsSlice.actions;
export default projectsSlice.reducer;
