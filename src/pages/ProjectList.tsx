import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAppDispatch, RootState } from '../store';
import { fetchProjects, deleteProject } from '../store/projectsSlice';
import GlitchTitle from '../components/animations/GlitchTitle';
import Parallax from '../components/animations/Parallax';
import ElasticLine from '../components/animations/ElasticLine';
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
} from '@mui/material';
import FloatingNewProjectButton from '../components/FloatingNewProjectButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import { Project, ProjectStatus, ProjectStatusType } from '../types';

const ProjectList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects, loading } = useSelector((state: RootState) => state.projects);
  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem('projectListPage');
    return savedPage ? parseInt(savedPage, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem('projectListRowsPerPage');
    return savedRowsPerPage ? parseInt(savedRowsPerPage, 10) : 10;
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('projectListSearchTerm') || '';
  });

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    localStorage.setItem('projectListPage', newPage.toString());
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    localStorage.setItem('projectListRowsPerPage', newRowsPerPage.toString());
    localStorage.setItem('projectListPage', '0');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setPage(0);
    localStorage.setItem('projectListSearchTerm', newSearchTerm);
    localStorage.setItem('projectListPage', '0');
  };

  // Filter projects based on search term
  const filteredProjects = projects.filter((project) =>
    searchTerm === '' || (
      (project.project_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      ((project.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
    )
  );

  // Get status color
  const getStatusColor = (status: ProjectStatusType) => {
    switch(status) {
      case ProjectStatus.PENDING:
      case 'Pending':
        return 'warning';
      case ProjectStatus.IN_PROGRESS:
      case 'In Progress':
        return 'info';
      case ProjectStatus.COMPLETED:
      case 'Completed':
        return 'success';
      case ProjectStatus.DELAYED:
      case 'Delayed':
        return 'warning';
      case ProjectStatus.BLOCKED:
      case 'Blocked':
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

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <FloatingNewProjectButton />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <GlitchTitle
          text="Projects"
          variant="h4"
          glitchInterval={5000}
          glitchDuration={300}
          intensity={7}
        />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* NewProjectButton removed */}
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search projects by number or customer..."
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
        </CardContent>
      </Card>

      {/* Elastic Line divider */}
      <Box sx={{ height: 60, mb: 3, position: 'relative' }}>
        <ElasticLine
          color="#1976d2"
          thickness={3}
          tension={0.7}
          damping={0.3}
          points={20}
        />
      </Box>

      {loading ? (
        <LinearProgress />
      ) : (
        <Parallax speed={0.3} direction="vertical" reverse={false}>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Project Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Expected Completion</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProjects
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((project) => (
                      <TableRow key={project.id}>
                        <TableCell component="th" scope="row">
                          <ScrambleHover
                            text={project.project_number}
                            scrambleSpeed={30}
                            maxIterations={15}
                            className="project-number-scramble"
                          />
                        </TableCell>
                        <TableCell>{project.customer_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={project.status}
                            color={getStatusColor(project.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(project.start_date)}</TableCell>
                        <TableCell>{formatDate(project.expected_completion_date)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={project.progress ?? 0}
                                sx={{ height: 8, borderRadius: 5 }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                              <Typography variant="body2" color="text.secondary">
                                {`${project.progress ?? 0}%`}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View">
                            <IconButton
                              component={Link}
                              to={`/projects/${project.id}`}
                              size="small"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              component={Link}
                              to={`/projects/${project.id}/edit`}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete project ${project.project_number}?`)) {
                                  dispatch(deleteProject(project.id));
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No projects found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredProjects.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Parallax>
      )}
    </div>
  );
};

export default ProjectList;