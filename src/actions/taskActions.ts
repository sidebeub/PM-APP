import { Task, TaskDependency } from '../types';
import api from '../services/api';

export const fetchTasks = (projectId: string) => async (dispatch: any) => {
  try {
    const response = await api.get(`/projects/${projectId}/tasks`);
    dispatch({ type: 'SET_TASKS', payload: response.data });
  } catch (error) {
    console.error('Error fetching tasks:', error);
  }
};

export const fetchTaskDependencies = (projectId: string) => async (dispatch: any) => {
  try {
    const response = await api.get(`/projects/${projectId}/task-dependencies`);
    dispatch({ type: 'SET_TASK_DEPENDENCIES', payload: response.data });
  } catch (error) {
    console.error('Error fetching task dependencies:', error);
  }
};

export const updateTask = (taskId: string, task: Partial<Task>) => async (dispatch: any) => {
  try {
    const response = await api.put(`/tasks/${taskId}`, task);
    dispatch({ type: 'UPDATE_TASK', payload: response.data });
  } catch (error) {
    console.error('Error updating task:', error);
  }
};

export const createTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => async (dispatch: any) => {
  try {
    const response = await api.post('/tasks', task);
    dispatch({ type: 'ADD_TASK', payload: response.data });
  } catch (error) {
    console.error('Error creating task:', error);
  }
};

export const deleteTask = (taskId: string) => async (dispatch: any) => {
  try {
    await api.delete(`/tasks/${taskId}`);
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}; 