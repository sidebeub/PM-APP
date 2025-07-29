import React, { useEffect, useState } from 'react';
import './KanbanBoard.css';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../store';
import { fetchTasks, updateTask, fetchTaskDependencies, deleteTask } from '../store/tasksSlice';
import { fetchProjects } from '../store/projectsSlice';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Avatar,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Divider,
  IconButton,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Task, TaskStatus, TaskPriority, TaskStatusType, TaskPriorityType, Project } from '../types';
import TaskEditDialog from '../components/TaskEditDialog';
import GlitchTitle from '../components/animations/GlitchTitle';

interface SimpleKanbanBoardProps {
  selectedProject?: number | null;
}

const SimpleKanbanBoard: React.FC<SimpleKanbanBoardProps> = ({ selectedProject }) => {
  const dispatch = useAppDispatch();
  const { tasks, loading: tasksLoading } = useSelector((state: RootState) => state.tasks);
  const { projects, loading: projectsLoading } = useSelector((state: RootState) => state.projects);
  const dependencies = useSelector((state: RootState) => state.tasks.dependencies);

  // State for project filter
  const [selectedProjectState, setSelectedProjectState] = useState<number | null>(selectedProject || null);

  // State for task menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // State for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);

  // State for snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // State for drag and drop
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // State to track the last updated task to prevent loops
  const [lastUpdatedTask, setLastUpdatedTask] = useState<number | null>(null);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, task: Task) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTask(task);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle edit task
  const handleEditTask = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  // Get status color
  const getStatusColor = (status: TaskStatusType) => {
    // Convert string status to enum if needed
    const statusEnum = typeof status === 'string' 
      ? Object.values(TaskStatus).find(enumStatus => enumStatus === status) || TaskStatus.Pending
      : status;

    switch(statusEnum) {
      case TaskStatus.Pending:
        return '#ffc107'; // Amber
      case TaskStatus.InProgress:
        return '#2196f3'; // Blue
      case TaskStatus.Completed:
        return '#4caf50'; // Green
      case TaskStatus.Blocked:
        return '#f44336'; // Red
      case TaskStatus.Delayed:
        return '#ff9800'; // Orange
      default:
        return '#9e9e9e'; // Grey
    }
  };

  // Status colors for the legend
  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.Pending]: '#E2E8F0',
    [TaskStatus.InProgress]: '#BEE3F8',
    [TaskStatus.Completed]: '#C6F6D5',
    [TaskStatus.Blocked]: '#FED7D7',
    [TaskStatus.Delayed]: '#FED7D7'
  };

  // Fetch tasks and projects on component mount
  useEffect(() => {
    // Only fetch projects once
    if (projects.length === 0) {
      dispatch(fetchProjects());
    }

    const fetchData = async () => {
      try {
        // Fetch tasks
        const tasksResult = await dispatch(fetchTasks()).unwrap();

        // Fetch dependencies for each task
        const dependenciesPromises = tasksResult.map((task: Task) =>
          dispatch(fetchTaskDependencies(task.id))
        );
        await Promise.all(dependenciesPromises);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    void fetchData();

    // Set up an interval to clear the lastUpdatedTask after 5 seconds
    // This prevents the loop but still allows updates after a reasonable time
    const interval = setInterval(() => {
      if (lastUpdatedTask) {
        setLastUpdatedTask(null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dispatch, projects.length, lastUpdatedTask]);

  const handleProjectChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedProjectState(value === '' ? null : parseInt(value));
  };

  const loading = tasksLoading || projectsLoading;

  // Filter tasks based on selected project
  const filteredTasks = selectedProjectState === null || selectedProjectState === undefined
    ? tasks
    : tasks.filter(task => task.project_id === selectedProjectState);

  // Group tasks by status
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    [TaskStatus.Pending]: filteredTasks.filter(task => task.status === TaskStatus.Pending),
    [TaskStatus.InProgress]: filteredTasks.filter(task => task.status === TaskStatus.InProgress),
    [TaskStatus.Completed]: filteredTasks.filter(task => task.status === TaskStatus.Completed),
    [TaskStatus.Blocked]: filteredTasks.filter(task => task.status === TaskStatus.Blocked),
    [TaskStatus.Delayed]: filteredTasks.filter(task => task.status === TaskStatus.Delayed)
  };

  // Get project by ID
  const getProjectById = (id: number): Project | undefined => {
    return projects.find(project => project.id === id);
  };

  // Get priority color
  const getPriorityColor = (priority: TaskPriorityType) => {
    // Convert string priority to enum if needed
    const priorityEnum = typeof priority === 'string'
      ? Object.values(TaskPriority).find(enumPriority => enumPriority === priority) || TaskPriority.Medium
      : priority;

    switch(priorityEnum) {
      case TaskPriority.Low:
        return '#4caf50'; // Green
      case TaskPriority.Medium:
        return '#ff9800'; // Orange
      case TaskPriority.High:
        return '#f44336'; // Red
      case TaskPriority.Critical:
        return '#9c27b0'; // Purple
      default:
        return '#9e9e9e'; // Grey
    }
  };

  // Handle closing the edit dialog
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedTask(null);
  };

  // Handle updating task status
  const handleUpdateTaskStatus = (task: Task, newStatus: TaskStatus) => {
    // Prevent duplicate updates
    if (lastUpdatedTask && lastUpdatedTask === task.id && task.status === newStatus) {
      console.log('Preventing duplicate update for task:', task.id);
      return;
    }

    // Update the last updated task
    setLastUpdatedTask(task.id);

    dispatch(updateTask({
      id: task.id,
      task: {
        status: newStatus
      }
    }))
    .then(() => {
      setSnackbar({
        open: true,
        message: `Task "${task.title}" moved to ${newStatus}`,
        severity: 'success',
      });
    })
    .catch((error) => {
      console.error('Error updating task:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update task status. Please try again.',
        severity: 'error',
      });
    });
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  // Handle deleting a task
  const handleDeleteTask = async (task: Task | null) => {
    if (!task) return;

    try {
      await dispatch(deleteTask(task.id)).unwrap();
      setSnackbar({
        open: true,
        message: `Task "${task.title}" deleted successfully`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete task. Please try again.',
        severity: 'error',
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('Drag ended');
    setDraggedTask(null);
    setDragOverColumn(null);
    e.currentTarget.classList.remove('is-dragging');
    document.body.classList.remove('dragging-active');
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    if (!isNaN(taskId)) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.id !== lastUpdatedTask) {
        setLastUpdatedTask(task.id);
        dispatch(updateTask({ id: task.id, task: { ...task, status: newStatus } }));
      }
    }
    setDragOverColumn(null);
  };

  // Render task card
  const renderTaskCard = (task: Task) => {
    const project = getProjectById(task.project_id);
    const taskDependencies = dependencies[task.id] || [];
    const isDragging = draggedTask?.id === task.id;

    return (
      <div
        key={`task-${task.id}`}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        className={`draggable-item ${isDragging ? 'is-dragging' : ''}`}
        style={{ cursor: 'grab' }}
      >
        <Card className="task-card task-card-transition" sx={{
            mb: 2,
            boxShadow: isDragging ? 4 : 2,
            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            bgcolor: isDragging ? 'rgba(255, 255, 255, 0.9)' : 'background.paper',
            border: isDragging ? '1px solid #2196f3' : 'none',
            zIndex: isDragging ? 9999 : 'auto',
          }}>
          <CardHeader
            avatar={
              <Tooltip title="Drag to change status">
                <div className="drag-handle-container" style={{ cursor: 'grab' }}>
                  <DragIndicatorIcon
                    className="drag-handle"
                    fontSize="medium"
                    sx={{
                      animation: isDragging ? 'none' : 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 0.6 },
                        '50%': { opacity: 1 },
                        '100%': { opacity: 0.6 }
                      },
                      color: '#2196f3',
                      '&:hover': {
                        transform: 'scale(1.2)',
                        color: '#1976d2'
                      }
                    }}
                  />
                </div>
              </Tooltip>
            }
            title={
              <Typography variant="subtitle2" noWrap title={task.title}>
                {task.title}
              </Typography>
            }
            subheader={
              <Typography variant="caption" color="text.secondary" noWrap>
                {project?.project_number || 'No Project'} - {formatDate(task.due_date)}
              </Typography>
            }
            action={
              <IconButton
                aria-label="task menu"
                onClick={(e) => handleMenuOpen(e, task)}
                size="small"
              >
                <MoreVertIcon />
              </IconButton>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            <Box sx={{ mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={task.progress || 0}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(0, 0, 0, 0.08)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getStatusColor(task.status),
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Progress: {task.progress || 0}%
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Chip
                label={task.priority}
                size="small"
                sx={{
                  bgcolor: getPriorityColor(task.priority),
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
              {taskDependencies.length > 0 && (
                <Tooltip title="Has dependencies">
                  <Chip
                    label={`${taskDependencies.length} dep${taskDependencies.length > 1 ? 's' : ''}`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Tooltip>
              )}
            </Box>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div>
      <GlitchTitle
        text="Simple Kanban Board"
        variant="h4"
        glitchInterval={6000}
        glitchDuration={300}
        intensity={6}
        gutterBottom
      />

      {/* Task Edit Dialog */}
      <TaskEditDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        task={selectedTask}
      />

      {/* Task Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()} // Prevent drag start
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEditTask}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleDeleteTask(selectedTask);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="project-select-label">Project</InputLabel>
            <Select
              labelId="project-select-label"
              value={selectedProjectState ? selectedProjectState.toString() : ''}
              label="Project"
              onChange={handleProjectChange}
            >
              <MenuItem value="">All Projects</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id.toString()}>
                  {project.project_number} - {project.customer_name || 'N/A'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'info.light', p: 1, borderRadius: 1 }}>
            <DragIndicatorIcon sx={{ mr: 1, color: 'info.dark' }} />
            <Typography variant="body2" color="info.dark">
              <strong>Tip:</strong> Drag tasks between columns to update their status
            </Typography>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <LinearProgress />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, p: 2, overflowX: 'auto' }}>
          {(Object.values(TaskStatus) as TaskStatus[]).map((status) => (
            <Paper
              key={status}
              sx={{
                minWidth: 300,
                maxWidth: 300,
                height: 'fit-content',
                maxHeight: 'calc(100vh - 200px)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(status),
                      mr: 1,
                    }}
                  />
                  <Typography variant="subtitle1">{status}</Typography>
                </Box>
                <Chip
                  label={tasksByStatus[status].length}
                  size="small"
                  color="default"
                />
              </Box>
              <Box
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                sx={{
                  p: 2,
                  overflowY: 'auto',
                  flexGrow: 1,
                  backgroundColor: dragOverColumn === status ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                  borderRadius: '4px',
                  border: dragOverColumn === status ? '2px dashed rgba(0, 0, 0, 0.2)' : '2px dashed transparent',
                  transition: 'background-color 0.2s ease',
                  minHeight: '100px'
                }}
              >
                {tasksByStatus[status].map((task) => renderTaskCard(task))}
                {tasksByStatus[status].length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center">
                    No tasks
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </div>
  );
};

export default SimpleKanbanBoard;
