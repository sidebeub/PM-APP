import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Project, Task as AppTask, DepartmentMilestone, TaskDependency } from '../types';
import { ViewSwitcher } from './ViewSwitcher';
import './ViewSwitcher.css';

// Enhanced interface for milestones with more properties
interface EnhancedMilestone extends DepartmentMilestone {
  type: 'deadline' | 'review' | 'delivery' | 'other';
}

// Enhanced Task interface for Gantt chart
interface GanttTask extends Task {
  project?: string;
  displayOrder: number;
}

interface GanttTaskReactChartProps {
  projects: Project[];
  tasks: AppTask[];
  milestones?: EnhancedMilestone[];
  dependencies?: TaskDependency[];
  onTaskClick?: (task: AppTask) => void;
  onMilestoneClick?: (milestone: EnhancedMilestone) => void;
  onTaskUpdate?: (task: AppTask) => void;
  readOnly?: boolean;
  viewMode?: ViewMode; // Add viewMode prop
}

const GanttTaskReactChart: React.FC<GanttTaskReactChartProps> = ({
  projects,
  tasks,
  milestones = [],
  dependencies = [],
  onTaskClick,
  onMilestoneClick,
  onTaskUpdate,
  readOnly = false,
  viewMode = ViewMode.Month, // Default to Month view
}) => {
  // Add state for expanded projects
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>(viewMode);
  const [isChecked, setIsChecked] = useState<boolean>(true);

  // Create a default date range
  const today = new Date();
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(today.getDate() - 30); // 30 days ago
  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(today.getDate() + 30); // 30 days from now

  // Map our task status to gantt-task-react progress color
  const mapStatusToProgressColor = (status: string): string => {
    switch(status) {
      case 'Completed':
        return '#4caf50'; // Green
      case 'In Progress':
        return '#2196f3'; // Blue
      case 'Pending':
        return '#ffc107'; // Amber
      case 'Delayed':
        return '#f44336'; // Red
      case 'Blocked':
        return '#9c27b0'; // Purple
      default:
        return '#9e9e9e'; // Grey
    }
  };

  // Map our task status to background color
  const mapStatusToBackgroundColor = (status: string): string => {
    switch(status) {
      case 'Completed':
        return '#81c784'; // Light Green
      case 'In Progress':
        return '#64b5f6'; // Light Blue
      case 'Pending':
        return '#ffd54f'; // Light Amber
      case 'Delayed':
        return '#e57373'; // Light Red
      case 'Blocked':
        return '#ba68c8'; // Light Purple
      default:
        return '#bdbdbd'; // Light Grey
    }
  };

  // Get color for project based on project ID
  const getProjectColor = (projectId: number): string => {
    // Array of rich, professional colors
    const colors = [
      '#1565c0', // deep blue
      '#2e7d32', // forest green
      '#6a1b9a', // deep purple
      '#c62828', // deep red
      '#0277bd', // ocean blue
      '#00695c', // teal
      '#4527a0', // indigo
      '#283593', // navy blue
      '#00838f', // dark cyan
      '#558b2f', // olive green
      '#ad1457', // magenta
      '#4e342e', // brown
      '#37474f', // blue gray
      '#5d4037', // brown
      '#00695c'  // teal
    ];

    // Use modulo to cycle through colors if there are more projects than colors
    return colors[projectId % colors.length];
  };

  // Handle project expand/collapse
  const handleProjectClick = useCallback((task: Task) => {
    if (task.type === 'project') {
      const projectId = task.id;
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        if (newSet.has(projectId)) {
          newSet.delete(projectId);
        } else {
          newSet.add(projectId);
        }
        return newSet;
      });
    }
  }, []);

  // Track if a resize/reschedule operation is in progress
  const [isResizing, setIsResizing] = useState(false);

  // Handle task click - only navigate if not resizing
  const handleTaskClick = useCallback((task: Task) => {
    // Skip navigation if we're in the middle of a resize/reschedule operation
    if (isResizing) {
      console.log('Ignoring click during resize/reschedule operation');
      return;
    }

    if (task.type === 'task') {
      // For tasks, we'll only navigate on double-click, not single click
      // This prevents accidental navigation when trying to resize/reschedule
      console.log('Single click on task - not navigating');

      // We still handle project clicks and milestone clicks on single click
    } else if (task.type === 'milestone') {
      const milestoneId = task.id.startsWith('milestone-') ? Number(task.id.replace('milestone-', '')) : -1;
      const milestone = milestones.find(m => m.id === milestoneId);
      if (milestone && onMilestoneClick) {
        onMilestoneClick(milestone as EnhancedMilestone);
      }
    } else if (task.type === 'project') {
      handleProjectClick(task);
    }
  }, [tasks, milestones, onTaskClick, onMilestoneClick, handleProjectClick, isResizing]);

  // Store the last task being updated to avoid duplicate updates
  const lastTaskRef = useRef<{ id: number, timestamp: number, task: AppTask | null }>({ id: -1, timestamp: 0, task: null });

  // Handle task update (e.g., when dragged)
  const handleTaskChange = useCallback((task: Task) => {
    console.log("On date change Id:" + task.id);

    // Set the resizing flag to prevent click navigation
    setIsResizing(true);

    if (task.type === 'task' && onTaskUpdate) {
      const taskId = task.id.startsWith('task-') ? Number(task.id.replace('task-', '')) : -1;
      const appTask = tasks.find(t => t.id === taskId);
      if (appTask) {
        // Only send the fields that actually changed
        const updatedTask: AppTask = {
          ...appTask,
          start_date: task.start.toISOString(),
          due_date: task.end.toISOString(),
          progress: Math.max(0, Math.min(100, Math.round(task.progress * 100))),
        };

        // Store the task for debounced update
        lastTaskRef.current = {
          id: taskId,
          timestamp: Date.now(),
          task: updatedTask
        };

        // Trigger the update effect
        setTaskUpdateTrigger(prev => prev + 1);

        // Reset the resizing flag after a short delay
        setTimeout(() => {
          setIsResizing(false);
        }, 500);
      }
    }
  }, [tasks, onTaskUpdate]);

  // Handle task progress change
  const handleProgressChange = useCallback((task: Task) => {
    console.log("On progress change Id:" + task.id);

    // Set the resizing flag to prevent click navigation
    setIsResizing(true);

    if (task.type === 'task' && onTaskUpdate) {
      const taskId = task.id.startsWith('task-') ? Number(task.id.replace('task-', '')) : -1;
      const appTask = tasks.find(t => t.id === taskId);
      if (appTask) {
        // Only send the progress field that changed
        const updatedTask: AppTask = {
          ...appTask,
          progress: Math.max(0, Math.min(100, Math.round(task.progress * 100))),
        };

        // Store the task for debounced update
        lastTaskRef.current = {
          id: taskId,
          timestamp: Date.now(),
          task: updatedTask
        };

        // Trigger the update effect
        setTaskUpdateTrigger(prev => prev + 1);

        // Reset the resizing flag after a short delay
        setTimeout(() => {
          setIsResizing(false);
        }, 500);
      }
    }
  }, [tasks, onTaskUpdate]);

  // Handle task selection
  const handleSelect = useCallback((task: Task, isSelected: boolean) => {
    console.log(`${task.name} has ${isSelected ? 'selected' : 'unselected'}`);
  }, []);

  // State to trigger the debounce effect
  const [taskUpdateTrigger, setTaskUpdateTrigger] = useState(0);

  // Update the task update trigger when a task is updated
  useEffect(() => {
    if (lastTaskRef.current.id !== -1 && lastTaskRef.current.task) {
      setTaskUpdateTrigger(prev => prev + 1);
    }
  }, []);

  // Effect to handle debounced task updates
  useEffect(() => {
    // Skip the initial render
    if (taskUpdateTrigger === 0) return;

    // Debounce time in milliseconds
    const DEBOUNCE_TIME = 500;

    let timeoutId: NodeJS.Timeout | null = null;

    const processUpdate = () => {
      const { id, task } = lastTaskRef.current;

      // Only process if we have a valid task
      if (id !== -1 && task) {
        console.log(`Sending debounced update for task ${id}`);
        onTaskUpdate?.(task);

        // Reset the lastTaskRef
        lastTaskRef.current = { id: -1, timestamp: 0, task: null };
      }
    };

    // Set up the debounce timer
    timeoutId = setTimeout(processUpdate, DEBOUNCE_TIME);

    // Clean up the timeout when the component unmounts or when the dependencies change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [taskUpdateTrigger, onTaskUpdate]);

  // Log when tasks change to help with debugging
  useEffect(() => {
    console.log('Tasks changed in GanttTaskReactChart:', tasks);
  }, [tasks]);

  // Handle task double click - this is the primary way to navigate to task details
  const handleDblClick = useCallback((task: Task) => {
    console.log("On Double Click event Id:" + task.id);

    // Reset the resizing flag in case it was set
    setIsResizing(false);

    if (task.type === 'task') {
      const taskId = task.id.startsWith('task-') ? Number(task.id.replace('task-', '')) : -1;
      const appTask = tasks.find(t => t.id === taskId);
      if (appTask && onTaskClick) {
        // Navigate to task details on double-click
        console.log('Double-click detected - navigating to task details');
        onTaskClick(appTask);
      }
    }
  }, [tasks, onTaskClick]);

  // Handle expander click
  const handleExpanderClick = useCallback((task: Task) => {
    console.log("On expander click Id:" + task.id);

    if (task.type === 'project') {
      handleProjectClick(task);
    }
  }, [handleProjectClick]);

  // Adjust column width based on view mode
  const getColumnWidth = useCallback(() => {
    switch (view) {
      case ViewMode.Day:
        return 65;
      case ViewMode.Week:
        return 250;
      case ViewMode.Month:
      default:
        return 300;
    }
  }, [view]);

  // Convert our data model to gantt-task-react format
  const ganttTasks = useMemo(() => {
    // Create a map to store task dependencies
    const dependencyMap = new Map<number, Set<number>>();

    // Process dependencies into the map
    dependencies.forEach(dep => {
      const taskId = dep.task_id;
      const dependsOnId = dep.depends_on_task_id;

      if (!dependencyMap.has(taskId)) {
        dependencyMap.set(taskId, new Set());
      }
      dependencyMap.get(taskId)?.add(dependsOnId);
    });

    // Process projects first
    const projectTasks = projects.map(project => {
      try {
        const startDate = project.start_date ? new Date(project.start_date) : defaultStartDate;
        const endDate = project.expected_completion_date ? new Date(project.expected_completion_date) : defaultEndDate;

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn(`Invalid dates for project ${project.id}:`, { startDate, endDate });
          return null;
        }

        return {
          id: `project-${project.id}`,
          name: project.customer_name ? `${project.customer_name} ${project.project_number || 'No Number'}` : `Customer ${project.project_number || 'No Number'}`,
          start: startDate,
          end: endDate,
          progress: project.progress || 0,
          type: 'project',
          isDisabled: true,
          hideChildren: !expandedProjects.has(`project-${project.id}`),
          dependencies: [],
          styles: {
            progressColor: '#4CAF50',
            progressSelectedColor: '#45a049',
            backgroundColor: getProjectColor(project.id)
          }
        } as Task;
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
        return null;
      }
    }).filter((task): task is NonNullable<typeof task> => task !== null);

    // Create a map to store tasks and milestones by project
    const tasksByProject = new Map<string, Task[]>();

    // Process tasks
    tasks.forEach(task => {
      try {
        const startDate = task.start_date ? new Date(task.start_date) : defaultStartDate;
        const endDate = task.due_date ? new Date(task.due_date) : defaultEndDate;

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn(`Invalid dates for task ${task.id}:`, { startDate, endDate });
          return;
        }

        const projectId = task.project_id ? `project-${task.project_id}` : undefined;

        // Get dependencies for this task from the dependency map
        const taskDependencies = Array.from(dependencyMap.get(task.id) || []);

        const taskItem = {
          id: `task-${task.id}`,
          name: task.title,
          start: startDate,
          end: endDate,
          progress: task.progress || 0,
          type: 'task',
          project: projectId,
          isDisabled: false,
          dependencies: taskDependencies.map(depId => `task-${depId}`),
          styles: {
            backgroundColor: mapStatusToBackgroundColor(task.status),
            progressColor: mapStatusToProgressColor(task.status),
            progressSelectedColor: mapStatusToProgressColor(task.status)
          }
        } as Task;

        if (projectId) {
          const projectItems = tasksByProject.get(projectId) || [];
          projectItems.push(taskItem);
          tasksByProject.set(projectId, projectItems);
        }
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
      }
    });

    // Process milestones and add them to their project's items
    milestones.forEach(milestone => {
      try {
        const date = milestone.planned_date ? new Date(milestone.planned_date) : defaultEndDate;

        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for milestone ${milestone.id}:`, { date });
          return;
        }

        const projectId = milestone.project_id ? `project-${milestone.project_id}` : undefined;

        if (projectId) {
          const milestoneItem = {
            id: `milestone-${milestone.id}`,
            name: milestone.milestone_name,
            start: date,
            end: date,
            progress: 100,
            type: 'milestone',
            project: projectId,
            isDisabled: true,
            dependencies: [],
            styles: {
              backgroundColor: '#FFC107',
              progressColor: '#FFA000',
              progressSelectedColor: '#FF8F00'
            }
          } as Task;

          const projectItems = tasksByProject.get(projectId) || [];
          projectItems.push(milestoneItem);
          tasksByProject.set(projectId, projectItems);
        }
      } catch (error) {
        console.error(`Error processing milestone ${milestone.id}:`, error);
      }
    });

    // Update project dates based on their tasks and milestones
    projectTasks.forEach(project => {
      const projectId = project.id;
      const projectItems = tasksByProject.get(projectId) || [];

      if (projectItems.length > 0) {
        const itemStartDates = projectItems.map(t => t.start.getTime());
        const itemEndDates = projectItems.map(t => t.end.getTime());

        project.start = new Date(Math.min(...itemStartDates));
        project.end = new Date(Math.max(...itemEndDates));
      }
    });

    // Combine all items in the correct order
    const allItems: Task[] = [];

    // Add projects and their items in order
    projectTasks.forEach(project => {
      // Add the project
      allItems.push(project);

      // Add its tasks and milestones if the project is expanded
      if (!project.hideChildren) {
        const projectItems = tasksByProject.get(project.id) || [];
        // Sort items by type (tasks first, then milestones) and then by start date
        const sortedItems = projectItems.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'task' ? -1 : 1;
          }
          return a.start.getTime() - b.start.getTime();
        });
        allItems.push(...sortedItems);
      }
    });

    return allItems;
  }, [projects, tasks, milestones, dependencies, expandedProjects, defaultStartDate, defaultEndDate, getProjectColor, mapStatusToBackgroundColor, mapStatusToProgressColor]);

  const lastUpdate = useRef<{ taskId: number; timestamp: number } | null>(null);

  const handleTaskUpdate = useCallback((task: GanttTask) => {
    // Skip if this is a duplicate update within the debounce window
    const now = Date.now();
    const taskId = parseInt(task.id.replace('task-', ''));

    // Set the resizing flag to prevent click navigation
    setIsResizing(true);

    if (lastUpdate.current &&
        lastUpdate.current.taskId === taskId &&
        now - lastUpdate.current.timestamp < 500) {
      return;
    }

    // Find the original task in the tasks array
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask || !onTaskUpdate) return;

    // Update only the changed properties
    const appTask: AppTask = {
      ...originalTask,
      start_date: task.start.toISOString(),
      due_date: task.end.toISOString(),
      progress: Math.max(0, Math.min(100, Math.round(task.progress * 100)))
    };

    // Store the task for debounced update
    lastTaskRef.current = {
      id: taskId,
      timestamp: now,
      task: appTask
    };

    // Trigger the update effect
    setTaskUpdateTrigger(prev => prev + 1);

    // Reset the resizing flag after a short delay
    setTimeout(() => {
      setIsResizing(false);
    }, 500);
  }, [onTaskUpdate, tasks]);

  // Clean up refs on unmount
  useEffect(() => {
    return () => {
      lastUpdate.current = null;
    };
  }, []);

  // Ensure we always have at least one task to prevent errors in the gantt-task-react library
  const safeGanttTasks = useMemo(() => {
    if (ganttTasks.length === 0) {
      // If there are no tasks, create a dummy task with the default date range
      // Use 'task' as the type and cast the entire object to Task to satisfy TypeScript
      return [{
        id: 'dummy-task',
        name: 'No tasks available',
        start: defaultStartDate,
        end: defaultEndDate,
        progress: 0,
        type: 'task' as const, // Use const assertion to make TypeScript happy
        isDisabled: true,
        dependencies: [],
        styles: {
          backgroundColor: '#f5f5f5',
          progressColor: '#e0e0e0',
          progressSelectedColor: '#e0e0e0'
        }
      } as Task]; // Cast the entire object to Task
    }
    return ganttTasks;
  }, [ganttTasks, defaultStartDate, defaultEndDate]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ViewSwitcher
        onViewModeChange={(viewMode) => setView(viewMode)}
        onViewListChange={setIsChecked}
        isChecked={isChecked}
      />
      <h3>Gantt Chart</h3>
      <Gantt
        tasks={safeGanttTasks}
        viewMode={view}
        onClick={() => {}} // Disable single-click navigation
        onDateChange={handleTaskChange}
        onProgressChange={handleProgressChange}
        onDoubleClick={handleDblClick} // Only navigate on double-click
        onSelect={handleSelect}
        onExpanderClick={handleExpanderClick}
        listCellWidth={isChecked ? "155px" : ""}
        columnWidth={getColumnWidth()}
        ganttHeight={400}
        barFill={75}
        barCornerRadius={4}
        projectBackgroundColor="#f0f0f0"
        arrowColor="#666"
        fontFamily="Arial, sans-serif"
        todayColor="rgba(252, 251, 227, 0.5)"
        viewDate={today}
        rtl={false}
        rowHeight={40}
        handleWidth={8}
        arrowIndent={20}
        TaskListHeader={({ headerHeight }) => (
          <div
            style={{
              height: headerHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
              borderBottom: "1px solid #e0e0e0",
              fontWeight: "bold",
              paddingLeft: 10
            }}
          >
            Name
          </div>
        )}
        TooltipContent={({ task }) => (
          <div style={{ padding: '12px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', borderRadius: '4px' }}>
            <b style={{ display: 'block', marginBottom: '8px' }}>{task.name}</b>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p>Start: {task.start.toLocaleDateString()}</p>
              <p>End: {task.end.toLocaleDateString()}</p>
              <p>Progress: {Math.round(task.progress * 100)}%</p>
              {task.type === 'task' && task.dependencies && task.dependencies.length > 0 && (
                <p>Dependencies: {task.dependencies.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
};

// Export the component without React.memo to ensure it re-renders when tasks change
export default GanttTaskReactChart;
