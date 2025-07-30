import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAppDispatch, RootState } from '../store';
import { fetchTasks, deleteTask, createTask, bulkUpdateTaskDates } from '../store/tasksSlice';
import GlitchTitle from '../components/animations/GlitchTitle';
import ScrambleHover from '../components/animations/ScrambleHover';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  LinearProgress,
  Button,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Checkbox,
  Toolbar,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { Task, TaskStatus, TaskPriority, TaskStatusType, TaskPriorityType } from '../types';
import BulkDateUpdateDialog from '../components/BulkDateUpdateDialog';

const TaskList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading } = useSelector((state: RootState) => state.tasks);
  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem('taskListPage');
    return savedPage ? parseInt(savedPage, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem('taskListRowsPerPage');
    return savedRowsPerPage ? parseInt(savedRowsPerPage, 10) : 10;
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('taskListSearchTerm') || '';
  });
  const [statusFilter, setStatusFilter] = useState<TaskStatusType>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityType>('');

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Bulk update state
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    localStorage.setItem('taskListPage', newPage.toString());
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    localStorage.setItem('taskListRowsPerPage', newRowsPerPage.toString());
    localStorage.setItem('taskListPage', '0');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setPage(0);
    localStorage.setItem('taskListSearchTerm', newSearchTerm);
    localStorage.setItem('taskListPage', '0');
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    const newStatusFilter = event.target.value as TaskStatusType;
    setStatusFilter(newStatusFilter);
    setPage(0);
    localStorage.setItem('taskListStatusFilter', newStatusFilter);
    localStorage.setItem('taskListPage', '0');
  };

  const handlePriorityFilterChange = (event: SelectChangeEvent) => {
    const newPriorityFilter = event.target.value as TaskPriorityType;
    setPriorityFilter(newPriorityFilter);
    setPage(0);
    localStorage.setItem('taskListPriorityFilter', newPriorityFilter);
    localStorage.setItem('taskListPage', '0');
  };

  // Filter tasks based on search term and filters
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = searchTerm === '' || (
      (task.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      ((task.project_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())) ||
      ((task.assignee_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
    );

    const matchesStatus = statusFilter === '' ? true : task.status === statusFilter;
    const matchesPriority = priorityFilter === '' ? true : task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  // Get priority color
  const getPriorityColor = (priority: TaskPriorityType) => {
    // Convert string priority to enum if needed
    const priorityEnum = typeof priority === 'string'
      ? Object.values(TaskPriority).find(enumPriority => enumPriority === priority) || TaskPriority.Medium
      : priority;

    switch(priorityEnum) {
      case TaskPriority.Low:
        return 'success';
      case TaskPriority.Medium:
        return 'info';
      case TaskPriority.High:
        return 'warning';
      case TaskPriority.Critical:
        return 'error';
      default:
        return 'default';
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Handle delete confirmation
  const handleOpenDeleteDialog = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      await dispatch(deleteTask(taskToDelete.id)).unwrap();
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete task');
    }
  };

  // Handle task duplication
  const handleDuplicateTask = async (task: Task) => {
    try {
      // Create a new task based on the original, but with a new title and reset some fields
      const duplicatedTaskData = {
        project_id: task.project_id,
        title: `${task.title} (Copy)`,
        description: task.description,
        assignee_id: task.assignee_id,
        status: 'Pending' as TaskStatusType, // Reset status to Pending
        priority: task.priority,
        department: task.department,
        start_date: task.start_date,
        due_date: task.due_date,
        progress: 0, // Reset progress to 0
        dependencies: [] // Reset dependencies
      };

      await dispatch(createTask(duplicatedTaskData)).unwrap();
    } catch (err: any) {
      console.error('Error duplicating task:', err);
      // You could add a toast notification here if you have one
    }
  };

  // Bulk operation handlers
  const handleSelectTask = (taskId: number) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id));
    }
  };

  const handleBulkDateUpdate = async (taskIds: number[], updates: { start_date?: string; due_date?: string }) => {
    await dispatch(bulkUpdateTaskDates({ taskIds, updates })).unwrap();
    setSelectedTasks([]);
  };

  const getSelectedTasksData = () => {
    return filteredTasks.filter(task => selectedTasks.includes(task.id));
  };

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <GlitchTitle
          text="Tasks"
          variant="h4"
          glitchInterval={4500}
          glitchDuration={300}
          intensity={8}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          component={Link}
          to="/tasks/new"
        >
          New Task
        </Button>
      </Box>

      {/* Task filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              sx={{ flexGrow: 1, minWidth: '250px' }}
              variant="outlined"
              placeholder="Search tasks by title, project, or assignee..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: '150px' }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={TaskStatus.Pending}>Pending</MenuItem>
                <MenuItem value={TaskStatus.InProgress}>In Progress</MenuItem>
                <MenuItem value={TaskStatus.Completed}>Completed</MenuItem>
                <MenuItem value={TaskStatus.Blocked}>Blocked</MenuItem>
                <MenuItem value={TaskStatus.Delayed}>Delayed</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: '150px' }}>
              <InputLabel id="priority-filter-label">Priority</InputLabel>
              <Select
                labelId="priority-filter-label"
                value={priorityFilter}
                label="Priority"
                onChange={handlePriorityFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={TaskPriority.Low}>Low</MenuItem>
                <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
                <MenuItem value={TaskPriority.High}>High</MenuItem>
                <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress variant="indeterminate" />
        </Box>
      ) : (
        <Paper>
          {/* Bulk Operations Toolbar */}
          {selectedTasks.length > 0 && (
            <Toolbar
              sx={{
                pl: { sm: 2 },
                pr: { xs: 1, sm: 1 },
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              }}
            >
              <Typography
                sx={{ flex: '1 1 100%' }}
                color="inherit"
                variant="subtitle1"
                component="div"
              >
                {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
              </Typography>
              <Tooltip title="Bulk Update Dates">
                <IconButton
                  onClick={() => setBulkUpdateDialogOpen(true)}
                  disabled={selectedTasks.length === 0}
                >
                  <DateRangeIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedTasks.length > 0 && selectedTasks.length < filteredTasks.length}
                      checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                      onChange={handleSelectAll}
                      inputProps={{ 'aria-label': 'select all tasks' }}
                    />
                  </TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((task) => (
                    <TableRow key={task.id} selected={selectedTasks.includes(task.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => handleSelectTask(task.id)}
                          inputProps={{ 'aria-labelledby': `task-${task.id}` }}
                        />
                      </TableCell>
                      <TableCell component="th" scope="row" id={`task-${task.id}`}>
                        <ScrambleHover
                          text={task.title}
                          scrambleSpeed={40}
                          maxIterations={12}
                          className="task-title-scramble"
                        />
                      </TableCell>
                      <TableCell>{task.project_number || 'N/A'}</TableCell>
                      <TableCell>{task.customer_name || 'N/A'}</TableCell>
                      <TableCell>{task.assignee_name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Chip
                          label={task.status}
                          sx={{
                            backgroundColor: getStatusColor(task.status),
                            color: 'white',
                            '& .MuiChip-label': {
                              color: 'white'
                            }
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.priority}
                          color={getPriorityColor(task.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(task.due_date)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={task.progress ?? 0}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {`${task.progress ?? 0}%`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton
                            component={Link}
                            to={`/tasks/${task.id}`}
                            size="small"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            component={Link}
                            to={`/tasks/${task.id}/edit`}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicate">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleDuplicateTask(task)}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(task)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                {filteredTasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No tasks found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredTasks.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the task "{taskToDelete?.title}"? This action cannot be undone.
            {taskToDelete && tasks.some(t => t.dependencies?.includes(taskToDelete.id)) && (
              <Typography color="error" sx={{ mt: 2 }}>
                Warning: Other tasks depend on this task. Deleting it may affect those tasks.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Date Update Dialog */}
      <BulkDateUpdateDialog
        open={bulkUpdateDialogOpen}
        onClose={() => setBulkUpdateDialogOpen(false)}
        selectedTasks={getSelectedTasksData()}
        onUpdate={handleBulkDateUpdate}
      />
    </div>
  );
};

export default TaskList;
