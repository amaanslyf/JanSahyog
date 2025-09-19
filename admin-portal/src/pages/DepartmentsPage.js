// src/pages/DepartmentsPage.js - DEPARTMENT MANAGEMENT WITH AUTO-ASSIGNMENT
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
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [autoAssignmentRules, setAutoAssignmentRules] = useState([]);
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

  // Initialize default departments and rules
  useEffect(() => {
    initializeDefaultData();
  }, []);

  const initializeDefaultData = async () => {
    try {
      // Default departments
      const defaultDepartments = [
        {
          name: 'Roads & Infrastructure',
          head: 'Rajesh Kumar',
          email: 'roads@jansahyog.gov.in',
          phone: '+91-9876543210',
          description: 'Handles road repairs, potholes, street maintenance',
          active: true,
          workingHours: '9 AM - 6 PM',
          keywords: ['pothole', 'road', 'street', 'pavement', 'traffic'],
          issuesAssigned: 12,
          issuesResolved: 8,
          avgResponseTime: '2.5 days'
        },
        {
          name: 'Sanitation & Waste Management',
          head: 'Priya Sharma',
          email: 'sanitation@jansahyog.gov.in',
          phone: '+91-9876543211',
          description: 'Garbage collection, waste management, cleanliness',
          active: true,
          workingHours: '8 AM - 5 PM',
          keywords: ['garbage', 'waste', 'trash', 'dirty', 'clean', 'sweeping'],
          issuesAssigned: 8,
          issuesResolved: 6,
          avgResponseTime: '1.8 days'
        },
        {
          name: 'Water & Drainage',
          head: 'Amit Patel',
          email: 'water@jansahyog.gov.in',
          phone: '+91-9876543212',
          description: 'Water supply, drainage issues, pipe repairs',
          active: true,
          workingHours: '24/7 Emergency',
          keywords: ['water', 'drain', 'pipe', 'leak', 'flood', 'sewer'],
          issuesAssigned: 6,
          issuesResolved: 4,
          avgResponseTime: '1.2 days'
        },
        {
          name: 'Electrical & Street Lighting',
          head: 'Sunita Rao',
          email: 'electrical@jansahyog.gov.in',
          phone: '+91-9876543213',
          description: 'Street lights, electrical repairs, power issues',
          active: true,
          workingHours: '24/7 Emergency',
          keywords: ['light', 'electricity', 'power', 'lamp', 'bulb', 'wire'],
          issuesAssigned: 5,
          issuesResolved: 5,
          avgResponseTime: '1.0 days'
        },
        {
          name: 'Parks & Environment',
          head: 'Ravi Singh',
          email: 'parks@jansahyog.gov.in',
          phone: '+91-9876543214',
          description: 'Parks maintenance, tree cutting, environmental issues',
          active: true,
          workingHours: '9 AM - 5 PM',
          keywords: ['park', 'tree', 'garden', 'environment', 'green', 'plants'],
          issuesAssigned: 3,
          issuesResolved: 2,
          avgResponseTime: '3.2 days'
        }
      ];

      // Default auto-assignment rules
      const defaultRules = [
        {
          keywords: 'pothole,road,street,pavement',
          priority: 'high',
          department: 'Roads & Infrastructure',
          enabled: true,
          description: 'Auto-assign road-related issues to Roads & Infrastructure department'
        },
        {
          keywords: 'garbage,waste,trash,dirty,clean',
          priority: 'medium',
          department: 'Sanitation & Waste Management',
          enabled: true,
          description: 'Auto-assign waste-related issues to Sanitation department'
        },
        {
          keywords: 'water,drain,pipe,leak,flood',
          priority: 'critical',
          department: 'Water & Drainage',
          enabled: true,
          description: 'Auto-assign water-related issues to Water & Drainage department'
        },
        {
          keywords: 'light,electricity,power,lamp,bulb',
          priority: 'high',
          department: 'Electrical & Street Lighting',
          enabled: true,
          description: 'Auto-assign electrical issues to Electrical department'
        },
        {
          keywords: 'park,tree,garden,environment',
          priority: 'low',
          department: 'Parks & Environment',
          enabled: true,
          description: 'Auto-assign environmental issues to Parks department'
        }
      ];

      setDepartments(defaultDepartments);
      setAutoAssignmentRules(defaultRules);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing data:', error);
      setLoading(false);
    }
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Add new department
  const handleAddDepartment = () => {
    const keywordsArray = newDept.keywords.join(',').toLowerCase().split(',').map(k => k.trim());
    const newDepartment = {
      ...newDept,
      keywords: keywordsArray,
      issuesAssigned: 0,
      issuesResolved: 0,
      avgResponseTime: '0 days',
      id: Date.now().toString()
    };

    setDepartments([...departments, newDepartment]);
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
  };

  // Delete department
  const handleDeleteDepartment = (id) => {
    setDepartments(departments.filter(dept => dept.id !== id));
    showAlert('Department deleted successfully!', 'success');
  };

  // Add auto-assignment rule
  const handleAddRule = () => {
    const rule = {
      ...newRule,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    
    setAutoAssignmentRules([...autoAssignmentRules, rule]);
    setNewRule({
      keywords: '',
      priority: 'medium',
      department: '',
      enabled: true
    });
    showAlert('Auto-assignment rule added!', 'success');
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
            Auto-Assignment Rules
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

      {/* Department Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Departments
              </Typography>
              <Typography variant="h4" component="h2">
                {departments.length}
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
                {departments.filter(d => d.active).length}
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
                {autoAssignmentRules.filter(r => r.enabled).length}
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
                {departments.reduce((sum, d) => sum + d.issuesAssigned, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Departments List */}
      <Grid container spacing={3}>
        {departments.map((dept) => (
          <Grid item xs={12} md={6} lg={4} key={dept.id || dept.name}>
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
                      onClick={() => handleDeleteDepartment(dept.id || dept.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Box>

                <Typography variant="body2" color="textSecondary" paragraph>
                  {dept.description}
                </Typography>

                <Stack spacing={2}>
                  <Box display="flex" alignItems="center">
                    <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      <strong>Head:</strong> {dept.head}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      <strong>Hours:</strong> {dept.workingHours}
                    </Typography>
                  </Box>

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

                  <Divider />

                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">
                        Assigned
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {dept.issuesAssigned}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">
                        Resolved
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {dept.issuesResolved}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">
                        Avg Time
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {dept.avgResponseTime}
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
        ))}
      </Grid>

      {/* Add Department Dialog */}
      <Dialog open={addDeptDialogOpen} onClose={() => setAddDeptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Department</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Department Name"
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
              value={newDept.keywords.join(', ')}
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
            disabled={!newDept.name || !newDept.head}
          >
            Add Department
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
                      {departments.map((dept) => (
                        <option key={dept.name} value={dept.name}>{dept.name}</option>
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
            <Typography variant="h6">Existing Auto-Assignment Rules</Typography>
            {autoAssignmentRules.map((rule) => (
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
                      control={<Switch checked={rule.enabled} size="small" />}
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
            ))}
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
