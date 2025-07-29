import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Your Company',
    defaultDateFormat: 'MM/DD/YYYY',
    defaultTimeZone: 'America/Los_Angeles',
    enableNotifications: true
  });

  // Appearance settings state
  const [appearanceSettings, setAppearanceSettings] = useState({
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    darkMode: false,
    compactMode: false
  });

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle general settings change
  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: e.target.type === 'checkbox' ? checked : value
    });
  };

  // Handle appearance settings change
  const handleAppearanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setAppearanceSettings({
      ...appearanceSettings,
      [name]: e.target.type === 'checkbox' ? checked : value
    });
  };

  // Handle save settings
  const handleSaveSettings = () => {
    // In a real app, you would save these settings to the backend
    setSnackbar({
      open: true,
      message: 'Settings saved successfully!',
      severity: 'success'
    });
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ width: '100%', mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="General" {...a11yProps(0)} />
            <Tab label="Appearance" {...a11yProps(1)} />
            <Tab label="Notifications" {...a11yProps(2)} />
            <Tab label="Advanced" {...a11yProps(3)} />
          </Tabs>
        </Box>
        
        {/* General Settings */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            General Settings
          </Typography>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              fullWidth
              id="companyName"
              label="Company Name"
              name="companyName"
              value={generalSettings.companyName}
              onChange={handleGeneralChange}
            />
            <TextField
              margin="normal"
              fullWidth
              id="defaultDateFormat"
              label="Default Date Format"
              name="defaultDateFormat"
              value={generalSettings.defaultDateFormat}
              onChange={handleGeneralChange}
              helperText="e.g., MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD"
            />
            <TextField
              margin="normal"
              fullWidth
              id="defaultTimeZone"
              label="Default Time Zone"
              name="defaultTimeZone"
              value={generalSettings.defaultTimeZone}
              onChange={handleGeneralChange}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={generalSettings.enableNotifications}
                  onChange={handleGeneralChange}
                  name="enableNotifications"
                  color="primary"
                />
              }
              label="Enable Notifications"
            />
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" color="primary" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </Box>
          </Box>
        </TabPanel>
        
        {/* Appearance Settings */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Appearance Settings
          </Typography>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              fullWidth
              id="primaryColor"
              label="Primary Color"
              name="primaryColor"
              value={appearanceSettings.primaryColor}
              onChange={handleAppearanceChange}
              type="color"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="secondaryColor"
              label="Secondary Color"
              name="secondaryColor"
              value={appearanceSettings.secondaryColor}
              onChange={handleAppearanceChange}
              type="color"
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={appearanceSettings.darkMode}
                  onChange={handleAppearanceChange}
                  name="darkMode"
                  color="primary"
                />
              }
              label="Dark Mode"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={appearanceSettings.compactMode}
                  onChange={handleAppearanceChange}
                  name="compactMode"
                  color="primary"
                />
              }
              label="Compact Mode"
            />
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" color="primary" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </Box>
          </Box>
        </TabPanel>
        
        {/* Notifications Settings */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Notification Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Configure how and when you receive notifications about projects, tasks, and deadlines.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Email Notifications"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Receive email notifications for important updates
            </Typography>
            
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Task Assignments"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Get notified when you are assigned to a task
            </Typography>
            
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Task Due Date Reminders"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Receive reminders before task due dates
            </Typography>
            
            <FormControlLabel
              control={<Switch color="primary" />}
              label="Project Updates"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Get notified about general project updates
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" color="primary" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </Box>
          </Box>
        </TabPanel>
        
        {/* Advanced Settings */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Advanced Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            These settings are for advanced users and may affect system performance.
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Data Management
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Button variant="outlined" color="primary" sx={{ mr: 2 }}>
                Export All Data
              </Button>
              <Button variant="outlined" color="error">
                Clear Cache
              </Button>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              System Performance
            </Typography>
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Enable Background Sync"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Periodically sync data in the background
            </Typography>
            
            <FormControlLabel
              control={<Switch color="primary" />}
              label="Debug Mode"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Enable detailed logging for troubleshooting
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" color="primary" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </Box>
          </Box>
        </TabPanel>
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
