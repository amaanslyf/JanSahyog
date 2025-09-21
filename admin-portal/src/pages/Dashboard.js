// src/pages/Dashboard.js - COMPLETELY DYNAMIC (NO HARDCODED DATA)
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
} from '@mui/material';
import {
  ReportProblem as IssuesIcon,
  CheckCircle as ResolvedIcon,
  HourglassEmpty as PendingIcon,
  TrendingUp as TrendIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Group as UsersIcon,
  Timeline as ActivityIcon,
} from '@mui/icons-material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line 
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

const Dashboard = () => {
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [previousMonthStats, setPreviousMonthStats] = useState({});
  const [loading, setLoading] = useState(true);

  // FIXED: Safe date formatting function
  const formatDate = (timestamp) => {
    try {
      // Handle Firestore Timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      // Handle JavaScript Date
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      // Handle string dates
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date)) {
          return date.toLocaleDateString();
        }
      }
      // Fallback
      return 'Unknown Date';
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  // FIXED: Safe date for chart formatting
  const getDateForChart = (timestamp) => {
    try {
      let date;
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      if (!isNaN(date)) {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      return null;
    } catch (error) {
      console.error('Chart date formatting error:', error);
      return null;
    }
  };

  // Load all data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load current issues
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
            reportedAt: data.reportedAt || new Date()
          });
        });
        setIssues(issuesList);
      });

      // Load users
      await loadUsers();
      
      // Load previous month stats for comparison
      await loadPreviousMonthStats();

      setLoading(false);

      return () => {
        unsubscribeIssues();
      };

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  // Load users data
  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersList = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          ...userData,
          createdAt: userData.createdAt || new Date(),
          lastActive: userData.lastActive || new Date()
        });
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Load previous month statistics for percentage calculations
  const loadPreviousMonthStats = async () => {
    try {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get last month's issues
      const lastMonthQuery = query(
        collection(db, 'civicIssues'),
        where('reportedAt', '>=', Timestamp.fromDate(firstDayLastMonth)),
        where('reportedAt', '<=', Timestamp.fromDate(lastDayLastMonth))
      );

      const lastMonthSnapshot = await getDocs(lastMonthQuery);
      const lastMonthIssues = [];
      lastMonthSnapshot.forEach((doc) => {
        lastMonthIssues.push({ id: doc.id, ...doc.data() });
      });

      // Get this month's issues
      const thisMonthQuery = query(
        collection(db, 'civicIssues'),
        where('reportedAt', '>=', Timestamp.fromDate(firstDayThisMonth))
      );

      const thisMonthSnapshot = await getDocs(thisMonthQuery);
      const thisMonthIssues = [];
      thisMonthSnapshot.forEach((doc) => {
        thisMonthIssues.push({ id: doc.id, ...doc.data() });
      });

      // Calculate stats
      const lastMonthStats = {
        total: lastMonthIssues.length,
        open: lastMonthIssues.filter(i => i.status === 'Open').length,
        inProgress: lastMonthIssues.filter(i => i.status === 'In Progress').length,
        resolved: lastMonthIssues.filter(i => i.status === 'Resolved').length,
      };

      const thisMonthStats = {
        total: thisMonthIssues.length,
        open: thisMonthIssues.filter(i => i.status === 'Open').length,
        inProgress: thisMonthIssues.filter(i => i.status === 'In Progress').length,
        resolved: thisMonthIssues.filter(i => i.status === 'Resolved').length,
      };

      // Calculate percentage changes
      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setPreviousMonthStats({
        totalChange: calculateChange(thisMonthStats.total, lastMonthStats.total),
        openChange: calculateChange(thisMonthStats.open, lastMonthStats.open),
        inProgressChange: calculateChange(thisMonthStats.inProgress, lastMonthStats.inProgress),
        resolvedChange: calculateChange(thisMonthStats.resolved, lastMonthStats.resolved),
      });

    } catch (error) {
      console.error('Error calculating month-over-month changes:', error);
      setPreviousMonthStats({
        totalChange: 0,
        openChange: 0,
        inProgressChange: 0,
        resolvedChange: 0,
      });
    }
  };

  // Calculate current statistics
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter(issue => issue.status === 'Resolved').length;
  const openIssues = issues.filter(issue => issue.status === 'Open').length;
  const inProgressIssues = issues.filter(issue => issue.status === 'In Progress').length;
  
  // User statistics
  const totalUsers = users.length;
  const mobileUsers = users.filter(user => user.source === 'mobile_app').length;
  const adminUsers = users.filter(user => user.role === 'admin').length;

  // Prepare chart data using REAL categories from database
  const statusData = [
    { name: 'Open', value: openIssues, color: '#f44336' },
    { name: 'In Progress', value: inProgressIssues, color: '#ff9800' },
    { name: 'Resolved', value: resolvedIssues, color: '#4caf50' },
  ].filter(item => item.value > 0); // Only show categories with data

  // FIXED: Use real category data from database instead of keyword matching
  const typeData = () => {
    const categories = {};
    issues.forEach(issue => {
      const category = issue.category || 'Other';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  // FIXED: Monthly trend data with safe date handling
  const monthlyData = () => {
    const months = {};
    issues.forEach(issue => {
      const monthStr = getDateForChart(issue.reportedAt);
      if (monthStr) {
        months[monthStr] = (months[monthStr] || 0) + 1;
      }
    });
    
    return Object.entries(months)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-6) // Last 6 months
      .map(([month, count]) => ({ month, count }));
  };

  // FIXED: Priority distribution using real data
  const priorityData = () => {
    const priorities = {};
    issues.forEach(issue => {
      const priority = issue.priority || 'Medium';
      priorities[priority] = (priorities[priority] || 0) + 1;
    });
    
    return Object.entries(priorities).map(([name, value]) => ({ 
      name, 
      value, 
      color: getPriorityColor(name) 
    }));
  };

  const StatCard = ({ title, value, icon, color, change, subtitle }) => (
    <Card elevation={3}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h3" component="h2" sx={{ color: color, fontWeight: 'bold' }}>
              {loading ? <CircularProgress size={24} /> : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {change !== undefined && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: change > 0 ? '#4caf50' : change < 0 ? '#f44336' : '#9e9e9e',
                  mt: 1,
                  fontWeight: 'bold'
                }}
              >
                {change > 0 ? '+' : ''}{change}% vs last month
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return '#f44336';
      case 'In Progress': return '#ff9800';
      case 'Resolved': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#d32f2f';
      case 'High': return '#f57c00';
      case 'Medium': return '#1976d2';
      case 'Low': return '#388e3c';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={50} />
        <Typography ml={2}>Loading Dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        🏛️ JanSahyog Dashboard
      </Typography>
      
      {/* Statistics Cards - ALL DYNAMIC */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Issues"
            value={totalIssues}
            icon={<IssuesIcon />}
            color="#1976d2"
            change={previousMonthStats.totalChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Open Issues"
            value={openIssues}
            icon={<PendingIcon />}
            color="#f44336"
            change={previousMonthStats.openChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="In Progress"
            value={inProgressIssues}
            icon={<TrendIcon />}
            color="#ff9800"
            change={previousMonthStats.inProgressChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Resolved"
            value={resolvedIssues}
            icon={<ResolvedIcon />}
            color="#4caf50"
            change={previousMonthStats.resolvedChange}
          />
        </Grid>
      </Grid>

      {/* Additional User Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Users"
            value={totalUsers}
            icon={<UsersIcon />}
            color="#9c27b0"
            subtitle="Registered users"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Mobile Users"
            value={mobileUsers}
            icon={<PersonIcon />}
            color="#00bcd4"
            subtitle="Active citizens"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Admin Users"
            value={adminUsers}
            icon={<ActivityIcon />}
            color="#ff5722"
            subtitle="System administrators"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={3}>
        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Issue Status Distribution</Typography>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="textSecondary">No data to display</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Priority Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Priority Distribution</Typography>
            {priorityData().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityData().map((entry, index) => (
                      <Cell key={`priority-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="textSecondary">No priority data to display</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Real Issue Categories from Database */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Issue Categories</Typography>
            {typeData().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="textSecondary">No category data to display</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Monthly Trend */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Monthly Issue Trend</Typography>
            {monthlyData().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#1976d2" 
                    strokeWidth={3}
                    dot={{ fill: '#1976d2', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="textSecondary">No trend data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Issues */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Recent Issues</Typography>
        {issues.length > 0 ? (
          <List>
            {issues.slice(0, 8).map((issue) => (
              <ListItem key={issue.id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {issue.title || 'Untitled Issue'}
                      </Typography>
                      <Chip 
                        label={issue.status || 'Unknown'} 
                        size="small" 
                        sx={{ 
                          bgcolor: getStatusColor(issue.status),
                          color: 'white',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Chip 
                        label={issue.priority || 'Medium'} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: getPriorityColor(issue.priority),
                          color: getPriorityColor(issue.priority)
                        }} 
                      />
                      <Chip 
                        label={issue.category || 'Other'} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box mt={1}>
                      <Typography variant="body2" color="textSecondary">
                        {issue.description || 'No description available'}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            {issue.location?.address || 'Location unknown'}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            {issue.reportedBy || 'Anonymous'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {formatDate(issue.reportedAt)}
                        </Typography>
                        {issue.assignedDepartment && (
                          <Typography variant="caption" color="primary">
                            Dept: {issue.assignedDepartment}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Typography variant="h6" color="textSecondary">
              No issues reported yet. Everything looks good! 🎉
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
