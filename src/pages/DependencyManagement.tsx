import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch, RootState } from '../store';
import { fetchTasks, fetchTaskById, fetchTaskDependencies } from '../store/tasksSlice';
import { Box, Typography, Paper, IconButton, Breadcrumbs, Link as MuiLink } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';
import DependencyForm from '../components/forms/DependencyForm';

const DependencyManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tasks, currentTask, loading } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    if (id) {
      const taskId = parseInt(id, 10);
      dispatch(fetchTasks());
      dispatch(fetchTaskById(taskId));
      dispatch(fetchTaskDependencies(taskId));
    }
  }, [dispatch, id]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!currentTask) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Task not found
        </Typography>
        <MuiLink
          component={Link}
          to="/tasks"
          sx={{ display: 'inline-block', mt: 2 }}
        >
          Back to Tasks
        </MuiLink>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton
          onClick={() => navigate(`/tasks/${id}`)}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Breadcrumbs aria-label="breadcrumb">
            <MuiLink component={Link} to="/tasks" underline="hover" color="inherit">
              Tasks
            </MuiLink>
            <MuiLink component={Link} to={`/tasks/${id}`} underline="hover" color="inherit">
              {currentTask.title}
            </MuiLink>
            <Typography color="text.primary">Dependencies</Typography>
          </Breadcrumbs>
          <Typography variant="h4" sx={{ mt: 1 }}>
            Manage Dependencies
          </Typography>
        </Box>
      </Box>

      <DependencyForm taskId={parseInt(id!, 10)} />
    </Box>
  );
};

export default DependencyManagement;
