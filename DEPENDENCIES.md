# Project Dependencies Tracker

This document tracks dependencies between components, modules, and files in the project. It helps understand the impact of changes and maintain a clear picture of the application architecture.

## Table of Contents
- [Component Dependencies](#component-dependencies)
- [Module Dependencies](#module-dependencies)
- [Data Flow](#data-flow)
- [API Dependencies](#api-dependencies)

## Component Dependencies

### TaskList Component
- **File**: `src/pages/TaskList.tsx`
- **Depends on**:
  - `src/types/index.ts` - For Task, TaskStatus, and TaskPriority types
  - `src/store/tasksSlice.ts` - For Redux actions and state
  - `src/components/animations/GlitchTitle.tsx` - For UI elements
  - `src/components/animations/ScrambleHover.tsx` - For UI elements
- **Used by**:
  - `src/App.tsx` - As a route component

### SimpleKanbanBoard Component
- **File**: `src/pages/SimpleKanbanBoard.tsx`
- **Depends on**:
  - `src/types/index.ts` - For Task and TaskStatus types
  - `src/store/tasksSlice.ts` - For Redux actions and state
  - `react-beautiful-dnd` - For drag and drop functionality
- **Used by**:
  - `src/App.tsx` - As a route component

## Module Dependencies

### Redux Store
- **File**: `src/store/index.ts`
- **Depends on**:
  - `src/store/tasksSlice.ts`
  - `src/store/projectsSlice.ts`
  - `src/store/authSlice.ts`
- **Used by**:
  - All components that need state management

### API Service
- **File**: `src/services/api.ts`
- **Depends on**:
  - `axios` - For HTTP requests
  - `src/config/index.ts` - For API configuration
- **Used by**:
  - All Redux slices for data fetching

## Data Flow

### Task Creation Flow
1. User submits task form in `TaskForm.tsx`
2. Form data is dispatched to Redux store via `tasksSlice.ts`
3. API service makes POST request to backend
4. Backend validates and stores data in database
5. Response updates Redux store
6. UI components re-render with new data

### Project Status Update Flow
1. User changes project status in `ProjectDetails.tsx`
2. Change is dispatched to Redux store via `projectsSlice.ts`
3. API service makes PUT request to backend
4. Backend updates database
5. WebSocket broadcasts change to all connected clients
6. UI components update to reflect new status

## API Dependencies

### Tasks API
- **Endpoints**:
  - `GET /api/tasks` - Fetch all tasks
  - `GET /api/tasks/:id` - Fetch single task
  - `POST /api/tasks` - Create new task
  - `PUT /api/tasks/:id` - Update task
  - `DELETE /api/tasks/:id` - Delete task
- **Used by**:
  - `src/store/tasksSlice.ts`
  - `src/pages/TaskList.tsx`
  - `src/pages/SimpleKanbanBoard.tsx`

### Projects API
- **Endpoints**:
  - `GET /api/projects` - Fetch all projects
  - `GET /api/projects/:id` - Fetch single project
  - `POST /api/projects` - Create new project
  - `PUT /api/projects/:id` - Update project
  - `DELETE /api/projects/:id` - Delete project
- **Used by**:
  - `src/store/projectsSlice.ts`
  - `src/pages/ProjectList.tsx`
  - `src/pages/ProjectDetails.tsx`

---

## How to Use This Document

1. **Adding Dependencies**: When creating or modifying components, update this document to reflect dependencies.
2. **Impact Analysis**: Before making changes, check this document to understand what components might be affected.
3. **Refactoring**: Use this document to identify opportunities for better code organization and reduced coupling.

This document should be updated whenever significant changes are made to the application architecture. 