// src/pages/AnalyticsPage.js - ADVANCED GOVERNMENT ANALYTICS DASHBOARD
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Tabs,
  Tab,
  Stack,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportIcon,
  Schedule as TimeIcon,
  LocationOn as LocationIcon,
  Business as DepartmentIcon,
  Group as UsersIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  // Safe date formatter
  const formatDate = (timestamp) => {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      if (timestamp instanceof Date) return timestamp;
      if (timestamp) return new Date(timestamp);
      return new Date();
    } catch (error) {
      return new Date();
    }
  };

  // Initialize sample data
  useEffect(() => {
    initializeAnalyticsData();
  }, []);

  const initializeAnalyticsData = () => {
    // Enhanced sample issues data for analytics
    const sampleIssues = [
      {
        id: '1',
        title: 'Pothole on Main Street',
        status: 'Resolved',
        priority: 'High',
        department: 'Roads & Infrastructure',
        reportedBy: 'citizen1@gmail.com',
        reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        address: 'Main Street, Block A',
        responseTime: 3 // days
      },
      {
        id: '2',
        title: 'Broken Street Light',
        status: 'In Progress',
        priority: 'Medium',
        department: 'Electrical & Street Lighting',
        reportedBy: 'citizen2@gmail.com',
        reportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        address: 'Park Road, Block B',
        responseTime: null
      },
      {
        id: '3',
        title: 'Garbage Collection Delay',
        status: 'Resolved',
        priority: 'Low',
        department: 'Sanitation & Waste Management',
        reportedBy: 'citizen3@gmail.com',
        reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        address: 'Sector 15, Block C',
        responseTime: 6
      },
      {
        id: '4',
        title: 'Water Leakage',
        status: 'Open',
        priority: 'Critical',
        department: 'Water & Drainage',
        reportedBy: 'citizen4@gmail.com',
        reportedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        address: 'Civil Lines, Block D',
        responseTime: null
      },
      {
        id: '5',
        title: 'Tree Cutting Request',
        status: 'In Progress',
        priority: 'Low',
        department: 'Parks & Environment',
        reportedBy: 'citizen5@gmail.com',
        reportedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        address: 'Green Park, Block E',
        responseTime: null
      }
    ];

    // Sample user data
    const sampleUsers = [
      { id: '1', email: 'citizen1@gmail.com', issuesReported: 3, lastActive: new Date() },
      { id: '2', email: 'citizen2@gmail.com', issuesReported: 1, lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { id: '3', email: 'citizen3@gmail.com', issuesReported: 2, lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { id: '4', email: 'citizen4@gmail.com', issuesReported: 1, lastActive: new Date() },
      { id: '5', email: 'citizen5@gmail.com', issuesReported: 1, lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    ];

    setIssues(sampleIssues);
    setUsers(sampleUsers);
    setLoading(false);
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Calculate analytics data
  const getAnalyticsData = () => {
    const now = new Date();
    const daysBack = parseInt(timeRange);
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const filteredIssues = issues.filter(issue => {
      const issueDate = formatDate(issue.reportedAt);
      const departmentMatch = selectedDepartment === 'all' || issue.department === selectedDepartment;
      return issueDate >= cutoffDate && departmentMatch;
    });

    // Daily trends
    const dailyTrends = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString();
      const dayIssues = filteredIssues.filter(issue => {
        const issueDate = formatDate(issue.reportedAt);
        return issueDate.toDateString() === date.toDateString();
      });

      dailyTrends.push({
        date: dateStr,
        reported: dayIssues.length,
        resolved: dayIssues.filter(i => i.status === 'Resolved').length,
        inProgress: dayIssues.filter(i => i.status === 'In Progress').length,
        open: dayIssues.filter(i => i.status === 'Open').length
      });
    }

    // Department performance
    const departments = ['Roads & Infrastructure', 'Electrical & Street Lighting', 'Sanitation & Waste Management', 'Water & Drainage', 'Parks & Environment'];
    const departmentData = departments.map(dept => {
      const deptIssues = filteredIssues.filter(i => i.department === dept);
      const resolved = deptIssues.filter(i => i.status === 'Resolved').length;
      const total = deptIssues.length;
      const avgResponseTime = deptIssues
        .filter(i => i.responseTime !== null)
        .reduce((sum, i) => sum + i.responseTime, 0) / 
        Math.max(1, deptIssues.filter(i => i.responseTime !== null).length);

      return {
        department: dept.split('&')[0].trim(),
        total: total,
        resolved: resolved,
        resolveRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgResponseTime: Math.round(avgResponseTime) || 0
      };
    });

    // Priority distribution
    const priorities = ['Critical', 'High', 'Medium', 'Low'];
    const priorityData = priorities.map(priority => ({
      name: priority,
      value: filteredIssues.filter(i => i.priority === priority).length,
      fill: priority === 'Critical' ? '#d32f2f' : 
            priority === 'High' ? '#f57c00' :
            priority === 'Medium' ? '#1976d2' : '#388e3c'
    }));

    // Status distribution
    const statusData = [
      { name: 'Open', value: filteredIssues.filter(i => i.status === 'Open').length, fill: '#f44336' },
      { name: 'In Progress', value: filteredIssues.filter(i => i.status === 'In Progress').length, fill: '#ff9800' },
      { name: 'Resolved', value: filteredIssues.filter(i => i.status === 'Resolved').length, fill: '#4caf50' }
    ];

    // Top reporters
    const reporterCounts = {};
    filteredIssues.forEach(issue => {
      reporterCounts[issue.reportedBy] = (reporterCounts[issue.reportedBy] || 0) + 1;
    });

    const topReporters = Object.entries(reporterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([email, count]) => ({ email, count }));

    return {
      filteredIssues,
      dailyTrends,
      departmentData,
      priorityData,
      statusData,
      topReporters
    };
  };

  const analytics = getAnalyticsData();

  // Export data to CSV
  const handleExportReport = () => {
    const csvData = [
      ['Date', 'Total Issues', 'Resolved', 'In Progress', 'Open'],
      ...analytics.dailyTrends.map(day => [
        day.date,
        day.reported,
        day.resolved,
        day.inProgress,
        day.open
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jansahyog-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showAlert('Analytics report exported successfully!', 'success');
  };

  // Department color mapping
  const getDepartmentColor = (department) => {
    const colors = {
      'Roads': '#1976d2',
      'Electrical': '#f57c00',
      'Sanitation': '#4caf50',
      'Water': '#2196f3',
      'Parks': '#8bc34a'
    };
    return colors[department] || '#9e9e9e';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography>Loading Analytics...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          📊 Advanced Analytics & Reporting
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
              <MenuItem value="7">Last 7 Days</MenuItem>
              <MenuItem value="30">Last 30 Days</MenuItem>
              <MenuItem value="90">Last 90 Days</MenuItem>
              <MenuItem value="365">Last Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Department</InputLabel>
            <Select value={selectedDepartment} label="Department" onChange={(e) => setSelectedDepartment(e.target.value)}>
              <MenuItem value="all">All Departments</MenuItem>
              <MenuItem value="Roads & Infrastructure">Roads & Infrastructure</MenuItem>
              <MenuItem value="Electrical & Street Lighting">Electrical & Lighting</MenuItem>
              <MenuItem value="Sanitation & Waste Management">Sanitation</MenuItem>
              <MenuItem value="Water & Drainage">Water & Drainage</MenuItem>
              <MenuItem value="Parks & Environment">Parks & Environment</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportReport}
          >
            Export Report
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

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Issues
                  </Typography>
                  <Typography variant="h4" component="h2" color="primary">
                    {analytics.filteredIssues.length}
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    +12% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
                  <ReportIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Resolution Rate
                  </Typography>
                  <Typography variant="h4" component="h2" color="success.main">
                    {Math.round((analytics.filteredIssues.filter(i => i.status === 'Resolved').length / Math.max(1, analytics.filteredIssues.length)) * 100)}%
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    +8% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50', width: 56, height: 56 }}>
                  <TrendingUpIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Response Time
                  </Typography>
                  <Typography variant="h4" component="h2" color="warning.main">
                    {Math.round(analytics.filteredIssues
                      .filter(i => i.responseTime)
                      .reduce((sum, i) => sum + i.responseTime, 0) / 
                      Math.max(1, analytics.filteredIssues.filter(i => i.responseTime).length)) || 0} Days
                  </Typography>
                  <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                    -2% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800', width: 56, height: 56 }}>
                  <TimeIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Citizens
                  </Typography>
                  <Typography variant="h4" component="h2" color="secondary">
                    {users.length}
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    +25% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#dc004e', width: 56, height: 56 }}>
                  <UsersIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different analytics views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Trends & Overview" />
          <Tab label="Department Performance" />
          <Tab label="Citizen Engagement" />
          <Tab label="Geographic Analysis" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Daily Trends Chart */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Daily Issue Trends
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={analytics.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reported" fill="#1976d2" name="Reported" />
                  <Line type="monotone" dataKey="resolved" stroke="#4caf50" name="Resolved" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Status Distribution */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Issue Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Priority Distribution */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Issue Priority Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.priorityData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2">
                    {analytics.priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Department Performance Table */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Department Performance Analysis
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="center">Total Issues</TableCell>
                      <TableCell align="center">Resolved</TableCell>
                      <TableCell align="center">Success Rate</TableCell>
                      <TableCell align="center">Avg Response Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.departmentData.map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ 
                              bgcolor: getDepartmentColor(dept.department), 
                              width: 32, 
                              height: 32 
                            }}>
                              <DepartmentIcon fontSize="small" />
                            </Avatar>
                            {dept.department}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={dept.total} color="primary" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={dept.resolved} color="success" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Box>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              {dept.resolveRate}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={dept.resolveRate}
                              color={dept.resolveRate > 80 ? 'success' : dept.resolveRate > 60 ? 'warning' : 'error'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {dept.avgResponseTime} days
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Department Comparison Chart */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Resolution Rate Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RadialBarChart data={analytics.departmentData}>
                  <RadialBar
                    dataKey="resolveRate"
                    cornerRadius={10}
                    fill="#1976d2"
                  />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Top Reporters */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Citizen Reporters
              </Typography>
              <Stack spacing={2}>
                {analytics.topReporters.map((reporter, index) => (
                  <Box key={reporter.email} display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: index < 3 ? '#ffd700' : '#1976d2' }}>
                        {index + 1}
                      </Avatar>
                      <Typography variant="body1">
                        {reporter.email}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`${reporter.count} issues`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>

          {/* Engagement Trends */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Citizen Engagement Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="reported" 
                    stroke="#1976d2" 
                    fill="#1976d2" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* Geographic Distribution */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Geographic Issue Distribution
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Issues by locality/area (simulation - would integrate with mapping service)
              </Typography>
              
              {/* Mock geographic data */}
              <Grid container spacing={2}>
                {['Block A', 'Block B', 'Block C', 'Block D', 'Block E'].map((block, index) => {
                  const issues = Math.floor(Math.random() * 10) + 1;
                  const resolved = Math.floor(issues * (0.6 + Math.random() * 0.3));
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={block}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <LocationIcon color="primary" />
                            <Typography variant="h6">{block}</Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            Total Issues: {issues}
                          </Typography>
                          <Typography variant="body2" color="success.main">
                            Resolved: {resolved}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(resolved / issues) * 100}
                            sx={{ mt: 1 }}
                            color="success"
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsPage;
