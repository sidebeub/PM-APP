import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store';
import { fetchTasks, fetchTaskDependencies, updateTask } from '../actions/taskActions';
import { Task, TaskStatus, TaskDependency } from '../types';
import TaskEditDialog from './dialogs/TaskEditDialog';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DroppableProvided, DraggableProvided, DropResult } from 'react-beautiful-dnd';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const KanbanBoard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const projectId = useSelector((state: any) => state.project.id);
  const tasks = useSelector((state: any) => state.tasks.tasks);
  const taskDependencies = useSelector((state: any) => state.tasks.taskDependencies);
  const [columns, setColumns] = useState<Record<TaskStatus, Task[]>>({
    [TaskStatus.Pending]: [],
    [TaskStatus.InProgress]: [],
    [TaskStatus.Completed]: [],
    [TaskStatus.Blocked]: [],
    [TaskStatus.Delayed]: []
  });
  const [dependencies, setDependencies] = useState<Map<number, number[]>>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const columnTitles: Record<TaskStatus, string> = {
    [TaskStatus.Pending]: 'To Do',
    [TaskStatus.InProgress]: 'In Progress',
    [TaskStatus.Completed]: 'Completed',
    [TaskStatus.Blocked]: 'Blocked',
    [TaskStatus.Delayed]: 'Delayed'
  };

  useEffect(() => {
    if (projectId) {
      dispatch(fetchTasks(projectId));
      dispatch(fetchTaskDependencies(projectId));
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    if (tasks.length > 0) {
      const columns = {
        [TaskStatus.Pending]: tasks.filter((task: Task) => task.status === TaskStatus.Pending),
        [TaskStatus.InProgress]: tasks.filter((task: Task) => task.status === TaskStatus.InProgress),
        [TaskStatus.Completed]: tasks.filter((task: Task) => task.status === TaskStatus.Completed),
        [TaskStatus.Blocked]: tasks.filter((task: Task) => task.status === TaskStatus.Blocked),
        [TaskStatus.Delayed]: tasks.filter((task: Task) => task.status === TaskStatus.Delayed)
      };
      setColumns(columns);
    }
  }, [tasks]);

  useEffect(() => {
    if (taskDependencies.length > 0) {
      const dependencyMap = new Map<number, number[]>();
      taskDependencies.forEach((dep: TaskDependency) => {
        if (!dependencyMap.has(dep.task_id)) {
          dependencyMap.set(dep.task_id, []);
        }
        dependencyMap.get(dep.task_id)?.push(dep.depends_on_task_id);
      });
      setDependencies(dependencyMap);
    }
  }, [taskDependencies]);

  const getColumnTitle = (status: TaskStatus) => {
    return columnTitles[status] || status;
  };

  const handleDragEnd = (result: {
    destination?: { droppableId: string; index: number } | null;
    source: { droppableId: string; index: number };
    draggableId: string;
    type: string;
  }) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const taskId = parseInt(result.draggableId);
    const task = tasks.find((t: Task) => t.id === taskId);
    
    if (!task) return;

    // Only update if the status actually changed
    if (source.droppableId !== destination.droppableId) {
      const newStatus = destination.droppableId as TaskStatus;
      
      // Update the task status in the backend
      dispatch(updateTask(taskId.toString(), { status: newStatus }));
    }
    
    // Don't update local state - let the WebSocket handle the UI update
    // This prevents the infinite loop
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {Object.entries(columns).map(([columnId, columnTasks]) => (
            <Grid key={columnId} sx={{ width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                <Typography variant="h6" gutterBottom>
                  {getColumnTitle(columnId as TaskStatus)}
                </Typography>
                <Droppable droppableId={columnId}>
                  {(provided: any) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ minHeight: 100 }}
                    >
                      {columnTasks.map((task: Task, index: number) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id.toString()}
                          index={index}
                        >
                          {(provided: any) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{ mb: 1 }}
                            >
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Typography variant="subtitle1" gutterBottom>
                                    {task.title}
                                  </Typography>
                                  <Box>
                                    <Tooltip title="Edit Task">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditTask(task)}
                                      >
                                        <EditIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                                
                                {task.description && (
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {task.description}
                                  </Typography>
                                )}

                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                  <Chip
                                    label={task.priority}
                                    size="small"
                                    color={getPriorityColor(task.priority)}
                                  />
                                  {task.assignee_name && (
                                    <Chip
                                      label={`Assigned: ${task.assignee_name}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                  {dependencies?.get(task.id)?.map((depId) => (
                                    <Chip
                                      key={depId}
                                      label={`Depends on: ${tasks.find((t: Task) => t.id === depId)?.title || depId}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>

      {selectedTask && dependencies && (
        <TaskEditDialog
          task={selectedTask}
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          dependencies={dependencies}
          allTasks={tasks}
        />
      )}
    </Box>
  );
};

export default KanbanBoard; 