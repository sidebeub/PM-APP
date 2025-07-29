/**
 * Type definitions for the Enhanced Project Management App
 */

// User roles for role-based permissions
export enum UserRole {
  ADMIN = 'admin',
  PROJECT_MANAGER = 'project_manager',
  TEAM_MEMBER = 'team_member',
  VIEWER = 'viewer'
}

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Customer interface
export interface Customer {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string; // URL to customer logo
  created_at: string;
  updated_at: string;
}

// Project status options
export enum ProjectStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  DELAYED = 'Delayed',
  BLOCKED = 'Blocked'
}

// Allow string values for ProjectStatus
export type ProjectStatusType = ProjectStatus | string;

// Project interface
export interface Project {
  id: number;
  project_number: string;
  name: string;
  customer_id: number;
  customer?: Customer; // Populated customer data
  status: ProjectStatusType;
  start_date?: string; // ISO string format
  expected_completion_date?: string; // ISO string format
  actual_completion_date?: string; // ISO string format
  shipping_date?: string; // ISO string format
  order_date?: string; // ISO string format
  total_budget?: number;
  progress: number; // Percentage of completion (0-100)
  notes?: string;
  project_manager_id?: number;
  project_manager?: User; // Populated project manager data
  project_type?: string;
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  customer_name?: string;
  customer_logo?: string;
}

// Task status options
export enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Delayed = 'Delayed',
  Blocked = 'Blocked'
}

// Allow string values for TaskStatus
export type TaskStatusType = TaskStatus | string;

// Task priority levels
export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

// Allow string values for TaskPriority
export type TaskPriorityType = TaskPriority | string;

// Task interface
export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  assignee_id?: number;
  assignee?: User; // Populated assignee data
  status: TaskStatusType;
  priority: TaskPriorityType;
  department?: string;
  start_date?: string; // ISO string format
  due_date?: string; // ISO string format
  completed_date?: string; // ISO string format
  progress: number; // Percentage of completion (0-100)
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  dependencies: number[];
  milestone_id?: number; // Optional milestone ID
  assignee_name?: string;
  assignee_department?: string;
  project_number?: string;
  customer_name?: string;
}

// Task dependency interface
export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  created_at: string;
  depends_on_task_title: string;
}

// Department milestone status
export enum MilestoneStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  DELAYED = 'Delayed'
}

// Department milestone interface
export interface DepartmentMilestone {
  id: number;
  project_id: number;
  department: string;
  milestone_name: string;
  planned_date?: string;
  actual_date?: string;
  status: MilestoneStatus;
  created_at: string;
  updated_at: string;
}

// View options for the application
export enum ViewType {
  PROJECT_LIST = 'project_list',
  GANTT_CHART = 'gantt_chart',
  CALENDAR = 'calendar',
  KANBAN_BOARD = 'kanban_board',
  TASK_LIST = 'task_list'
}

// Filter options for lists
export interface FilterOptions {
  status?: string[];
  priority?: string[];
  assignee?: number[];
  department?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}
