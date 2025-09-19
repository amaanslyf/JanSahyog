// src/pages/IssuesTable.js - ADVANCED ISSUE MANAGEMENT
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Stack,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Assignment as AssignIcon,
  CheckCircle as ResolveIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

const IssuesTable = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const navigate = useNavigate();

  // Safe date formatter
  const formatDate = (timestamp) => {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      if (timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date)) return date.toLocaleDateString();
      }
      return 'Unknown';
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Fetch issues with real-time updates
  useEffect(() => {
    const issuesQuery = query(
      collection(db, 'civicIssues'),
      orderBy('reportedAt', 'desc')
    );

    const unsubscribe = onSnapshot(issuesQuery, (querySnapshot) => {
      const issuesList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        issuesList.push({ 
          id: doc.id, 
          ...data,
          reportedAt: data.reportedAt || new Date(),
          formattedDate: formatDate(data.reportedAt)
        });
      });
      setIssues(issuesList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching issues:', error);
      setLoading(false);
      showAlert('Failed to load issues', 'error');
    });

    return () => unsubscribe();
  }, []);

  // Show alert messages
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Handle issue update
  const handleUpdateIssue = async (issueId, updates) => {
    try {
      const issueRef = doc(db, 'civicIssues', issueId);
      await updateDoc(issueRef, {
        ...updates,
        lastUpdated: new Date(),
        updatedBy: 'Admin'
      });
      showAlert('Issue updated successfully!', 'success');
      setEditDialogOpen(false);
      setSelectedIssue(null);
    } catch (error) {
      console.error('Error updating issue:', error);
      showAlert('Failed to update issue', 'error');
    }
  };

  // Handle issue deletion
  const handleDeleteIssue = async (issueId) => {
    try {
      await deleteDoc(doc(db, 'civicIssues', issueId));
      showAlert('Issue deleted successfully!', 'success');
      setDeleteDialogOpen(false);
      setSelectedIssue(null);
    } catch (error) {
      console.error('Error deleting issue:', error);
      showAlert('Failed to delete issue', 'error');
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (status) => {
    try {
      const updatePromises = selectedRows.map(id => {
        const issueRef = doc(db, 'civicIssues', id);
        return updateDoc(issueRef, {
          status: status,
          lastUpdated: new Date(),
          updatedBy: 'Admin (Bulk Update)'
        });
      });
      
      await Promise.all(updatePromises);
      showAlert(`${selectedRows.length} issues updated to ${status}!`, 'success');
      setSelectedRows([]);
    } catch (error) {
      console.error('Error in bulk update:', error);
      showAlert('Failed to update issues', 'error');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return '#f44336';
      case 'In Progress': return '#ff9800';
      case 'Resolved': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#d32f2f';
      case 'High': return '#f57c00';
      case 'Medium': return '#1976d2';
      case 'Low': return '#388e3c';
      default: return '#9e9e9e';
    }
  };

  // DataGrid columns
  const columns = [
    { 
      field: 'title', 
      headerName: 'Issue Title', 
      width: 250,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Typography 
            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => navigate(`/issue/${params.id}`)}
          >
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          sx={{ 
            bgcolor: getStatusColor(params.value),
            color: 'white',
            fontWeight: 'bold'
          }} 
        />
      )
    },
    { 
      field: 'priority', 
      headerName: 'Priority', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          variant="outlined"
          sx={{ 
            borderColor: getPriorityColor(params.value),
            color: getPriorityColor(params.value),
            fontWeight: 'bold'
          }} 
        />
      )
    },
    { field: 'address', headerName: 'Location', width: 250 },
    { field: 'reportedBy', headerName: 'Reported By', width: 180 },
    { 
      field: 'formattedDate', 
      headerName: 'Date Reported', 
      width: 130,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <IconButton
            size="small"
            onClick={(event) => {
              setAnchorEl(event.currentTarget);
              setSelectedIssue(params.row);
            }}
          >
            <MoreIcon />
          </IconButton>
        </>
      ),
    },
  ];

  // Filter issues based on selected filters
  const filteredIssues = issues.filter(issue => {
    const statusMatch = filterStatus === '' || issue.status === filterStatus;
    const priorityMatch = filterPriority === '' || issue.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          🗂️ Issues Management
        </Typography>
        <Box>
          <Typography variant="subtitle1" color="textSecondary">
            Total Issues: {issues.length} | Filtered: {filteredIssues.length}
          </Typography>
        </Box>
      </Box>

      {/* Alert */}
      {alert.show && (
        <Alert severity={alert.severity} onClose={() => setAlert({ show: false, message: '', severity: 'info' })} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>

            {selectedRows.length > 0 && (
              <Box ml={2}>
                <Typography variant="body2" sx={{ mr: 2, display: 'inline' }}>
                  {selectedRows.length} selected
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  sx={{ mr: 1 }}
                  onClick={() => handleBulkStatusUpdate('Resolved')}
                >
                  Mark Resolved
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={() => handleBulkStatusUpdate('In Progress')}
                >
                  Mark In Progress
                </Button>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
      
      {/* Data Grid */}
      <Card>
        <Box height={600}>
          <DataGrid
            rows={filteredIssues}
            columns={columns}
            loading={loading}
            pageSize={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            checkboxSelection
            onSelectionModelChange={(newSelection) => {
              setSelectedRows(newSelection);
            }}
            selectionModel={selectedRows}
            components={{ Toolbar: GridToolbar }}
            sx={{ 
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f5f5f5',
                cursor: 'pointer'
              }
            }}
          />
        </Box>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          navigate(`/issue/${selectedIssue?.id}`);
          setAnchorEl(null);
        }}>
          <ListItemIcon><ViewIcon /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setEditDialogOpen(true);
          setAnchorEl(null);
        }}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Edit Issue</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setDeleteDialogOpen(true);
          setAnchorEl(null);
        }}>
          <ListItemIcon><DeleteIcon /></ListItemIcon>
          <ListItemText>Delete Issue</ListItemText>
        </MenuItem>
      </Menu>

      {/* Edit Issue Dialog */}
      <EditIssueDialog
        open={editDialogOpen}
        issue={selectedIssue}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedIssue(null);
        }}
        onSave={handleUpdateIssue}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedIssue?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => handleDeleteIssue(selectedIssue?.id)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Edit Issue Dialog Component
const EditIssueDialog = ({ open, issue, onClose, onSave }) => {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (issue) {
      setStatus(issue.status || 'Open');
      setPriority(issue.priority || 'Medium');
      setAdminNotes(issue.adminNotes || '');
    }
  }, [issue]);

  const handleSave = () => {
    onSave(issue.id, {
      status,
      priority,
      adminNotes
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Issue: {issue?.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value)}>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Admin Notes"
              multiline
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this issue..."
            />

            {/* Issue Details */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Issue Details</Typography>
                <Typography><strong>Description:</strong> {issue?.description}</Typography>
                <Typography><strong>Location:</strong> {issue?.address}</Typography>
                <Typography><strong>Reported By:</strong> {issue?.reportedBy}</Typography>
                <Typography><strong>Reported At:</strong> {issue?.formattedDate}</Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IssuesTable;
