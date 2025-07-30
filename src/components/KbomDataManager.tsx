import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import { kbomService } from '../services/kbomService';

interface KbomData {
  customer: string;
  project_name: string;
  tasks: string[];
}

const KbomDataManager: React.FC = () => {
  const [kbomData, setKbomData] = useState<KbomData[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportData, setSelectedImportData] = useState<KbomData | null>(null);
  const [importCustomerSoDialogOpen, setImportCustomerSoDialogOpen] = useState(false);
  const [selectedCustomerSoData, setSelectedCustomerSoData] = useState<KbomData | null>(null);

  // Load kbom data on component mount
  useEffect(() => {
    loadKbomData();
  }, []);

  const loadKbomData = async () => {
    setLoading(true);
    try {
      const data = await kbomService.getKbomDataGrouped();
      setKbomData(data);
      
      // Extract unique customers and projects
      const uniqueCustomers = Array.from(new Set(data.map((item: KbomData) => item.customer))) as string[];
      const uniqueProjects = Array.from(new Set(data.map((item: KbomData) => item.project_name))) as string[];
      
      setCustomers(uniqueCustomers);
      setProjects(uniqueProjects);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load kbom data' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportAll = async () => {
    setImporting(true);
    try {
      const result = await kbomService.importAllFromKbom();
      setMessage({ 
        type: 'success', 
        text: `Import completed! ${result.results.length} items processed.` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import all data' });
    } finally {
      setImporting(false);
    }
  };

  const handleImportSelected = async (data: KbomData) => {
    setImporting(true);
    try {
      const result = await kbomService.importFromKbom({
        customerName: data.customer,
        projectName: data.project_name,
        tasks: data.tasks
      });
      setMessage({
        type: 'success',
        text: `Imported ${result.tasksCreated} tasks for ${data.customer}/${data.project_name}`
      });
      setImportDialogOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import selected data' });
    } finally {
      setImporting(false);
    }
  };

  const handleImportCustomerAndSo = async (data: KbomData) => {
    setImporting(true);
    try {
      const result = await kbomService.importCustomerAndSoFromKbom({
        customerName: data.customer,
        projectName: data.project_name
      });
      setMessage({
        type: 'success',
        text: `Imported customer "${result.customer.name}" and project "${result.project.project_number}"`
      });
      setImportCustomerSoDialogOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import customer and SO' });
    } finally {
      setImporting(false);
    }
  };

  const filteredData = kbomData.filter(item => {
    const customerMatch = !selectedCustomer || item.customer === selectedCustomer;
    const projectMatch = !selectedProject || item.project_name === selectedProject;
    return customerMatch && projectMatch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        KBOM Data Manager
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Load and import data from the KBOM database. SO serves as project name, customer as customer, and source_file as tasks.
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Customer</InputLabel>
            <Select
              value={selectedCustomer}
              label="Filter by Customer"
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <MenuItem value="">All Customers</MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer} value={customer}>
                  {customer}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Project</InputLabel>
            <Select
              value={selectedProject}
              label="Filter by Project"
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <MenuItem value="">All Projects</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project} value={project}>
                  {project}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={handleImportAll}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {importing ? 'Importing...' : 'Import All Data'}
          </Button>
        </Box>
      </Paper>

      {/* Data Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            KBOM Data ({filteredData.length} items)
          </Typography>

          {filteredData.map((item, index) => (
            <Accordion key={`${item.customer}-${item.project_name}-${index}`}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {item.customer}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Project: {item.project_name}
                  </Typography>
                  <Chip
                    label={`${item.tasks.length} tasks`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="subtitle2">
                    Tasks:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setSelectedImportData(item);
                        setImportDialogOpen(true);
                      }}
                      disabled={importing}
                    >
                      Import with Tasks
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={() => {
                        setSelectedCustomerSoData(item);
                        setImportCustomerSoDialogOpen(true);
                      }}
                      disabled={importing}
                    >
                      Import Customer & SO Only
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {item.tasks.map((task, taskIndex) => (
                    <Chip
                      key={taskIndex}
                      label={task}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import KBOM Data</DialogTitle>
        <DialogContent>
          {selectedImportData && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Customer:</strong> {selectedImportData.customer}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Project:</strong> {selectedImportData.project_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Tasks to import:</strong> {selectedImportData.tasks.length}
              </Typography>
              <List dense>
                {selectedImportData.tasks.map((task, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={task} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedImportData && handleImportSelected(selectedImportData)}
            variant="contained"
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Customer & SO Only Dialog */}
      <Dialog open={importCustomerSoDialogOpen} onClose={() => setImportCustomerSoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Customer & SO Only</DialogTitle>
        <DialogContent>
          {selectedCustomerSoData && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Customer:</strong> {selectedCustomerSoData.customer}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>SO (Project):</strong> {selectedCustomerSoData.project_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This will create the customer and project without importing any tasks.
                You can add tasks manually later or import them separately.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportCustomerSoDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedCustomerSoData && handleImportCustomerAndSo(selectedCustomerSoData)}
            variant="contained"
            disabled={importing}
          >
            {importing ? <CircularProgress size={20} /> : 'Import Customer & SO'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KbomDataManager;