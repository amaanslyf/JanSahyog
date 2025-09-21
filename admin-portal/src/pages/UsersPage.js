// src/pages/UsersPage.js - REAL FIREBASE USER MANAGEMENT SYSTEM
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
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Badge,
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
  Search as SearchIcon,
  FilterList as FilterIcon,
  Smartphone as MobileIcon,
  Computer as WebIcon,
  TrendingUp as ActivityIcon,
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
  where,
  getDocs,
  serverTimestamp,
  writeBatch
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
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  
  // New user form data
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'citizen',
    status: 'active',
    source: 'admin_created'
  });

  // Edit user form data
  const [editData, setEditData] = useState({
    role: '',
    status: '',
    displayName: '',
    phone: '',
    notificationsEnabled: true
  });

  // Safe date formatter
  const formatDate = (timestamp) => {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      if (timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date)) return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
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

  // Load real users and issues data
  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      setLoading(true);

      // Load users from Firebase
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const unsubscribeUsers = onSnapshot(usersQuery, async (querySnapshot) => {
        const usersList = [];
        
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          usersList.push({
            id: doc.id,
            ...userData,
            createdAt: userData.createdAt || new Date(),
            lastActive: userData.lastActive || userData.createdAt || new Date(),
            displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
            role: userData.role || 'citizen',
            status: userData.status || 'active',
            source: userData.source || 'unknown',
            points: userData.points || 0,
            notificationsEnabled: userData.notificationsEnabled !== false
          });
        });

        // Calculate user statistics by loading their issues
        const enrichedUsers = await calculateUserStatistics(usersList);
        setUsers(enrichedUsers);
        setLoading(false);
      });

      // Load issues for statistics
      const issuesQuery = query(collection(db, 'civicIssues'), orderBy('reportedAt', 'desc'));
      const unsubscribeIssues = onSnapshot(issuesQuery, (querySnapshot) => {
        const issuesList = [];
        querySnapshot.forEach((doc) => {
          issuesList.push({ id: doc.id, ...doc.data() });
        });
        setIssues(issuesList);
      });

      return () => {
        unsubscribeUsers();
        unsubscribeIssues();
      };

    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Failed to load users', 'error');
      setLoading(false);
    }
  };

  // Calculate user statistics from their issues
  const calculateUserStatistics = async (usersList) => {
    const enrichedUsers = [];

    for (const user of usersList) {
      try {
        // Get issues reported by this user
        const userIssuesQuery = query(
          collection(db, 'civicIssues'),
          where('reportedById', '==', user.id)
        );
        const userIssuesSnapshot = await getDocs(userIssuesQuery);
        
        let totalIssues = 0;
        let resolvedIssues = 0;
        let openIssues = 0;
        let inProgressIssues = 0;

        userIssuesSnapshot.forEach((doc) => {
          const issueData = doc.data();
          totalIssues++;
          
          switch (issueData.status) {
            case 'Resolved':
              resolvedIssues++;
              break;
            case 'Open':
              openIssues++;
              break;
            case 'In Progress':
              inProgressIssues++;
              break;
          }
        });

        enrichedUsers.push({
          ...user,
          totalIssues,
          resolvedIssues,
          openIssues,
          inProgressIssues,
          resolutionRate: totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0
        });

      } catch (error) {
        console.error(`Error calculating stats for user ${user.id}:`, error);
        enrichedUsers.push({
          ...user,
          totalIssues: 0,
          resolvedIssues: 0,
          openIssues: 0,
          inProgressIssues: 0,
          resolutionRate: 0
        });
      }
    }

    return enrichedUsers;
  };

  // Handle user update
  const handleUpdateUser = async () => {
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        ...editData,
        lastUpdated: serverTimestamp(),
        updatedBy: 'admin'
      });

      showAlert(`User ${selectedUser.email} updated successfully!`, 'success');
      setEditDialogOpen(false);
      setSelectedUser(null);
      
    } catch (error) {
      console.error('Error updating user:', error);
      showAlert('Failed to update user', 'error');
    }
  };

  // Handle add user
  const handleAddUser = async () => {
    try {
      await addDoc(collection(db, 'users'), {
        ...newUser,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        points: 0,
        notificationsEnabled: true,
        issuesReported: 0,
        createdBy: 'admin'
      });

      showAlert('User added successfully!', 'success');
      setAddUserDialogOpen(false);
      setNewUser({ email: '', displayName: '', role: 'citizen', status: 'active', source: 'admin_created' });
      
    } catch (error) {
      console.error('Error adding user:', error);
      showAlert('Failed to add user', 'error');
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      // Use batch to delete user and related data
      const batch = writeBatch(db);
      
      // Delete user document
      const userRef = doc(db, 'users', selectedUser.id);
      batch.delete(userRef);
      
      // You might want to also handle their issues, comments, etc.
      // For now, we'll just delete the user
      
      await batch.commit();
      
      showAlert('User deleted successfully!', 'success');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert('Failed to delete user', 'error');
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (user, newStatus) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        status: newStatus,
        lastUpdated: serverTimestamp(),
        updatedBy: 'admin'
      });

      showAlert(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully!`, 'success');
      setAnchorEl(null);
      
    } catch (error) {
      console.error('Error updating user status:', error);
      showAlert('Failed to update user status', 'error');
    }
  };

  // Export users to CSV
  const handleExportCSV = () => {
    const csvHeaders = [
      'Email', 'Display Name', 'Role', 'Status', 'Source', 'Join Date', 
      'Last Active', 'Total Issues', 'Resolved Issues', 'Open Issues', 
      'Resolution Rate', 'Points', 'Notifications Enabled'
    ];
    
    const csvData = filteredUsers.map(user => [
      user.email || '',
      user.displayName || '',
      user.role || '',
      user.status || '',
      user.source || '',
      formatDate(user.createdAt),
      formatDate(user.lastActive),
      user.totalIssues || 0,
      user.resolvedIssues || 0,
      user.openIssues || 0,
      `${user.resolutionRate || 0}%`,
      user.points || 0,
      user.notificationsEnabled ? 'Yes' : 'No'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
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

  // Get source icon
  const getSourceIcon = (source) => {
    switch (source) {
      case 'mobile_app': return <MobileIcon fontSize="small" />;
      case 'web_portal': return <WebIcon fontSize="small" />;
      default: return <UserIcon fontSize="small" />;
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const searchMatch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const roleMatch = roleFilter === 'all' || user.role === roleFilter;
    const statusMatch = statusFilter === 'all' || user.status === statusFilter;
    const sourceMatch = sourceFilter === 'all' || user.source === sourceFilter;
    
    return searchMatch && roleMatch && statusMatch && sourceMatch;
  });

  // Calculate statistics
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    citizens: users.filter(u => u.role === 'citizen').length,
    mobileUsers: users.filter(u => u.source === 'mobile_app').length,
    webUsers: users.filter(u => u.source === 'web_portal').length,
  };

  // Enhanced DataGrid columns
  const columns = [
    { 
      field: 'email', 
      headerName: 'User', 
      width: 250,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Badge 
            badgeContent={params.row.source === 'mobile_app' ? <MobileIcon sx={{ fontSize: 12 }} /> : ''}
            color="primary"
          >
            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
              {(params.row.displayName || params.value || 'U')[0].toUpperCase()}
            </Avatar>
          </Badge>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {params.row.displayName}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {params.value}
            </Typography>
          </Box>
        </Box>
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
      width: 100,
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
      field: 'source', 
      headerName: 'Source', 
      width: 100,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Box display="flex" alignItems="center" justifyContent="center">
            {getSourceIcon(params.value)}
          </Box>
        </Tooltip>
      )
    },
    { 
      field: 'totalIssues', 
      headerName: 'Issues', 
      width: 80,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {params.value || 0}
        </Typography>
      )
    },
    { 
      field: 'resolvedIssues', 
      headerName: 'Resolved', 
      width: 80,
      renderCell: (params) => (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
          {params.value || 0}
        </Typography>
      )
    },
    { 
      field: 'resolutionRate', 
      headerName: 'Rate', 
      width: 80,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {params.value || 0}%
        </Typography>
      )
    },
    { 
      field: 'points', 
      headerName: 'Points', 
      width: 80,
      renderCell: (params) => (
        <Chip 
          label={params.value || 0}
          size="small" 
          color="warning"
          variant="outlined"
        />
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Joined', 
      width: 100,
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDate(params.value)}
        </Typography>
      )
    },
    { 
      field: 'lastActive', 
      headerName: 'Last Seen', 
      width: 100,
      renderCell: (params) => (
        <Typography variant="body2" color="textSecondary">
          {formatDate(params.value)}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography ml={2}>Loading users...</Typography>
      </Box>
    );
  }

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
            Export CSV ({filteredUsers.length})
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
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={3} lg={2}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography color="textSecondary" variant="body2">Total Users</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={2}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography color="textSecondary" variant="body2">Active</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={2}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography color="textSecondary" variant="body2">Citizens</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{stats.citizens}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={2}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography color="textSecondary" variant="body2">Mobile Users</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>{stats.mobileUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={2}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography color="textSecondary" variant="body2">Admins</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>{stats.admins}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={2}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography color="textSecondary" variant="body2">Blocked</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>{stats.blocked}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Search & Filter</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="citizen">Citizen</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select value={sourceFilter} label="Source" onChange={(e) => setSourceFilter(e.target.value)}>
                <MenuItem value="all">All Sources</MenuItem>
                <MenuItem value="mobile_app">Mobile App</MenuItem>
                <MenuItem value="web_portal">Web Portal</MenuItem>
                <MenuItem value="admin_created">Admin Created</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setStatusFilter('all');
                setSourceFilter('all');
              }}
            >
              Clear Filters
            </Button>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Showing {filteredUsers.length} of {users.length} users
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Data Grid */}
      <Card>
        <Box height={600}>
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            loading={loading}
            pageSize={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
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
            displayName: selectedUser?.displayName || '',
            phone: selectedUser?.phone || '',
            notificationsEnabled: selectedUser?.notificationsEnabled !== false
          });
          setEditDialogOpen(true);
          setAnchorEl(null);
        }}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          const newStatus = selectedUser?.status === 'active' ? 'blocked' : 'active';
          handleToggleUserStatus(selectedUser, newStatus);
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
              label="Email *"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Display Name *"
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
            <TextField
              fullWidth
              label="Phone"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
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
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All user data and associated content will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete user <strong>"{selectedUser?.email}"</strong>?
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
