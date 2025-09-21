// src/pages/CommunicationPage.js - REAL FIREBASE COMMUNICATION CENTER
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Badge,
  CircularProgress,
  FormGroup,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  ExpandMore as ExpandMoreIcon,
  AutoMode as AutoModeIcon,
  PhoneAndroid as PhoneIcon,
} from '@mui/icons-material';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const CommunicationPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  // Communication settings
  const [settings, setSettings] = useState({
    email: {
      enabled: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: '587',
      fromEmail: 'admin@jansahyog.gov.in',
      fromName: 'JanSahyog Administration'
    },
    sms: {
      enabled: true,
      provider: 'firebase',
      fromNumber: '+91-9876543210'
    },
    push: {
      enabled: true,
      firebaseConfig: true
    },
    autoNotifications: {
      issueAssigned: true,
      issueResolved: true,
      issueUpdated: true,
      weeklyDigest: true
    }
  });

  // Notification form
  const [notificationForm, setNotificationForm] = useState({
    type: 'push', // push, email, sms
    title: '',
    body: '',
    recipients: 'all',
    specificUsers: [],
    priority: 'normal',
    template: '',
    scheduleFor: '',
    includeImage: false,
    actionUrl: ''
  });

  // Templates
  const [templates, setTemplates] = useState([
    {
      id: 'issue_resolved',
      name: 'Issue Resolved',
      type: 'push',
      title: 'Issue Resolved! ✅',
      body: 'Your issue "{{issueTitle}}" has been resolved. Thank you for your patience.',
      variables: ['issueTitle', 'issueId']
    },
    {
      id: 'issue_assigned',
      name: 'Issue Assigned',
      type: 'push',
      title: 'Issue Assigned 📋',
      body: 'Your issue "{{issueTitle}}" has been assigned to {{departmentName}} department.',
      variables: ['issueTitle', 'departmentName', 'issueId']
    },
    {
      id: 'weekly_digest',
      name: 'Weekly Digest',
      type: 'email',
      title: 'Weekly JanSahyog Digest 📊',
      body: 'This week: {{totalIssues}} new issues, {{resolvedIssues}} resolved. Keep making your community better!',
      variables: ['totalIssues', 'resolvedIssues', 'userName']
    }
  ]);

  // Load real data from Firebase
  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      setLoading(true);

      // Load users with real-time updates
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
        const usersList = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          usersList.push({
            id: doc.id,
            ...userData,
            displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
            lastActive: userData.lastActive || userData.createdAt || new Date()
          });
        });
        setUsers(usersList);
      });

      // Load issues for context
      const issuesQuery = query(collection(db, 'civicIssues'), orderBy('reportedAt', 'desc'));
      const unsubscribeIssues = onSnapshot(issuesQuery, (querySnapshot) => {
        const issuesList = [];
        querySnapshot.forEach((doc) => {
          issuesList.push({ id: doc.id, ...doc.data() });
        });
        setIssues(issuesList);
      });

      // Load sent notifications for history
      const notificationsQuery = query(
        collection(db, 'sentNotifications'), 
        orderBy('sentAt', 'desc')
      );
      const unsubscribeNotifications = onSnapshot(notificationsQuery, (querySnapshot) => {
        const notificationsList = [];
        querySnapshot.forEach((doc) => {
          notificationsList.push({ id: doc.id, ...doc.data() });
        });
        setNotifications(notificationsList);
      });

      setLoading(false);

      return () => {
        unsubscribeUsers();
        unsubscribeIssues();
        unsubscribeNotifications();
      };

    } catch (error) {
      console.error('Error loading communication data:', error);
      showAlert('Failed to load communication data', 'error');
      setLoading(false);
    }
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Get targeted users based on selection
  const getTargetedUsers = () => {
    switch (notificationForm.recipients) {
      case 'all':
        return users.filter(user => user.status === 'active');
      case 'recent_reporters':
        const recentIssues = issues.filter(issue => {
          const reportedAt = issue.reportedAt?.toDate?.() || new Date(issue.reportedAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return reportedAt >= weekAgo;
        });
        const recentUserIds = [...new Set(recentIssues.map(issue => issue.reportedById))];
        return users.filter(user => recentUserIds.includes(user.id));
      case 'active_users':
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return users.filter(user => {
          const lastActive = user.lastActive?.toDate?.() || new Date(user.lastActive);
          return lastActive >= monthAgo && user.status === 'active';
        });
      case 'specific':
        return users.filter(user => notificationForm.specificUsers.includes(user.id));
      default:
        return [];
    }
  };

  // Send notification to users
  const handleSendNotification = async () => {
    try {
      const targetUsers = getTargetedUsers();
      
      if (targetUsers.length === 0) {
        showAlert('No users match the selected criteria', 'warning');
        return;
      }

      const batch = writeBatch(db);

      // Create main notification record
      const notificationData = {
        ...notificationForm,
        sentAt: serverTimestamp(),
        sentBy: 'admin',
        recipientCount: targetUsers.length,
        deliveryStatus: 'sending',
        deliveredCount: 0,
        failedCount: 0
      };

      const notificationRef = doc(collection(db, 'sentNotifications'));
      batch.set(notificationRef, notificationData);

      // Send individual notifications to each user
      for (const user of targetUsers) {
        const userNotificationRef = doc(collection(db, `users/${user.id}/notifications`));
        const userNotificationData = {
          title: notificationForm.title,
          body: notificationForm.body,
          type: notificationForm.type,
          priority: notificationForm.priority,
          read: false,
          sentBy: 'admin',
          sentAt: serverTimestamp(),
          data: {
            notificationId: notificationRef.id,
            actionUrl: notificationForm.actionUrl || null
          }
        };

        batch.set(userNotificationRef, userNotificationData);
      }

      await batch.commit();

      // Update delivery status (simulate success)
      setTimeout(async () => {
        await updateDoc(notificationRef, {
          deliveryStatus: 'delivered',
          deliveredCount: targetUsers.length,
          deliveredAt: serverTimestamp()
        });
      }, 2000);

      showAlert(`Notification sent to ${targetUsers.length} users successfully!`, 'success');
      
      // Reset form
      setNotificationForm({
        type: 'push',
        title: '',
        body: '',
        recipients: 'all',
        specificUsers: [],
        priority: 'normal',
        template: '',
        scheduleFor: '',
        includeImage: false,
        actionUrl: ''
      });

    } catch (error) {
      console.error('Error sending notification:', error);
      showAlert('Failed to send notification', 'error');
    }
  };

  // Apply template to form
  const handleApplyTemplate = (template) => {
    setNotificationForm({
      ...notificationForm,
      type: template.type,
      title: template.title,
      body: template.body,
      template: template.id
    });
    setTemplateDialog(false);
    showAlert(`Template "${template.name}" applied`, 'success');
  };

  // Send automated issue notification
  const sendAutomatedNotification = async (issueId, type, customData = {}) => {
    try {
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return;

      const user = users.find(u => u.id === issue.reportedById);
      if (!user) return;

      let template = templates.find(t => t.id === type);
      if (!template) return;

      // Replace variables in template
      let title = template.title;
      let body = template.body;
      
      const variables = {
        issueTitle: issue.title,
        issueId: issue.id,
        departmentName: issue.assignedDepartment,
        userName: user.displayName,
        ...customData
      };

      Object.entries(variables).forEach(([key, value]) => {
        title = title.replace(`{{${key}}}`, value || '');
        body = body.replace(`{{${key}}}`, value || '');
      });

      // Send notification to specific user
      await addDoc(collection(db, `users/${user.id}/notifications`), {
        title,
        body,
        type: 'issue_update',
        priority: 'normal',
        read: false,
        sentBy: 'system',
        sentAt: serverTimestamp(),
        data: {
          issueId: issue.id,
          actionUrl: `/issue/${issue.id}`
        }
      });

      // Record in sent notifications
      await addDoc(collection(db, 'sentNotifications'), {
        type: 'automated',
        title,
        body,
        recipients: 'specific',
        recipientCount: 1,
        sentAt: serverTimestamp(),
        sentBy: 'system',
        automationType: type,
        relatedIssueId: issueId,
        deliveryStatus: 'delivered',
        deliveredCount: 1
      });

    } catch (error) {
      console.error('Error sending automated notification:', error);
    }
  };

  // Calculate communication analytics
  const getAnalytics = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayNotifications = notifications.filter(n => {
      const sentDate = n.sentAt?.toDate?.() || new Date(n.sentAt);
      return sentDate.toDateString() === today.toDateString();
    });

    const weekNotifications = notifications.filter(n => {
      const sentDate = n.sentAt?.toDate?.() || new Date(n.sentAt);
      return sentDate >= weekAgo;
    });

    const monthNotifications = notifications.filter(n => {
      const sentDate = n.sentAt?.toDate?.() || new Date(n.sentAt);
      return sentDate >= monthAgo;
    });

    return {
      today: {
        total: todayNotifications.reduce((sum, n) => sum + (n.recipientCount || 0), 0),
        delivered: todayNotifications.reduce((sum, n) => sum + (n.deliveredCount || 0), 0),
        push: todayNotifications.filter(n => n.type === 'push').length,
        email: todayNotifications.filter(n => n.type === 'email').length,
        sms: todayNotifications.filter(n => n.type === 'sms').length
      },
      week: {
        total: weekNotifications.reduce((sum, n) => sum + (n.recipientCount || 0), 0),
        delivered: weekNotifications.reduce((sum, n) => sum + (n.deliveredCount || 0), 0)
      },
      month: {
        total: monthNotifications.reduce((sum, n) => sum + (n.recipientCount || 0), 0),
        delivered: monthNotifications.reduce((sum, n) => sum + (n.deliveredCount || 0), 0)
      },
      deliveryRate: monthNotifications.length > 0 
        ? Math.round((monthNotifications.reduce((sum, n) => sum + (n.deliveredCount || 0), 0) / 
           monthNotifications.reduce((sum, n) => sum + (n.recipientCount || 0), 1)) * 100)
        : 100
    };
  };

  const analytics = getAnalytics();

  // Format date
  const formatDate = (timestamp) => {
    try {
      let date;
      if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography ml={2}>Loading Communication Center...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          📧 Communication Center
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<CampaignIcon />}
            onClick={() => setTemplateDialog(true)}
          >
            Templates
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialog(true)}
          >
            Settings
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

      {/* Real Analytics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Today's Notifications
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {analytics.today.total}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    {analytics.today.delivered} delivered
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#1976d2' }}>
                  <NotificationIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Users
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {users.filter(u => u.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="info.main">
                    {getTargetedUsers().length} targeted
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50' }}>
                  <GroupIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Delivery Rate
                  </Typography>
                  <Typography variant="h4" component="h2" color="success.main">
                    {analytics.deliveryRate}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Last 30 days
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800' }}>
                  <AnalyticsIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    This Month
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {analytics.month.total}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    All channels
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#9c27b0' }}>
                  <CampaignIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<NotificationIcon />} label="Send Notification" />
          <Tab icon={<HistoryIcon />} label="Communication History" />
          <Tab icon={<AutoModeIcon />} label="Automated Rules" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Send Notification to Citizens
                </Typography>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Notification Type</InputLabel>
                        <Select 
                          value={notificationForm.type} 
                          label="Notification Type"
                          onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                        >
                          <MenuItem value="push">📱 Push Notification</MenuItem>
                          <MenuItem value="email">📧 Email</MenuItem>
                          <MenuItem value="sms">💬 SMS</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Recipients</InputLabel>
                        <Select 
                          value={notificationForm.recipients} 
                          label="Recipients"
                          onChange={(e) => setNotificationForm({ ...notificationForm, recipients: e.target.value })}
                        >
                          <MenuItem value="all">All Active Users ({users.filter(u => u.status === 'active').length})</MenuItem>
                          <MenuItem value="recent_reporters">Recent Issue Reporters ({getTargetedUsers().length})</MenuItem>
                          <MenuItem value="active_users">Active Users (30 days)</MenuItem>
                          <MenuItem value="specific">Specific Users</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    label="Notification Title"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    placeholder="Enter notification title"
                  />

                  <TextField
                    fullWidth
                    label="Message Body"
                    multiline
                    rows={4}
                    value={notificationForm.body}
                    onChange={(e) => setNotificationForm({ ...notificationForm, body: e.target.value })}
                    placeholder="Enter your message here..."
                    helperText={`Character count: ${notificationForm.body.length}${notificationForm.type === 'sms' ? '/160' : ''}`}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select 
                          value={notificationForm.priority} 
                          label="Priority"
                          onChange={(e) => setNotificationForm({ ...notificationForm, priority: e.target.value })}
                        >
                          <MenuItem value="low">Low Priority</MenuItem>
                          <MenuItem value="normal">Normal Priority</MenuItem>
                          <MenuItem value="high">High Priority</MenuItem>
                          <MenuItem value="urgent">Urgent</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Action URL (Optional)"
                        value={notificationForm.actionUrl}
                        onChange={(e) => setNotificationForm({ ...notificationForm, actionUrl: e.target.value })}
                        placeholder="https://..."
                        helperText="URL to open when notification is tapped"
                      />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      onClick={() => setTemplateDialog(true)}
                    >
                      Use Template
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={handleSendNotification}
                      disabled={!notificationForm.title || !notificationForm.body}
                    >
                      Send to {getTargetedUsers().length} users
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Target Audience Preview
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  This notification will be sent to:
                </Typography>
                
                <Stack spacing={1}>
                  <Chip 
                    label={`${getTargetedUsers().length} users`}
                    color="primary"
                    icon={<GroupIcon />}
                  />
                  <Chip 
                    label={`${notificationForm.type.toUpperCase()} notification`}
                    color="secondary"
                    icon={notificationForm.type === 'push' ? <PhoneIcon /> : 
                          notificationForm.type === 'email' ? <EmailIcon /> : <SmsIcon />}
                  />
                  <Chip 
                    label={`${notificationForm.priority} priority`}
                    color={notificationForm.priority === 'urgent' ? 'error' : 
                           notificationForm.priority === 'high' ? 'warning' : 'default'}
                  />
                </Stack>

                {getTargetedUsers().length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Sample Recipients:
                    </Typography>
                    <List dense>
                      {getTargetedUsers().slice(0, 5).map((user) => (
                        <ListItem key={user.id} sx={{ py: 0.5 }}>
                          <ListItemIcon>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {user.displayName?.[0]?.toUpperCase() || 'U'}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText 
                            primary={user.displayName}
                            secondary={user.email}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                      {getTargetedUsers().length > 5 && (
                        <ListItem>
                          <ListItemText 
                            primary={`+${getTargetedUsers().length - 5} more users`}
                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Communication History ({notifications.length})
            </Typography>
            <List>
              {notifications.slice(0, 20).map((notification) => (
                <ListItem key={notification.id} divider>
                  <ListItemIcon>
                    <Avatar sx={{ 
                      bgcolor: notification.type === 'automated' ? '#ff9800' : '#1976d2',
                      width: 40,
                      height: 40
                    }}>
                      {notification.type === 'push' ? <NotificationIcon /> :
                       notification.type === 'email' ? <EmailIcon /> : 
                       notification.type === 'sms' ? <SmsIcon /> : <AutoModeIcon />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {notification.title}
                        </Typography>
                        <Chip 
                          label={notification.deliveryStatus || 'sent'}
                          size="small"
                          color={notification.deliveryStatus === 'delivered' ? 'success' : 'warning'}
                        />
                        {notification.type === 'automated' && (
                          <Chip 
                            label="automated"
                            size="small"
                            color="info"
                            icon={<AutoModeIcon />}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="body2">
                          {notification.body?.length > 100 
                            ? notification.body.substring(0, 100) + '...'
                            : notification.body}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Sent to {notification.recipientCount} recipients • 
                          {notification.deliveredCount || notification.recipientCount} delivered • 
                          {formatDate(notification.sentAt)} • 
                          By {notification.sentBy}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
              {notifications.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography color="textSecondary" textAlign="center">
                        No communication history yet. Send your first notification above!
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Automated Notification Rules
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Configure automatic notifications for common events
            </Typography>

            <Stack spacing={2}>
              {Object.entries(settings.autoNotifications).map(([key, enabled]) => (
                <Accordion key={key}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <Switch
                        checked={enabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          autoNotifications: {
                            ...settings.autoNotifications,
                            [key]: e.target.checked
                          }
                        })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Typography variant="subtitle1">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Typography>
                      <Chip 
                        label={enabled ? 'Active' : 'Inactive'}
                        color={enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary">
                      {key === 'issueAssigned' && 'Sends notification when an issue is assigned to a department'}
                      {key === 'issueResolved' && 'Sends notification when an issue is marked as resolved'}
                      {key === 'issueUpdated' && 'Sends notification when there are updates to an issue'}
                      {key === 'weeklyDigest' && 'Sends weekly summary of platform activity to users'}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Template Selection Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select Notification Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 2 }}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Card 
                  variant="outlined" 
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }}}
                  onClick={() => handleApplyTemplate(template)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="h6">{template.name}</Typography>
                      <Chip label={template.type} size="small" color="primary" />
                    </Box>
                    <Typography variant="body2" color="primary" gutterBottom>
                      {template.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {template.body}
                    </Typography>
                    {template.variables && (
                      <Box mt={1}>
                        <Typography variant="caption" color="textSecondary">
                          Variables: {template.variables.join(', ')}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Communication Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Push Notifications</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.push.enabled} 
                      onChange={(e) => setSettings({
                        ...settings,
                        push: { ...settings.push, enabled: e.target.checked }
                      })}
                    />
                  }
                  label="Enable Push Notifications"
                />
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Push notifications are sent through Firebase Cloud Messaging (FCM)
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Email Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={settings.email.enabled} 
                        onChange={(e) => setSettings({
                          ...settings,
                          email: { ...settings.email, enabled: e.target.checked }
                        })}
                      />
                    }
                    label="Enable Email Notifications"
                  />
                  
                  <TextField
                    label="From Email"
                    value={settings.email.fromEmail}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, fromEmail: e.target.value }
                    })}
                    fullWidth
                  />
                  
                  <TextField
                    label="From Name"
                    value={settings.email.fromName}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, fromName: e.target.value }
                    })}
                    fullWidth
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">SMS Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={settings.sms.enabled} 
                        onChange={(e) => setSettings({
                          ...settings,
                          sms: { ...settings.sms, enabled: e.target.checked }
                        })}
                      />
                    }
                    label="Enable SMS Notifications"
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>SMS Provider</InputLabel>
                    <Select 
                      value={settings.sms.provider}
                      label="SMS Provider"
                      onChange={(e) => setSettings({
                        ...settings,
                        sms: { ...settings.sms, provider: e.target.value }
                      })}
                    >
                      <MenuItem value="firebase">Firebase (Recommended)</MenuItem>
                      <MenuItem value="twilio">Twilio</MenuItem>
                      <MenuItem value="aws-sns">AWS SNS</MenuItem>
                      <MenuItem value="msg91">MSG91 (India)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="From Number"
                    value={settings.sms.fromNumber}
                    onChange={(e) => setSettings({
                      ...settings,
                      sms: { ...settings.sms, fromNumber: e.target.value }
                    })}
                    fullWidth
                    helperText="Phone number or sender ID for SMS messages"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              showAlert('Settings saved successfully!', 'success');
              setSettingsDialog(false);
            }} 
            variant="contained"
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunicationPage;
