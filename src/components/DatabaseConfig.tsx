// DatabaseConfig v2.2 - Security enhanced version - Build: 2025-08-08-16:50
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Storage as DatabaseIcon,
} from '@mui/icons-material';

interface DatabaseConfigProps {
  open: boolean;
  onClose: () => void;
  onConfigured: () => void;
}

interface DatabaseCredentials {
  username: string;
  password: string;
}

const DatabaseConfig: React.FC<DatabaseConfigProps> = ({ open, onClose, onConfigured }) => {
  const [credentials, setCredentials] = useState<DatabaseCredentials>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof DatabaseCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Test the database connection
      const response = await fetch('/api/advapi/system/test-db-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        setTimeout(() => {
          onConfigured();
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Failed to connect to database');
      }
    } catch (error) {
      console.error('Database connection error:', error);
      setError('Failed to test database connection');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCredentials({ username: '', password: '' });
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DatabaseIcon color="primary" />
          <Typography variant="h6">
            Database Configuration
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          To display KBOM data (Customer, Work Orders, Sales Orders) with your 3D models, 
          please provide your database credentials. These credentials are used only for this session 
          and are not stored permanently.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Database connection successful! KBOM data will now be available.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Database Username"
            value={credentials.username}
            onChange={handleChange('username')}
            fullWidth
            disabled={loading || success}
            autoComplete="username"
            placeholder="Enter your database username"
          />

          <TextField
            label="Database Password"
            type={showPassword ? 'text' : 'password'}
            value={credentials.password}
            onChange={handleChange('password')}
            fullWidth
            disabled={loading || success}
            autoComplete="current-password"
            placeholder="Enter your database password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || success}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            🔒 <strong>Secure Connection:</strong> Credentials are encrypted and used only for this session.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success || !credentials.username || !credentials.password}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Testing Connection...' : success ? 'Connected!' : 'Connect to Database'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatabaseConfig;
