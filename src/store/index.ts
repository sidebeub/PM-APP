import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import projectsReducer from './projectsSlice';
import tasksReducer from './tasksSlice';
import milestonesReducer from './milestonesSlice';
import usersReducer from './usersSlice';
import customersReducer from './customersSlice';
import authReducer from './authSlice';

// Create a placeholder reducer for slices we haven't implemented yet
const placeholderReducer = (state = {}, action: any) => state;

// UI slice for managing UI state (view mode, filters, etc.)
interface UIState {
  currentView: string;
  filters: Record<string, any>;
  sidebarOpen: boolean;
}

const initialUIState: UIState = {
  currentView: 'projects',
  filters: {},
  sidebarOpen: true
};

const uiReducer = (state = initialUIState, action: any) => {
  switch (action.type) {
    case 'ui/setCurrentView':
      return { ...state, currentView: action.payload };
    case 'ui/setFilters':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'ui/clearFilters':
      return { ...state, filters: {} };
    case 'ui/toggleSidebar':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    default:
      return state;
  }
};

// Create the store
const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
    users: usersReducer,
    customers: customersReducer,
    dependencies: placeholderReducer,
    milestones: milestonesReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Export types for dispatch and state
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks for using dispatch and selector with types
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export the store instance
export { store };
