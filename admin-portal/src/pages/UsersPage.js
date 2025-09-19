// src/pages/UsersPage.js - COMPLETE USER MANAGEMENT SYSTEM
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
  Menu,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  PersonAdd as AddUserIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Download as ExportIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  SupervisorAccount as ModeratorIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  orderBy,
  where 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // New user form data
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'citizen',
    status: 'active'
  });

  // Edit user form data
  const [editData, setEditData] = useState({
    role: '',
    status: '',
    displayName: ''
  });

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

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Fetch users and their issue statistics
  useEffect(() => {
    // Fetch users from a mock collection (in real app, you'd have a users collection)
    // For now, we'll derive users from issues
    const issuesQuery = query(collection(db, 'civicIssues'), orderBy('reportedAt', 'desc'));

    const unsubscribe = onSnapshot(issuesQuery, (querySnapshot) => {
      const issuesList = [];
      const userMap = new Map();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const issue = { id: doc.id, ...data };
        issuesList.push(issue);

        // Build user statistics
        const email = data.reportedBy;
        if (email && !userMap.has(email)) {
          userMap.set(email, {
            id: email, // Using email as ID
            email: email,
            displayName: email.split('@')[0], // Extract name from email
            role: 'citizen', // Default role
            status: 'active', // Default status
            joinDate: data.reportedAt || new Date(),
            totalIssues: 0,
            resolvedIssues: 0,
            openIssues: 0
          });
        }

        // Update statistics
        if (userMap.has(email)) {
          const user = userMap.get(email);
          user.totalIssues++;
          if (data.status === 'Resolved') user.resolvedIssues++;
          if (data.status === 'Open') user.openIssues++;
        }
      });

      // Add some admin users for demo
      userMap.set('admin@jansahyog.gov', {
        id: 'admin@jansahyog.gov',
        email: 'admin@jansahyog.gov',
        displayName: 'System Administrator',
        role: 'admin',
        status: 'active',
        joinDate: new Date('2023-01-01'),
        totalIssues: 0,
        resolvedIssues: 0,
        openIssues: 0
      });

      userMap.set('moderator@jansahyog.gov', {
        id: 'moderator@jansahyog.gov',
        email: 'moderator@jansahyog.gov',
        displayName: 'Content Moderator',
        role: 'moderator',
        status: 'active',
        joinDate: new Date('2023-02-01'),
        totalIssues: 0,
        resolvedIssues: 0,
        openIssues: 0
      });

      setUsers(Array.from(userMap.values()));
      setIssues(issuesList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching data:', error);
      showAlert('Failed to load users', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle user update
  const handleUpdateUser = async () => {
    try {
      // In a real app, you'd update the user in a users collection
      // For demo, we'll just show success message
      showAlert(`User ${selectedUser.email} updated successfully!`, 'success');
      setEditDialogOpen(false);
      setSelectedUser(null);
      
      // Update local state for demo
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...editData }
          : user
      ));
    } catch (error) {
      console.error('Error updating user:', error);
      showAlert('Failed to update user', 'error');
    }
  };

  // Handle add user
  const handleAddUser = async () => {
    try {
      // In a real app, you'd create the user using Firebase Admin SDK
      const userId = Date.now().toString(); // Mock ID
      const newUserData = {
        ...newUser,
        id: userId,
        joinDate: new Date(),
        totalIssues: 0,
        resolvedIssues: 0,
        openIssues: 0
      };

      setUsers([...users, newUserData]);
      showAlert('User added successfully!', 'success');
      setAddUserDialogOpen(false);
      setNewUser({ email: '', displayName: '', role: 'citizen', status: 'active' });
    } catch (error) {
      console.error('Error adding user:', error);
      showAlert('Failed to add user', 'error');
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      // In a real app, you'd delete from users collection
      setUsers(users.filter(user => user.id !== selectedUser.id));
      showAlert('User deleted successfully!', 'success');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert('Failed to delete user', 'error');
    }
  };

  // Export users to CSV
  const handleExportCSV = () => {
    const csvHeaders = ['Email', 'Display Name', 'Role', 'Status', 'Join Date', 'Total Issues', 'Resolved Issues', 'Open Issues'];
    const csvData = users.map(user => [
      user.email,
      user.displayName,
      user.role,
      user.status,
      formatDate(user.joinDate),
      user.totalIssues,
      user.resolvedIssues,
      user.openIssues
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `jansahyog-users-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('Users exported to CSV successfully!', 'success');
  };

  // Get role color and icon
  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { color: '#d32f2f', icon: <AdminIcon fontSize="small" />, label: 'Admin' };
      case 'moderator':
        return { color: '#f57c00', icon: <ModeratorIcon fontSize="small" />, label: 'Moderator' };
      case 'citizen':
        return { color: '#1976d2', icon: <UserIcon fontSize="small" />, label: 'Citizen' };
      default:
        return { color: '#9e9e9e', icon: <UserIcon fontSize="small" />, label: 'Unknown' };
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'blocked': return '#f44336';
      case 'pending': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  // DataGrid columns
  const columns = [
    { 
      field: 'email', 
      headerName: 'Email', 
      width: 250,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
            {params.value.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      )
    },
    { 
      field: 'displayName', 
      headerName: 'Display Name', 
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'role', 
      headerName: 'Role', 
      width: 130,
      renderCell: (params) => {
        const roleInfo = getRoleInfo(params.value);
        return (
          <Chip 
            icon={roleInfo.icon}
            label={roleInfo.label}
            size="small" 
            sx={{ 
              bgcolor: roleInfo.color,
              color: 'white',
              fontWeight: 'bold',
              '& .MuiChip-icon': { color: 'white' }
            }} 
          />
        );
      }
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
            fontWeight: 'bold',
            textTransform: 'capitalize'
          }} 
        />
      )
    },
    { 
      field: 'totalIssues', 
      headerName: 'Issues', 
      width: 90,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'resolvedIssues', 
      headerName: 'Resolved', 
      width: 90,
      renderCell: (params) => (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'joinDate', 
      headerName: 'Joined', 
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDate(params.value)}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(event) => {
            setAnchorEl(event.currentTarget);
            setSelectedUser(params.row);
          }}
        >
          <MoreIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          👥 User Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddUserIcon />}
            onClick={() => setAddUserDialogOpen(true)}
          >
            Add User
          </Button>
        </Stack>
      </Box>

      {/* Alert */}
      {alert.show && (
        <Alert 
          severity={alert.severity} 
          onClose={() => setAlert({ show: false, message: '', severity: 'info' })} 
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4" component="h2">
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Users
              </Typography>
              <Typography variant="h4" component="h2" color="success.main">
                {users.filter(u => u.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Admin Users
              </Typography>
              <Typography variant="h4" component="h2" color="error.main">
                {users.filter(u => u.role === 'admin').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Citizens
              </Typography>
              <Typography variant="h4" component="h2" color="primary.main">
                {users.filter(u => u.role === 'citizen').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Data Grid */}
      <Card>
        <Box height={600}>
          <DataGrid
            rows={users}
            columns={columns}
            loading={loading}
            pageSize={25}
            rowsPerPageOptions={[10, 25, 50]}
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
          setEditData({
            role: selectedUser?.role || 'citizen',
            status: selectedUser?.status || 'active',
            displayName: selectedUser?.displayName || ''
          });
          setEditDialogOpen(true);
          setAnchorEl(null);
        }}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          const newStatus = selectedUser?.status === 'active' ? 'blocked' : 'active';
          setUsers(users.map(user => 
            user.id === selectedUser?.id 
              ? { ...user, status: newStatus }
              : user
          ));
          showAlert(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully!`, 'success');
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            {selectedUser?.status === 'active' ? <BlockIcon /> : <ActivateIcon />}
          </ListItemIcon>
          <ListItemText>
            {selectedUser?.status === 'active' ? 'Block User' : 'Activate User'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setDeleteDialogOpen(true);
          setAnchorEl(null);
        }}>
          <ListItemIcon><DeleteIcon /></ListItemIcon>
          <ListItemText>Delete User</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Display Name"
              value={newUser.displayName}
              onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={newUser.role} label="Role" onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <MenuItem value="citizen">Citizen</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={newUser.status} label="Status" onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained"
            disabled={!newUser.email || !newUser.displayName}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User: {selectedUser?.email}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Display Name"
              value={editData.displayName}
              onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={editData.role} label="Role" onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                <MenuItem value="citizen">Citizen</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={editData.status} label="Status" onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.email}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
