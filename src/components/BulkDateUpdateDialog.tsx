import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
// Using regular TextField with type="date" for better compatibility
import { Task } from '../types';

interface BulkDateUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  selectedTasks: Task[];
  onUpdate: (taskIds: number[], updates: { start_date?: string; due_date?: string }) => Promise<void>;
}

type DateUpdateType = 'start_date' | 'due_date' | 'both';

const BulkDateUpdateDialog: React.FC<BulkDateUpdateDialogProps> = ({
  open,
  onClose,
  selectedTasks,
  onUpdate,
}) => {
  const [updateType, setUpdateType] = useState<DateUpdateType>('start_date');
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedTasks.length) return;

    // Validate dates
    if (updateType === 'start_date' && !startDate) {
      setError('Please select a start date');
      return;
    }
    if (updateType === 'due_date' && !dueDate) {
      setError('Please select a due date');
      return;
    }
    if (updateType === 'both' && (!startDate || !dueDate)) {
      setError('Please select both start and due dates');
      return;
    }
    if (updateType === 'both' && startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      setError('Start date cannot be after due date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updates: { start_date?: string; due_date?: string } = {};

      if (updateType === 'start_date' || updateType === 'both') {
        updates.start_date = startDate;
      }
      if (updateType === 'due_date' || updateType === 'both') {
        updates.due_date = dueDate;
      }

      const taskIds = selectedTasks.map(task => task.id);
      await onUpdate(taskIds, updates);
      
      // Reset form and close
      setStartDate('');
      setDueDate('');
      setUpdateType('start_date');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStartDate('');
      setDueDate('');
      setUpdateType('start_date');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Bulk Update Dates
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Selected Tasks Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Tasks ({selectedTasks.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 100, overflow: 'auto' }}>
                {selectedTasks.map(task => (
                  <Chip
                    key={task.id}
                    label={`#${task.id} ${task.title}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* Update Type Selection */}
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">What would you like to update?</FormLabel>
              <RadioGroup
                value={updateType}
                onChange={(e) => setUpdateType(e.target.value as DateUpdateType)}
              >
                <FormControlLabel
                  value="start_date"
                  control={<Radio />}
                  label="Start Date Only"
                />
                <FormControlLabel
                  value="due_date"
                  control={<Radio />}
                  label="Due Date Only"
                />
                <FormControlLabel
                  value="both"
                  control={<Radio />}
                  label="Both Start and Due Dates"
                />
              </RadioGroup>
            </FormControl>

            {/* Date Inputs */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(updateType === 'start_date' || updateType === 'both') && (
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              )}

              {(updateType === 'due_date' || updateType === 'both') && (
                <TextField
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              )}
            </Box>

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || selectedTasks.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Updating...' : `Update ${selectedTasks.length} Task${selectedTasks.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

export default BulkDateUpdateDialog;
