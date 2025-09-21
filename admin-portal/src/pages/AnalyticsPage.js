// src/pages/AnalyticsPage.js - REAL FIREBASE ANALYTICS DASHBOARD
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
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportIcon,
  Schedule as TimeIcon,
  LocationOn as LocationIcon,
  Business as DepartmentIcon,
  Group as UsersIcon,
  Refresh as RefreshIcon,
  CalendarToday as DateIcon,
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
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [previousPeriodData, setPreviousPeriodData] = useState(null);
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

  // Load all real data from Firebase
  useEffect(() => {
    loadRealAnalyticsData();
  }, [timeRange, selectedDepartment]);

  const loadRealAnalyticsData = async () => {
    try {
      setLoading(true);

      // Load issues with real-time updates
      const issuesQuery = query(
        collection(db, 'civicIssues'),
        orderBy('reportedAt', 'desc')
      );

      const unsubscribeIssues = onSnapshot(issuesQuery, async (querySnapshot) => {
        const issuesList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          issuesList.push({
            id: doc.id,
            ...data,
            reportedAt: data.reportedAt || new Date(),
            lastUpdated: data.lastUpdated || data.reportedAt || new Date(),
            responseTime: calculateResponseTime(data)
          });
        });
        setIssues(issuesList);

        // Calculate analytics after issues are loaded
        const analyticsData = await calculateAnalytics(issuesList);
        setAnalytics(analyticsData);
        
        // Calculate previous period for comparison
        const prevData = await calculatePreviousPeriodData(issuesList);
        setPreviousPeriodData(prevData);
        
        setLoading(false);
      });

      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          ...userData,
          createdAt: userData.createdAt || new Date(),
          lastActive: userData.lastActive || userData.createdAt || new Date()
        });
      });
      setUsers(usersList);

      // Load departments
      const deptSnapshot = await getDocs(collection(db, 'departments'));
      const deptList = [];
      deptSnapshot.forEach((doc) => {
        deptList.push({ id: doc.id, ...doc.data() });
      });
      setDepartments(deptList);

      return () => {
        unsubscribeIssues();
      };

    } catch (error) {
      console.error('Error loading analytics data:', error);
      showAlert('Failed to load analytics data', 'error');
      setLoading(false);
    }
  };

  // Calculate response time for an issue
  const calculateResponseTime = (issueData) => {
    if (!issueData.lastUpdated || !issueData.reportedAt || issueData.status === 'Open') {
      return null;
    }

    const reported = formatDate(issueData.reportedAt);
    const updated = formatDate(issueData.lastUpdated);
    const diffTime = Math.abs(updated - reported);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Calculate comprehensive analytics from real data
  const calculateAnalytics = async (issuesList) => {
    const now = new Date();
    const daysBack = parseInt(timeRange);
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Filter issues by time range and department
    const filteredIssues = issuesList.filter(issue => {
      const issueDate = formatDate(issue.reportedAt);
      const departmentMatch = selectedDepartment === 'all' || issue.assignedDepartment === selectedDepartment;
      return issueDate >= cutoffDate && departmentMatch;
    });

    // Daily trends
    const dailyTrends = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayIssues = filteredIssues.filter(issue => {
        const issueDate = formatDate(issue.reportedAt);
        return issueDate.toDateString() === date.toDateString();
      });

      const resolved = dayIssues.filter(i => i.status === 'Resolved');
      const inProgress = dayIssues.filter(i => i.status === 'In Progress');
      const open = dayIssues.filter(i => i.status === 'Open');

      dailyTrends.push({
        date: dateStr,
        reported: dayIssues.length,
        resolved: resolved.length,
        inProgress: inProgress.length,
        open: open.length,
        cumulative: filteredIssues.filter(i => formatDate(i.reportedAt) <= date).length
      });
    }

    // Department performance with real data
    const departmentNames = [...new Set(filteredIssues.map(i => i.assignedDepartment).filter(Boolean))];
    const departmentData = await Promise.all(
      departmentNames.map(async (deptName) => {
        const deptIssues = filteredIssues.filter(i => i.assignedDepartment === deptName);
        const resolved = deptIssues.filter(i => i.status === 'Resolved');
        const total = deptIssues.length;
        
        // Calculate average response time
        const responseTimes = deptIssues
          .map(i => i.responseTime)
          .filter(time => time !== null && time !== undefined);
        
        const avgResponseTime = responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
          : 0;

        // Get user satisfaction (mock for now, would come from ratings)
        const satisfaction = Math.round(70 + Math.random() * 25); // 70-95%

        return {
          department: deptName,
          shortName: deptName?.split('&')[0]?.trim() || deptName?.substring(0, 10) || 'Unknown',
          total,
          resolved: resolved.length,
          open: deptIssues.filter(i => i.status === 'Open').length,
          inProgress: deptIssues.filter(i => i.status === 'In Progress').length,
          resolveRate: total > 0 ? Math.round((resolved.length / total) * 100) : 0,
          avgResponseTime,
          satisfaction
        };
      })
    );

    // Priority distribution from real data
    const priorityData = ['Critical', 'High', 'Medium', 'Low'].map(priority => ({
      name: priority,
      value: filteredIssues.filter(i => i.priority === priority).length,
      fill: priority === 'Critical' ? '#d32f2f' : 
            priority === 'High' ? '#f57c00' :
            priority === 'Medium' ? '#1976d2' : '#388e3c'
    })).filter(item => item.value > 0);

    // Status distribution from real data
    const statusData = [
      { name: 'Open', value: filteredIssues.filter(i => i.status === 'Open').length, fill: '#f44336' },
      { name: 'In Progress', value: filteredIssues.filter(i => i.status === 'In Progress').length, fill: '#ff9800' },
      { name: 'Resolved', value: filteredIssues.filter(i => i.status === 'Resolved').length, fill: '#4caf50' }
    ].filter(item => item.value > 0);

    // Category distribution from real data
    const categoryData = {};
    filteredIssues.forEach(issue => {
      const category = issue.category || 'Other';
      categoryData[category] = (categoryData[category] || 0) + 1;
    });

    const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Top reporters from real data
    const reporterCounts = {};
    filteredIssues.forEach(issue => {
      const reporter = issue.reportedBy || 'Anonymous';
      reporterCounts[reporter] = (reporterCounts[reporter] || 0) + 1;
    });

    const topReporters = Object.entries(reporterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([email, count]) => ({ 
        email: email.length > 25 ? email.substring(0, 25) + '...' : email, 
        fullEmail: email,
        count 
      }));

    // Geographic distribution from real data
    const locationCounts = {};
    filteredIssues.forEach(issue => {
      const location = issue.location?.address || issue.address || 'Unknown Location';
      // Extract area/block from address
      const area = extractAreaFromAddress(location);
      locationCounts[area] = (locationCounts[area] || 0) + 1;
    });

    const geographicData = Object.entries(locationCounts)
      .map(([area, total]) => {
        const areaIssues = filteredIssues.filter(issue => {
          const location = issue.location?.address || issue.address || 'Unknown Location';
          return extractAreaFromAddress(location) === area;
        });
        const resolved = areaIssues.filter(i => i.status === 'Resolved').length;
        
        return {
          area,
          total,
          resolved,
          open: areaIssues.filter(i => i.status === 'Open').length,
          resolveRate: total > 0 ? Math.round((resolved / total) * 100) : 0
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // User engagement analytics
    const activeUsers = users.filter(user => {
      const lastActive = formatDate(user.lastActive);
      return lastActive >= cutoffDate;
    }).length;

    const newUsers = users.filter(user => {
      const joinDate = formatDate(user.createdAt);
      return joinDate >= cutoffDate;
    }).length;

    return {
      filteredIssues,
      dailyTrends,
      departmentData: departmentData.sort((a, b) => b.total - a.total),
      priorityData,
      statusData,
      categoryChartData,
      topReporters,
      geographicData,
      totalIssues: filteredIssues.length,
      resolvedIssues: filteredIssues.filter(i => i.status === 'Resolved').length,
      avgResponseTime: calculateAverageResponseTime(filteredIssues),
      activeUsers,
      newUsers,
      resolutionRate: filteredIssues.length > 0 
        ? Math.round((filteredIssues.filter(i => i.status === 'Resolved').length / filteredIssues.length) * 100)
        : 0
    };
  };

  // Extract area from address string
  const extractAreaFromAddress = (address) => {
    if (!address) return 'Unknown Area';
    
    // Look for common area indicators
    const patterns = [
      /Block [A-Z]/gi,
      /Sector \d+/gi,
      /Phase \d+/gi,
      /Area \d+/gi,
      /Zone \d+/gi
    ];

    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) {
        return match[0];
      }
    }

    // Fallback to first part of address
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown Area';
  };

  // Calculate average response time
  const calculateAverageResponseTime = (issuesList) => {
    const responseTimes = issuesList
      .map(i => i.responseTime)
      .filter(time => time !== null && time !== undefined && time > 0);
    
    if (responseTimes.length === 0) return 0;
    
    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  };

  // Calculate previous period data for comparison
  const calculatePreviousPeriodData = async (issuesList) => {
    const daysBack = parseInt(timeRange);
    const previousStart = new Date(Date.now() - (2 * daysBack) * 24 * 60 * 60 * 1000);
    const previousEnd = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const previousIssues = issuesList.filter(issue => {
      const issueDate = formatDate(issue.reportedAt);
      return issueDate >= previousStart && issueDate < previousEnd;
    });

    return {
      totalIssues: previousIssues.length,
      resolvedIssues: previousIssues.filter(i => i.status === 'Resolved').length,
      avgResponseTime: calculateAverageResponseTime(previousIssues),
      resolutionRate: previousIssues.length > 0 
        ? Math.round((previousIssues.filter(i => i.status === 'Resolved').length / previousIssues.length) * 100)
        : 0
    };
  };

  // Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Export comprehensive analytics report
  const handleExportReport = () => {
    if (!analytics) return;

    const csvData = [
      ['JanSahyog Analytics Report - ' + new Date().toLocaleDateString()],
      ['Generated on:', new Date().toLocaleString()],
      ['Time Range:', `Last ${timeRange} days`],
      ['Department Filter:', selectedDepartment === 'all' ? 'All Departments' : selectedDepartment],
      [''],
      ['SUMMARY METRICS'],
      ['Total Issues', analytics.totalIssues],
      ['Resolved Issues', analytics.resolvedIssues],
      ['Resolution Rate', `${analytics.resolutionRate}%`],
      ['Average Response Time', `${analytics.avgResponseTime} days`],
      ['Active Users', analytics.activeUsers],
      [''],
      ['DAILY TRENDS'],
      ['Date', 'Reported', 'Resolved', 'In Progress', 'Open'],
      ...analytics.dailyTrends.map(day => [
        day.date, day.reported, day.resolved, day.inProgress, day.open
      ]),
      [''],
      ['DEPARTMENT PERFORMANCE'],
      ['Department', 'Total Issues', 'Resolved', 'Resolution Rate', 'Avg Response Time'],
      ...analytics.departmentData.map(dept => [
        dept.department, dept.total, dept.resolved, `${dept.resolveRate}%`, `${dept.avgResponseTime} days`
      ]),
      [''],
      ['TOP REPORTERS'],
      ['Email', 'Issues Reported'],
      ...analytics.topReporters.map(reporter => [
        reporter.fullEmail, reporter.count
      ])
    ];

    const csvContent = csvData.map(row => 
      Array.isArray(row) ? row.map(field => `"${field}"`).join(',') : `"${row}"`
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jansahyog-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showAlert('Comprehensive analytics report exported successfully!', 'success');
  };

  // Get department color
  const getDepartmentColor = (department) => {
    const colors = [
      '#1976d2', '#f57c00', '#4caf50', '#2196f3', '#8bc34a',
      '#9c27b0', '#ff5722', '#607d8b', '#795548', '#e91e63'
    ];
    const hash = department?.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0) || 0;
    return colors[hash % colors.length];
  };

  if (loading || !analytics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={50} />
        <Typography ml={2}>Loading Analytics Dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          📊 Real-Time Analytics Dashboard
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
              {departments.filter(dept => dept.active).map(dept => (
                <MenuItem key={dept.id} value={dept.name}>{dept.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadRealAnalyticsData()}
          >
            Refresh
          </Button>
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

      {/* Real-Time Key Metrics Cards */}
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
                    {analytics.totalIssues}
                  </Typography>
                  {previousPeriodData && (
                    <Typography variant="body2" sx={{ 
                      mt: 1,
                      color: calculatePercentageChange(analytics.totalIssues, previousPeriodData.totalIssues) >= 0 ? 'success.main' : 'error.main'
                    }}>
                      {calculatePercentageChange(analytics.totalIssues, previousPeriodData.totalIssues) >= 0 ? '+' : ''}
                      {calculatePercentageChange(analytics.totalIssues, previousPeriodData.totalIssues)}% vs previous period
                    </Typography>
                  )}
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
                    {analytics.resolutionRate}%
                  </Typography>
                  {previousPeriodData && (
                    <Typography variant="body2" sx={{ 
                      mt: 1,
                      color: calculatePercentageChange(analytics.resolutionRate, previousPeriodData.resolutionRate) >= 0 ? 'success.main' : 'error.main'
                    }}>
                      {calculatePercentageChange(analytics.resolutionRate, previousPeriodData.resolutionRate) >= 0 ? '+' : ''}
                      {calculatePercentageChange(analytics.resolutionRate, previousPeriodData.resolutionRate)}% vs previous period
                    </Typography>
                  )}
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
                    {analytics.avgResponseTime} Days
                  </Typography>
                  {previousPeriodData && (
                    <Typography variant="body2" sx={{ 
                      mt: 1,
                      color: calculatePercentageChange(analytics.avgResponseTime, previousPeriodData.avgResponseTime) <= 0 ? 'success.main' : 'error.main'
                    }}>
                      {calculatePercentageChange(analytics.avgResponseTime, previousPeriodData.avgResponseTime) >= 0 ? '+' : ''}
                      {calculatePercentageChange(analytics.avgResponseTime, previousPeriodData.avgResponseTime)}% vs previous period
                    </Typography>
                  )}
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
                    {analytics.activeUsers}
                  </Typography>
                  <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
                    +{analytics.newUsers} new users
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

      {/* Real-Time Data Indicator */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Typography variant="body2" color="textSecondary">
              Real-time data • Last updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Box>
          <Typography variant="body2" color="primary">
            Showing data for {selectedDepartment === 'all' ? 'all departments' : selectedDepartment} • Last {timeRange} days
          </Typography>
        </Box>
      </Paper>

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
          {/* Real Daily Trends Chart */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Daily Issue Trends (Real Data)
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
                  <Line type="monotone" dataKey="cumulative" stroke="#ff9800" name="Cumulative" strokeWidth={2} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Real Status Distribution */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Current Status Distribution
              </Typography>
              {analytics.statusData.length > 0 ? (
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
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={350}>
                  <Typography color="textSecondary">No status data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Real Priority Distribution */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Priority Distribution
              </Typography>
              {analytics.priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1976d2">
                      {analytics.priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={250}>
                  <Typography color="textSecondary">No priority data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Real Category Distribution */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Category Distribution
              </Typography>
              {analytics.categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.categoryChartData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={250}>
                  <Typography color="textSecondary">No category data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Real Department Performance Table */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Department Performance Analysis (Real Data)
              </Typography>
              {analytics.departmentData.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Department</TableCell>
                        <TableCell align="center">Total Issues</TableCell>
                        <TableCell align="center">Resolved</TableCell>
                        <TableCell align="center">Open</TableCell>
                        <TableCell align="center">In Progress</TableCell>
                        <TableCell align="center">Resolution Rate</TableCell>
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
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {dept.shortName}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {dept.department}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={dept.total} color="primary" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={dept.resolved} color="success" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={dept.open} color="error" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={dept.inProgress} color="warning" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                                {dept.resolveRate}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={dept.resolveRate}
                                color={dept.resolveRate > 80 ? 'success' : dept.resolveRate > 60 ? 'warning' : 'error'}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {dept.avgResponseTime || 0} days
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography color="textSecondary">
                    No department performance data available for the selected filters
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Department Comparison Chart */}
          {analytics.departmentData.length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Department Resolution Rate Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.departmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shortName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="resolveRate" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Real Top Reporters */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Citizen Reporters (Real Data)
              </Typography>
              {analytics.topReporters.length > 0 ? (
                <Stack spacing={2}>
                  {analytics.topReporters.slice(0, 8).map((reporter, index) => (
                    <Box key={reporter.fullEmail} display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ 
                          bgcolor: index < 3 ? '#ffd700' : '#1976d2',
                          width: 36,
                          height: 36
                        }}>
                          {index + 1}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {reporter.email}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {reporter.fullEmail}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={`${reporter.count} issues`} 
                        color="primary" 
                        size="small" 
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="textSecondary" textAlign="center">
                  No reporter data available
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Real Engagement Trends */}
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
                    name="Issues Reported"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* User Statistics */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Engagement Statistics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {analytics.activeUsers}
                    </Typography>
                    <Typography color="textSecondary">Active Users</Typography>
                    <Typography variant="caption">
                      Last {timeRange} days
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {analytics.newUsers}
                    </Typography>
                    <Typography color="textSecondary">New Signups</Typography>
                    <Typography variant="caption">
                      Last {timeRange} days
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {Math.round(analytics.totalIssues / Math.max(analytics.activeUsers, 1) * 10) / 10}
                    </Typography>
                    <Typography color="textSecondary">Issues per User</Typography>
                    <Typography variant="caption">
                      Average engagement
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary.main">
                      {users.length}
                    </Typography>
                    <Typography color="textSecondary">Total Users</Typography>
                    <Typography variant="caption">
                      Platform-wide
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* Real Geographic Distribution */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Geographic Issue Distribution (Real Data)
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Issues by area/locality extracted from actual reported addresses
              </Typography>
              
              {analytics.geographicData.length > 0 ? (
                <Grid container spacing={2}>
                  {analytics.geographicData.map((area) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={area.area}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <LocationIcon color="primary" />
                            <Typography variant="h6">{area.area}</Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            Total Issues: {area.total}
                          </Typography>
                          <Typography variant="body2" color="success.main">
                            Resolved: {area.resolved}
                          </Typography>
                          <Typography variant="body2" color="error.main">
                            Open: {area.open}
                          </Typography>
                          <Box mt={1}>
                            <Typography variant="caption" color="textSecondary">
                              Resolution Rate: {area.resolveRate}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={area.resolveRate}
                              color={area.resolveRate > 70 ? 'success' : area.resolveRate > 50 ? 'warning' : 'error'}
                              sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography color="textSecondary">
                    No geographic data available for the selected filters
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Geographic Performance Chart */}
          {analytics.geographicData.length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Area-wise Issue Volume
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.geographicData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#1976d2" name="Total Issues" />
                    <Bar dataKey="resolved" fill="#4caf50" name="Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsPage;
