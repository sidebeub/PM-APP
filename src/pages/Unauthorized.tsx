import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const Unauthorized: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
        p: 2
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          textAlign: 'center'
        }}
      >
        <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" paragraph>
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </Typography>
        <Button
          component={Link}
          to="/dashboard"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          Return to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default Unauthorized;
