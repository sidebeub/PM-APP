import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: 3,
      }}
    >
      <Typography variant="h1" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h4" component="h2" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        color="primary"
        size="large"
      >
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default NotFound;
