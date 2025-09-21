// src/pages/IssuesTable.js - FULLY ENHANCED ISSUE MANAGEMENT
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
  Grid,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Assignment as AssignIcon,
  CheckCircle as ResolveIcon,
  Business as DeptIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

const IssuesTable = () => {
  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Enhanced filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    department: '',
    reporter: ''
  });

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

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load issues with real-time updates
      const issuesQuery = query(
        collection(db, 'civicIssues'),
        orderBy('reportedAt', 'desc')
      );

      const unsubscribeIssues = onSnapshot(issuesQuery, (querySnapshot) => {
        const issuesList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          issuesList.push({ 
            id: doc.id, 
            ...data,
            reportedAt: data.reportedAt || new Date(),
            lastUpdated: data.lastUpdated || data.reportedAt || new Date(),
            formattedDate: formatDate(data.reportedAt),
            formattedUpdated: formatDate(data.lastUpdated || data.reportedAt)
          });
        });
        setIssues(issuesList);
        setLoading(false);
      });

      // Load departments
      const departmentsSnapshot = await getDocs(collection(db, 'departments'));
      const departmentsList = [];
      departmentsSnapshot.forEach((doc) => {
        departmentsList.push({ id: doc.id, ...doc.data() });
      });
      setDepartments(departmentsList);

      // Load users for reporter info
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          displayName: userData.displayName || userData.email?.split('@')[0] || 'Anonymous',
          email: userData.email,
          source: userData.source
        });
      });
      setUsers(usersList);

      return () => {
        unsubscribeIssues();
      };

    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Failed to load data', 'error');
      setLoading(false);
    }
  };

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
        lastUpdated: serverTimestamp(),
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

  // Bulk status update with department assignment
  const handleBulkUpdate = async (updates) => {
    try {
      const updatePromises = selectedRows.map(id => {
        const issueRef = doc(db, 'civicIssues', id);
        return updateDoc(issueRef, {
          ...updates,
          lastUpdated: serverTimestamp(),
          updatedBy: 'Admin (Bulk Update)'
        });
      });
      
      await Promise.all(updatePromises);
      showAlert(`${selectedRows.length} issues updated successfully!`, 'success');
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

  // Get unique values for filters
  const getUniqueValues = (field) => {
    return [...new Set(issues.map(issue => issue[field]).filter(Boolean))].sort();
  };

  // Enhanced DataGrid columns
  const columns = [
    { 
      field: 'title', 
      headerName: 'Issue Title', 
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Typography 
            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setSelectedIssue(params.row) || setViewDialogOpen(true)}
          >
            {params.value || 'Untitled Issue'}
          </Typography>
        </Tooltip>
      )
    },
    { 
      field: 'category', 
      headerName: 'Category', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'Other'} 
          size="small" 
          color="primary"
          variant="outlined"
        />
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'Open'} 
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
          label={params.value || 'Medium'} 
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
    { 
      field: 'assignedDepartment', 
      headerName: 'Department', 
      width: 180,
      renderCell: (params) => params.value ? (
        <Chip 
          label={params.value} 
          size="small" 
          color="secondary"
          icon={<DeptIcon />}
        />
      ) : (
        <Typography variant="body2" color="textSecondary">
          Unassigned
        </Typography>
      )
    },
    { 
      field: 'location', 
      headerName: 'Location', 
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.row.location?.address || 'No address'}>
          <Typography variant="body2" noWrap>
            {params.row.location?.address || 'Location not available'}
          </Typography>
        </Tooltip>
      )
    },
    { 
      field: 'reportedBy', 
      headerName: 'Reporter', 
      width: 150,
      renderCell: (params) => {
        const user = users.find(u => u.id === params.row.reportedById);
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
              {(user?.displayName || params.value || 'A')[0]}
            </Avatar>
            <Typography variant="body2">
              {user?.displayName || params.value || 'Anonymous'}
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'formattedDate', 
      headerName: 'Reported', 
      width: 110,
    },
    { 
      field: 'formattedUpdated', 
      headerName: 'Last Updated', 
      width: 110,
    },
    {
      field: 'hasImage',
      headerName: 'Image',
      width: 80,
      renderCell: (params) => (
        params.row.imageUri || params.row.imageBase64 ? (
          <ImageIcon color="primary" />
        ) : (
          <ImageIcon color="disabled" />
        )
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(event) => {
            setAnchorEl(event.currentTarget);
            setSelectedIssue(params.row);
          }}
        >
          <MoreIcon />
        </IconButton>
      ),
    },
  ];

  // Apply filters
  const filteredIssues = issues.filter(issue => {
    return (
      (filters.status === '' || issue.status === filters.status) &&
      (filters.priority === '' || issue.priority === filters.priority) &&
      (filters.category === '' || issue.category === filters.category) &&
      (filters.department === '' || issue.assignedDepartment === filters.department) &&
      (filters.reporter === '' || issue.reportedBy === filters.reporter)
    );
  });

  // Calculate statistics
  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'Open').length,
    inProgress: issues.filter(i => i.status === 'In Progress').length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
    unassigned: issues.filter(i => !i.assignedDepartment).length,
    critical: issues.filter(i => i.priority === 'Critical').length,
  };

  return (
    <Box>
      {/* Header with Stats */}
      <Box mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 2 }}>
          🗂️ Issues Management
        </Typography>
        
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={4} md={2}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" color="primary">{stats.total}</Typography>
                <Typography variant="body2" color="textSecondary">Total</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" color="error">{stats.open}</Typography>
                <Typography variant="body2" color="textSecondary">Open</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" color="warning.main">{stats.inProgress}</Typography>
                <Typography variant="body2" color="textSecondary">In Progress</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" color="success.main">{stats.resolved}</Typography>
                <Typography variant="body2" color="textSecondary">Resolved</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" color="text.secondary">{stats.unassigned}</Typography>
                <Typography variant="body2" color="textSecondary">Unassigned</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" color="error.dark">{stats.critical}</Typography>
                <Typography variant="body2" color="textSecondary">Critical</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Alert */}
      {alert.show && (
        <Alert severity={alert.severity} onClose={() => setAlert({ show: false, message: '', severity: 'info' })} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Enhanced Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filters & Actions</Typography>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {getUniqueValues('status').map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="">All Priorities</MenuItem>
                {getUniqueValues('priority').map(priority => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="">All Categories</MenuItem>
                {getUniqueValues('category').map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={filters.department}
                label="Department"
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              >
                <MenuItem value="">All Departments</MenuItem>
                <MenuItem value="__unassigned__">Unassigned</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept.id} value={dept.name}>{dept.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              size="small"
              onClick={() => setFilters({ status: '', priority: '', category: '', department: '', reporter: '' })}
            >
              Clear Filters
            </Button>

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
                  onClick={() => handleBulkUpdate({ status: 'Resolved' })}
                >
                  Mark Resolved
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  sx={{ mr: 1 }}
                  onClick={() => handleBulkUpdate({ status: 'In Progress' })}
                >
                  In Progress
                </Button>
              </Box>
            )}
          </Stack>
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Showing {filteredIssues.length} of {issues.length} issues
          </Typography>
        </CardContent>
      </Card>
      
      {/* Enhanced Data Grid */}
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
          setViewDialogOpen(true);
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

      {/* View Issue Dialog */}
      <ViewIssueDialog
        open={viewDialogOpen}
        issue={selectedIssue}
        departments={departments}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedIssue(null);
        }}
      />

      {/* Edit Issue Dialog */}
      <EditIssueDialog
        open={editDialogOpen}
        issue={selectedIssue}
        departments={departments}
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

// Enhanced View Issue Dialog
const ViewIssueDialog = ({ open, issue, departments, onClose }) => {
  if (!issue) return null;

  const assignedDept = departments.find(d => d.name === issue.assignedDepartment);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Issue Details</Typography>
          <Chip 
            label={issue.status || 'Open'} 
            color={issue.status === 'Resolved' ? 'success' : issue.status === 'In Progress' ? 'warning' : 'error'}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>{issue.title}</Typography>
                <Typography variant="body1" paragraph>
                  {issue.description}
                </Typography>
              </Box>

              {issue.adminNotes && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Admin Notes:
                    </Typography>
                    <Typography variant="body2">
                      {issue.adminNotes}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {(issue.imageUri || issue.imageBase64) && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Attached Image:
                  </Typography>
                  <img
                    src={issue.imageBase64 ? `data:image/jpeg;base64,${issue.imageBase64}` : issue.imageUri}
                    alt="Issue"
                    style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
                  />
                </Box>
              )}
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Priority</Typography>
                <Chip label={issue.priority || 'Medium'} color="primary" size="small" />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Category</Typography>
                <Typography variant="body2">{issue.category || 'Other'}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                {assignedDept ? (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {assignedDept.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Head: {assignedDept.head || 'Not assigned'}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="error">
                    Unassigned
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Location</Typography>
                <Typography variant="body2">
                  {issue.location?.address || 'Location not available'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Reported By</Typography>
                <Typography variant="body2">{issue.reportedBy || 'Anonymous'}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Reported Date</Typography>
                <Typography variant="body2">{issue.formattedDate}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Last Updated</Typography>
                <Typography variant="body2">{issue.formattedUpdated}</Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Enhanced Edit Issue Dialog
const EditIssueDialog = ({ open, issue, departments, onClose, onSave }) => {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedDepartment, setAssignedDepartment] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (issue) {
      setStatus(issue.status || 'Open');
      setPriority(issue.priority || 'Medium');
      setAssignedDepartment(issue.assignedDepartment || '');
      setAdminNotes(issue.adminNotes || '');
    }
  }, [issue]);

  const handleSave = () => {
    const updates = {
      status,
      priority,
      assignedDepartment: assignedDepartment || null,
      adminNotes
    };

    onSave(issue.id, updates);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Issue: {issue?.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 2 }}>
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

          <FormControl fullWidth>
            <InputLabel>Assign Department</InputLabel>
            <Select 
              value={assignedDepartment} 
              label="Assign Department" 
              onChange={(e) => setAssignedDepartment(e.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {departments.filter(dept => dept.active).map((dept) => (
                <MenuItem key={dept.id} value={dept.name}>
                  {dept.name}
                </MenuItem>
              ))}
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

          {/* Issue Details Summary */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Issue Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Category:</strong> {issue?.category || 'Other'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Reporter:</strong> {issue?.reportedBy || 'Anonymous'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Location:</strong> {issue?.location?.address || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Description:</strong> {issue?.description}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IssuesTable;
