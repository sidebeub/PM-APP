import React from 'react';
import { Link } from 'react-router-dom';
import { Fab, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const FloatingNewProjectButton: React.FC = () => {
  return (
    <Tooltip title="Create New Project" placement="left">
      <Fab
        color="primary"
        component={Link}
        to="/projects/new"
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <AddIcon />
      </Fab>
    </Tooltip>
  );
};

export default FloatingNewProjectButton;
