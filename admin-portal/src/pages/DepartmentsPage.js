// src/pages/DepartmentsPage.js - COMPLETELY DYNAMIC (NO HARDCODED DATA)
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
  TextField,
  Alert,
  Stack,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Assignment as AssignIcon,
  AutoMode as AutoIcon,
  ExpandMore as ExpandMoreIcon,
  Business as DeptIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  orderBy,
  getDocs,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [autoAssignmentRules, setAutoAssignmentRules] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDeptDialogOpen, setAddDeptDialogOpen] = useState(false);
  const [editDeptDialogOpen, setEditDeptDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  // New department form
  const [newDept, setNewDept] = useState({
    name: '',
    head: '',
    email: '',
    phone: '',
    description: '',
    active: true,
    workingHours: '9 AM - 5 PM',
    keywords: []
  });

  // Auto-assignment rule form
  const [newRule, setNewRule] = useState({
    keywords: '',
    priority: 'medium',
    department: '',
    enabled: true
  });

  // Load real data from Firebase
  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      setLoading(true);

      // Load departments
      await loadDepartments();
      
      // Load auto-assignment rules
      await loadAutoAssignmentRules();
      
      // Load issues for statistics calculation
      await loadIssues();

    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load departments from Firebase
  const loadDepartments = async () => {
    try {
      const departmentsRef = collection(db, 'departments');
      
      // Check if departments exist, if not create default ones
      const departmentsSnapshot = await getDocs(departmentsRef);
      
      if (departmentsSnapshot.empty) {
        await createDefaultDepartments();
      }
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(
        query(departmentsRef, orderBy('name')), 
        (snapshot) => {
          const departmentsList = [];
          snapshot.forEach((doc) => {
            departmentsList.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date()
            });
          });
          setDepartments(departmentsList);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  // Load auto-assignment rules
  const loadAutoAssignmentRules = async () => {
    try {
      const rulesRef = collection(db, 'autoAssignmentRules');
      
      // Check if rules exist, if not create default ones
      const rulesSnapshot = await getDocs(rulesRef);
      
      if (rulesSnapshot.empty) {
        await createDefaultRules();
      }
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(rulesRef, (snapshot) => {
        const rulesList = [];
        snapshot.forEach((doc) => {
          rulesList.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          });
        });
        setAutoAssignmentRules(rulesList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading auto-assignment rules:', error);
    }
  };

  // Load issues for statistics calculation
  const loadIssues = async () => {
    try {
      const issuesRef = collection(db, 'civicIssues');
      const unsubscribe = onSnapshot(issuesRef, (snapshot) => {
        const issuesList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          issuesList.push({
            id: doc.id,
            ...data,
            reportedAt: data.reportedAt?.toDate() || new Date(),
            lastUpdated: data.lastUpdated?.toDate() || new Date()
          });
        });
        setIssues(issuesList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  // Create default departments (only basic structure, no fake data)
  const createDefaultDepartments = async () => {
    const defaultDepartments = [
      {
        name: 'Roads & Infrastructure',
        head: '',
        email: '',
        phone: '',
        description: 'Handles road repairs, potholes, street maintenance',
        active: true,
        workingHours: '9 AM - 6 PM',
        keywords: ['pothole', 'road', 'street', 'pavement', 'traffic'],
        createdAt: serverTimestamp()
      },
      {
        name: 'Sanitation & Waste Management',
        head: '',
        email: '',
        phone: '',
        description: 'Garbage collection, waste management, cleanliness',
        active: true,
        workingHours: '8 AM - 5 PM',
        keywords: ['garbage', 'waste', 'trash', 'dirty', 'clean', 'sweeping'],
        createdAt: serverTimestamp()
      },
      {
        name: 'Water & Drainage',
        head: '',
        email: '',
        phone: '',
        description: 'Water supply, drainage issues, pipe repairs',
        active: true,
        workingHours: '24/7 Emergency',
        keywords: ['water', 'drain', 'pipe', 'leak', 'flood', 'sewer'],
        createdAt: serverTimestamp()
      },
      {
        name: 'Electrical & Street Lighting',
        head: '',
        email: '',
        phone: '',
        description: 'Street lights, electrical repairs, power issues',
        active: true,
        workingHours: '24/7 Emergency',
        keywords: ['light', 'electricity', 'power', 'lamp', 'bulb', 'wire'],
        createdAt: serverTimestamp()
      },
      {
        name: 'Parks & Environment',
        head: '',
        email: '',
        phone: '',
        description: 'Parks maintenance, tree cutting, environmental issues',
        active: true,
        workingHours: '9 AM - 5 PM',
        keywords: ['park', 'tree', 'garden', 'environment', 'green', 'plants'],
        createdAt: serverTimestamp()
      }
    ];

    const departmentsRef = collection(db, 'departments');
    for (const dept of defaultDepartments) {
      await addDoc(departmentsRef, dept);
    }
  };

  // Create default auto-assignment rules
  const createDefaultRules = async () => {
    const defaultRules = [
      {
        keywords: 'pothole,road,street,pavement',
        priority: 'high',
        department: 'Roads & Infrastructure',
        enabled: true,
        description: 'Auto-assign road-related issues to Roads & Infrastructure department',
        createdAt: serverTimestamp()
      },
      {
        keywords: 'garbage,waste,trash,dirty,clean',
        priority: 'medium',  
        department: 'Sanitation & Waste Management',
        enabled: true,
        description: 'Auto-assign waste-related issues to Sanitation department',
        createdAt: serverTimestamp()
      },
      {
        keywords: 'water,drain,pipe,leak,flood',
        priority: 'critical',
        department: 'Water & Drainage',
        enabled: true,
        description: 'Auto-assign water-related issues to Water & Drainage department',
        createdAt: serverTimestamp()
      },
      {
        keywords: 'light,electricity,power,lamp,bulb',
        priority: 'high',
        department: 'Electrical & Street Lighting',
        enabled: true,
        description: 'Auto-assign electrical issues to Electrical department',
        createdAt: serverTimestamp()
      },
      {
        keywords: 'park,tree,garden,environment',
        priority: 'low',
        department: 'Parks & Environment',
        enabled: true,
        description: 'Auto-assign environmental issues to Parks department',
        createdAt: serverTimestamp()
      }
    ];

    const rulesRef = collection(db, 'autoAssignmentRules');
    for (const rule of defaultRules) {
      await addDoc(rulesRef, rule);
    }
  };

  // Calculate real statistics for each department
  const getDepartmentStats = (departmentName) => {
    const departmentIssues = issues.filter(issue => 
      issue.assignedDepartment === departmentName
    );
    
    const assignedCount = departmentIssues.length;
    const resolvedCount = departmentIssues.filter(issue => 
      issue.status === 'Resolved'
    ).length;

    // Calculate average response time
    const resolvedIssues = departmentIssues.filter(issue => 
      issue.status === 'Resolved' && issue.reportedAt && issue.lastUpdated
    );
    
    let avgResponseTime = '0 days';
    if (resolvedIssues.length > 0) {
      const totalResponseTime = resolvedIssues.reduce((sum, issue) => {
        const responseTime = (issue.lastUpdated - issue.reportedAt) / (1000 * 60 * 60 * 24); // days
        return sum + responseTime;
      }, 0);
      
      const avgDays = Math.round(totalResponseTime / resolvedIssues.length * 10) / 10;
      avgResponseTime = `${avgDays} days`;
    }

    return {
      issuesAssigned: assignedCount,
      issuesResolved: resolvedCount,
      avgResponseTime: avgResponseTime
    };
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Add new department
  const handleAddDepartment = async () => {
    try {
      const keywordsArray = typeof newDept.keywords === 'string' 
        ? newDept.keywords.split(',').map(k => k.trim()).filter(k => k)
        : newDept.keywords;

      const departmentData = {
        ...newDept,
        keywords: keywordsArray,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'departments'), departmentData);

      setNewDept({
        name: '',
        head: '',
        email: '',
        phone: '',
        description: '',
        active: true,
        workingHours: '9 AM - 5 PM',
        keywords: []
      });
      setAddDeptDialogOpen(false);
      showAlert('Department added successfully!', 'success');
    } catch (error) {
      console.error('Error adding department:', error);
      showAlert('Failed to add department', 'error');
    }
  };

  // Update department
  const handleUpdateDepartment = async () => {
    try {
      if (!selectedDepartment) return;

      const keywordsArray = typeof selectedDepartment.keywords === 'string' 
        ? selectedDepartment.keywords.split(',').map(k => k.trim()).filter(k => k)
        : selectedDepartment.keywords;

      const departmentData = {
        ...selectedDepartment,
        keywords: keywordsArray,
        lastUpdated: serverTimestamp()
      };

      await updateDoc(doc(db, 'departments', selectedDepartment.id), departmentData);

      setEditDeptDialogOpen(false);
      setSelectedDepartment(null);
      showAlert('Department updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating department:', error);
      showAlert('Failed to update department', 'error');
    }
  };

  // Delete department
  const handleDeleteDepartment = async (departmentId) => {
    try {
      await deleteDoc(doc(db, 'departments', departmentId));
      showAlert('Department deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting department:', error);
      showAlert('Failed to delete department', 'error');
    }
  };

  // Add auto-assignment rule
  const handleAddRule = async () => {
    try {
      const ruleData = {
        ...newRule,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'autoAssignmentRules'), ruleData);
      
      setNewRule({
        keywords: '',
        priority: 'medium',
        department: '',
        enabled: true
      });
      showAlert('Auto-assignment rule added!', 'success');
    } catch (error) {
      console.error('Error adding rule:', error);
      showAlert('Failed to add rule', 'error');
    }
  };

  // Toggle rule enabled/disabled
  const handleToggleRule = async (ruleId, enabled) => {
    try {
      await updateDoc(doc(db, 'autoAssignmentRules', ruleId), {
        enabled: enabled,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling rule:', error);
      showAlert('Failed to update rule', 'error');
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#1976d2';
      case 'low': return '#388e3c';
      default: return '#9e9e9e';
    }
  };

  // Calculate department statistics
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.active).length;
  const activeRules = autoAssignmentRules.filter(r => r.enabled).length;
  const totalAssignedIssues = departments.reduce((sum, dept) => {
    const stats = getDepartmentStats(dept.name);
    return sum + stats.issuesAssigned;
  }, 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={50} />
        <Typography ml={2}>Loading Departments...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          🏢 Department Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setRulesDialogOpen(true)}
          >
            Auto-Assignment Rules ({activeRules})
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDeptDialogOpen(true)}
          >
            Add Department
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

      {/* Real Department Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Departments
              </Typography>
              <Typography variant="h4" component="h2">
                {totalDepartments}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Departments
              </Typography>
              <Typography variant="h4" component="h2" color="success.main">
                {activeDepartments}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Auto Rules Active
              </Typography>
              <Typography variant="h4" component="h2" color="primary.main">
                {activeRules}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Issues Assigned
              </Typography>
              <Typography variant="h4" component="h2" color="warning.main">
                {totalAssignedIssues}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Departments List with Real Data */}
      {departments.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" textAlign="center" color="textSecondary">
              No departments found. Create your first department to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {departments.map((dept) => {
            const stats = getDepartmentStats(dept.name);
            return (
              <Grid item xs={12} md={6} lg={4} key={dept.id}>
                <Card elevation={3}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center">
                        <DeptIcon sx={{ mr: 1, color: '#1976d2' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {dept.name}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => {
                          setSelectedDepartment(dept);
                          setEditDeptDialogOpen(true);
                        }}>
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteDepartment(dept.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Box>

                    <Typography variant="body2" color="textSecondary" paragraph>
                      {dept.description || 'No description provided'}
                    </Typography>

                    <Stack spacing={2}>
                      {dept.head && (
                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            <strong>Head:</strong> {dept.head}
                          </Typography>
                        </Box>
                      )}
                      
                      <Box display="flex" alignItems="center">
                        <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2">
                          <strong>Hours:</strong> {dept.workingHours}
                        </Typography>
                      </Box>

                      {dept.keywords && dept.keywords.length > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Keywords:</strong>
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                            {dept.keywords.slice(0, 3).map((keyword, index) => (
                              <Chip 
                                key={index}
                                label={keyword} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: 10 }}
                              />
                            ))}
                            {dept.keywords.length > 3 && (
                              <Chip 
                                label={`+${dept.keywords.length - 3} more`} 
                                size="small" 
                                color="primary"
                                sx={{ fontSize: 10 }}
                              />
                            )}
                          </Stack>
                        </Box>
                      )}

                      <Divider />

                      {/* Real Statistics */}
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">
                            Assigned
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {stats.issuesAssigned}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">
                            Resolved
                          </Typography>
                          <Typography variant="h6" color="success.main">
                            {stats.issuesResolved}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">
                            Avg Time
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {stats.avgResponseTime}
                          </Typography>
                        </Grid>
                      </Grid>

                      <Chip 
                        label={dept.active ? 'Active' : 'Inactive'}
                        color={dept.active ? 'success' : 'default'}
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add Department Dialog */}
      <Dialog open={addDeptDialogOpen} onClose={() => setAddDeptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Department</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Department Name *"
              value={newDept.name}
              onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Department Head"
              value={newDept.head}
              onChange={(e) => setNewDept({ ...newDept, head: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newDept.email}
              onChange={(e) => setNewDept({ ...newDept, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone"
              value={newDept.phone}
              onChange={(e) => setNewDept({ ...newDept, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newDept.description}
              onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
            />
            <TextField
              fullWidth
              label="Working Hours"
              value={newDept.workingHours}
              onChange={(e) => setNewDept({ ...newDept, workingHours: e.target.value })}
            />
            <TextField
              fullWidth
              label="Keywords (comma-separated)"
              placeholder="pothole, road, street, repair"
              value={Array.isArray(newDept.keywords) ? newDept.keywords.join(', ') : newDept.keywords}
              onChange={(e) => setNewDept({ 
                ...newDept, 
                keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
              })}
              helperText="Enter keywords that will trigger auto-assignment to this department"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={newDept.active} 
                  onChange={(e) => setNewDept({ ...newDept, active: e.target.checked })}
                />
              }
              label="Active Department"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDeptDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddDepartment} 
            variant="contained"
            disabled={!newDept.name}
          >
            Add Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={editDeptDialogOpen} onClose={() => setEditDeptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Department</DialogTitle>
        <DialogContent>
          {selectedDepartment && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Department Name *"
                value={selectedDepartment.name}
                onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
              />
              <TextField
                fullWidth
                label="Department Head"
                value={selectedDepartment.head || ''}
                onChange={(e) => setSelectedDepartment({ ...selectedDepartment, head: e.target.value })}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={selectedDepartment.email || ''}
                onChange={(e) => setSelectedDepartment({ ...selectedDepartment, email: e.target.value })}
              />
              <TextField
                fullWidth
                label="Phone"
                value={selectedDepartment.phone || ''}
                onChange={(e) => setSelectedDepartment({ ...selectedDepartment, phone: e.target.value })}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={selectedDepartment.description || ''}
                onChange={(e) => setSelectedDepartment({ ...selectedDepartment, description: e.target.value })}
              />
              <TextField
                fullWidth
                label="Working Hours"
                value={selectedDepartment.workingHours || ''}
                onChange={(e) => setSelectedDepartment({ ...selectedDepartment, workingHours: e.target.value })}
              />
              <TextField
                fullWidth
                label="Keywords (comma-separated)"
                value={Array.isArray(selectedDepartment.keywords) ? selectedDepartment.keywords.join(', ') : selectedDepartment.keywords || ''}
                onChange={(e) => setSelectedDepartment({ 
                  ...selectedDepartment, 
                  keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                })}
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={selectedDepartment.active} 
                    onChange={(e) => setSelectedDepartment({ ...selectedDepartment, active: e.target.checked })}
                  />
                }
                label="Active Department"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDeptDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateDepartment} 
            variant="contained"
          >
            Update Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto-Assignment Rules Dialog */}
      <Dialog open={rulesDialogOpen} onClose={() => setRulesDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AutoIcon sx={{ mr: 1 }} />
            Auto-Assignment Rules
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            {/* Add New Rule */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Add New Auto-Assignment Rule</Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Keywords (comma-separated)"
                    placeholder="pothole, road, street"
                    value={newRule.keywords}
                    onChange={(e) => setNewRule({ ...newRule, keywords: e.target.value })}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Priority"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
                      SelectProps={{ native: true }}
                      sx={{ minWidth: 120 }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </TextField>
                    <TextField
                      select
                      label="Department"
                      value={newRule.department}
                      onChange={(e) => setNewRule({ ...newRule, department: e.target.value })}
                      SelectProps={{ native: true }}
                      sx={{ minWidth: 200 }}
                    >
                      <option value="">Select Department</option>
                      {departments.filter(dept => dept.active).map((dept) => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </TextField>
                  </Stack>
                  <Button 
                    variant="contained" 
                    onClick={handleAddRule}
                    disabled={!newRule.keywords || !newRule.department}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add Rule
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Existing Rules */}
            <Typography variant="h6">Existing Auto-Assignment Rules ({autoAssignmentRules.length})</Typography>
            {autoAssignmentRules.length === 0 ? (
              <Typography color="textSecondary" textAlign="center">
                No auto-assignment rules found. Create rules to automatically assign issues to departments.
              </Typography>
            ) : (
              autoAssignmentRules.map((rule) => (
                <Accordion key={rule.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip 
                          label={rule.priority}
                          size="small"
                          sx={{ 
                            bgcolor: getPriorityColor(rule.priority),
                            color: 'white'
                          }}
                        />
                        <Typography variant="subtitle1">
                          {rule.department}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Keywords: {rule.keywords}
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={rule.enabled} 
                            size="small"
                            onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                          />
                        }
                        label="Enabled"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary">
                      {rule.description || 'Auto-assignment rule for matching keywords'}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRulesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentsPage;
