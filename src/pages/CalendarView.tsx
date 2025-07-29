import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../store';
import { fetchTasks, createTask, updateTask, deleteTask } from '../store/tasksSlice';
import { fetchProjects } from '../store/projectsSlice';
import TaskModalForm from '../components/forms/TaskModalForm';
import {
  Box,
  Typography,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  LinearProgress,
  Tooltip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fab,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TodayIcon from '@mui/icons-material/Today';
import AddIcon from '@mui/icons-material/Add';
import { Task, TaskStatus, TaskStatusType } from '../types';

interface ModalState {
  open: boolean;
  task: Task | null;
  mode: 'create' | 'edit';
}

const CalendarView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading: tasksLoading } = useSelector((state: RootState) => state.tasks);
  const { projects, loading: projectsLoading } = useSelector((state: RootState) => state.projects);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week'>('month');
  const [dateFilterType, setDateFilterType] = useState<'due' | 'start' | 'range'>('range');
  
  // Modal states
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    task: null,
    mode: 'create'
  });
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchProjects());
  }, [dispatch]);
  
  // Modal handlers
  const handleOpenCreateModal = () => {
    setModalState({
      open: true,
      task: null,
      mode: 'create'
    });
  };
  
  const handleOpenEditModal = (task: Task) => {
    setModalState({
      open: true,
      task,
      mode: 'edit'
    });
  };
  
  const handleCloseModal = () => {
    setModalState(prev => ({
      ...prev,
      open: false
    }));
  };
  
  const handleSaveTask = (taskData: Partial<Task>) => {
    if (modalState.mode === 'create') {
      dispatch(createTask(taskData));
    } else {
      if (modalState.task) {
        dispatch(updateTask({ id: modalState.task.id, task: taskData }));
      }
    }
  };
  
  // Delete handler for the delete dialog
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };
  
  const handleConfirmDelete = () => {
    if (taskToDelete) {
      dispatch(deleteTask(taskToDelete.id));
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleProjectChange = (event: SelectChangeEvent) => {
    setSelectedProject(event.target.value);
  };

  const handleViewChange = (event: SelectChangeEvent) => {
    setCurrentView(event.target.value as 'month' | 'week');
  };
  
  const handleDateFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'due' | 'start' | 'range',
  ) => {
    if (newFilter !== null) {
      setDateFilterType(newFilter);
    }
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const loading = tasksLoading || projectsLoading;

  // Filter tasks based on selected project
  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter(task => task.project_id.toString() === selectedProject);


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


  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => {
      const startDate = task.start_date ? new Date(task.start_date) : null;
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      
      // If neither date exists, skip this task
      if (!startDate && !dueDate) return false;
      
      // Filter based on the selected date filter type
      switch (dateFilterType) {
        case 'due':
          // Show only on due date
          return dueDate && isSameDay(dueDate, date);
          
        case 'start':
          // Show only on start date
          return startDate && isSameDay(startDate, date);
          
        case 'range':
        default:
          // Show if date falls within the task's date range
          if (startDate && dueDate) {
            // Set time to midnight for accurate day comparison
            const dateTime = new Date(date);
            dateTime.setHours(0, 0, 0, 0);
            
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            
            const dueDateTime = new Date(dueDate);
            dueDateTime.setHours(0, 0, 0, 0);
            
            return dateTime >= startDateTime && dateTime <= dueDateTime;
          } else if (startDate) {
            // If only start date exists, show on that day
            return isSameDay(startDate, date);
          } else if (dueDate) {
            // If only due date exists, show on that day
            return isSameDay(dueDate, date);
          }
          return false;
      }
    });
  };
  
  // Get task display type for styling
  const getTaskDisplayType = (task: Task, date: Date) => {
    const startDate = task.start_date ? new Date(task.start_date) : null;
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    
    if (startDate && dueDate) {
      if (isSameDay(startDate, date) && isSameDay(dueDate, date)) {
        return 'single-day'; // Task starts and ends on this day
      } else if (isSameDay(startDate, date)) {
        return 'start-day'; // Task starts on this day
      } else if (isSameDay(dueDate, date)) {
        return 'end-day'; // Task ends on this day
      } else {
        return 'middle-day'; // Task spans through this day
      }
    } else if (startDate && isSameDay(startDate, date)) {
      return 'start-only'; // Task only has start date
    } else if (dueDate && isSameDay(dueDate, date)) {
      return 'due-only'; // Task only has due date
    }
    
    return 'middle-day'; // Default
  };

  // Render month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    // Create array of day numbers (1-31)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Create array of blank spaces for days before the first day of the month
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
    
    // Combine blanks and days
    const calendarDays = [...blanks, ...days];
    
    // Split into weeks
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    
    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <Box key={index}>
              <Typography variant="subtitle2" align="center" sx={{ fontWeight: 'bold' }}>
                {day}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {weeks.map((week, weekIndex) => (
          <Box 
            key={weekIndex} 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gap: 1, 
              mt: 1 
            }}
          >
            {week.map((day, dayIndex) => {
              if (day === null) {
                return (
                  <Box key={dayIndex}>
                    <Paper
                      sx={{
                        height: 120,
                        bgcolor: '#f5f5f5',
                        p: 1,
                      }}
                    />
                  </Box>
                );
              }
              
              const date = new Date(year, month, day);
              const tasksForDay = getTasksForDate(date);
              const isToday = 
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year;
              
              return (
                <Box key={dayIndex}>
                  <Paper
                    sx={{
                      height: 120,
                      p: 1,
                      overflow: 'auto',
                      position: 'relative',
                      border: isToday ? '2px solid #2196f3' : 'none',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday ? 'bold' : 'normal',
                        color: isToday ? '#2196f3' : 'inherit',
                      }}
                    >
                      {day}
                    </Typography>
                    
                    {tasksForDay.slice(0, 3).map((task) => {
                      const displayType = getTaskDisplayType(task, date);
                      
                      return (
                        <Tooltip
                          key={task.id}
                          title={
                            <>
                              <Typography variant="body2">{task.title}</Typography>
                              <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                                Project: {projects.find(p => p.id === task.project_id)?.project_number || 'N/A'}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Customer: {projects.find(p => p.id === task.project_id)?.customer_name || 'N/A'}
                              </Typography>
                              <Typography variant="caption">
                                Status: {task.status}
                              </Typography>
                              <Typography variant="caption">
                                Priority: {task.priority}
                              </Typography>
                              {task.start_date && (
                                <Typography variant="caption" display="block">
                                  Start: {new Date(task.start_date).toLocaleDateString()}
                                </Typography>
                              )}
                              {task.due_date && (
                                <Typography variant="caption" display="block">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </Typography>
                              )}
                            </>
                          }
                        >
                      <Chip
                        label={task.title}
                        size="small"
                        onClick={() => handleOpenEditModal(task)}
                        sx={{
                          mt: 0.5,
                          backgroundColor: getStatusColor(task.status),
                          color: 'white',
                          width: '100%',
                          height: 'auto',
                          borderLeft: displayType === 'start-day' || displayType === 'start-only' ? '4px solid white' : 'none',
                          borderRight: displayType === 'end-day' || displayType === 'due-only' ? '4px solid white' : 'none',
                          borderRadius: displayType === 'middle-day' ? '2px' : '16px',
                          opacity: displayType === 'middle-day' ? 0.85 : 1,
                          '& .MuiChip-label': {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: '4px 0',
                          },
                          cursor: 'pointer',
                        }}
                      />
                        </Tooltip>
                      );
                    })}
                    
                    {tasksForDay.length > 3 && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                        +{tasksForDay.length - 3} more
                      </Typography>
                    )}
                  </Paper>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const day = currentDate.getDay();
    startOfWeek.setDate(currentDate.getDate() - day);
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
    
    const today = new Date();
    
    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weekDays.map((date, index) => {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = date.getDate();
            const isToday = 
              today.getDate() === date.getDate() &&
              today.getMonth() === date.getMonth() &&
              today.getFullYear() === date.getFullYear();
            
            return (
              <Box key={index}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 1,
                    borderBottom: '1px solid #e0e0e0',
                    color: isToday ? '#2196f3' : 'inherit',
                    fontWeight: isToday ? 'bold' : 'normal',
                  }}
                >
                  <Typography variant="subtitle2">{dayName}</Typography>
                  <Typography variant="h6">{dayNumber}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        
        <Box sx={{ mt: 2, height: 'calc(100vh - 300px)', overflow: 'auto' }}>
          {Array.from({ length: 24 }, (_, hour) => {
            return (
              <Box key={hour} sx={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <Box
                  sx={{
                    width: 50,
                    p: 1,
                    textAlign: 'right',
                    color: 'text.secondary',
                    borderRight: '1px solid #e0e0e0',
                  }}
                >
                  <Typography variant="caption">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexGrow: 1 }}>
                  {weekDays.map((date, dayIndex) => {
                    const tasksForDay = getTasksForDate(date);
                    
                    return (
                      <Box key={dayIndex} sx={{ borderRight: '1px solid #f0f0f0', minHeight: 60 }}>
                        {tasksForDay.map((task) => {
                          const displayType = getTaskDisplayType(task, date);
                          
                          return (
                            <Tooltip
                              key={task.id}
                              title={
                                <>
                                  <Typography variant="body2">{task.title}</Typography>
                                  <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                                    Project: {projects.find(p => p.id === task.project_id)?.project_number || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Customer: {projects.find(p => p.id === task.project_id)?.customer_name || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption">
                                    Status: {task.status}
                                  </Typography>
                                  <Typography variant="caption">
                                    Priority: {task.priority}
                                  </Typography>
                                  {task.start_date && (
                                    <Typography variant="caption" display="block">
                                      Start: {new Date(task.start_date).toLocaleDateString()}
                                    </Typography>
                                  )}
                                  {task.due_date && (
                                    <Typography variant="caption" display="block">
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </>
                              }
                            >
                              <Chip
                                label={task.title}
                                size="small"
                                onClick={() => handleOpenEditModal(task)}
                                sx={{
                                  m: 0.5,
                                  backgroundColor: getStatusColor(task.status),
                                  color: 'white',
                                  width: '100%',
                                  height: 'auto',
                                  borderLeft: displayType === 'start-day' || displayType === 'start-only' ? '4px solid white' : 'none',
                                  borderRight: displayType === 'end-day' || displayType === 'due-only' ? '4px solid white' : 'none',
                                  borderRadius: displayType === 'middle-day' ? '2px' : '16px',
                                  opacity: displayType === 'middle-day' ? 0.85 : 1,
                                  '& .MuiChip-label': {
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    padding: '4px 0',
                                  },
                                  cursor: 'pointer',
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <div>
      <Box sx={{ display: 'flex', flexDirection: 'column', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Calendar</Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
            sx={{ 
              display: 'block',
              fontWeight: 'bold',
              px: 3
            }}
          >
            ADD TASK
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="view-select-label">View</InputLabel>
            <Select
              labelId="view-select-label"
              value={currentView}
              label="View"
              onChange={handleViewChange}
              size="small"
            >
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="week">Week</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="project-select-label">Project</InputLabel>
            <Select
              labelId="project-select-label"
              value={selectedProject}
              label="Project"
              onChange={handleProjectChange}
              size="small"
            >
              <MenuItem value="all">All Projects</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id.toString()}>
                  {project.project_number} - {project.customer_name || 'N/A'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              View Tasks By:
            </Typography>
            <Box sx={{ border: '1px solid #1976d2', borderRadius: 1, bgcolor: 'background.paper' }}>
              <ToggleButtonGroup
                value={dateFilterType}
                exclusive
                onChange={handleDateFilterChange}
                aria-label="date filter type"
                size="small"
                sx={{ height: '36px' }}
              >
                <ToggleButton value="due" aria-label="due dates only">
                  Due Dates
                </ToggleButton>
                <ToggleButton value="start" aria-label="start dates only">
                  Start Dates
                </ToggleButton>
                <ToggleButton value="range" aria-label="date range">
                  Date Range
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handlePrevious} size="small">
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            
            <Typography variant="h6">
              {currentView === 'month'
                ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : `Week of ${formatDate(new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay())))}`}
            </Typography>
            
            <IconButton onClick={handleNext} size="small">
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <IconButton onClick={handleToday} color="primary" title="Today">
            <TodayIcon />
          </IconButton>
        </Box>

        {loading ? (
          <LinearProgress />
        ) : (
          currentView === 'month' ? renderMonthView() : renderWeekView()
        )}
      </Paper>

      {/* Task Modal Form */}
      <TaskModalForm
        open={modalState.open}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        task={modalState.task || undefined}
        projects={projects}
        title={modalState.mode === 'create' ? 'Create New Task' : 'Edit Task'}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Delete"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the task "{taskToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={handleOpenCreateModal}
      >
        <AddIcon />
      </Fab>
    </div>
  );
};

export default CalendarView;
