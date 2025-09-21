// src/pages/NotificationsPage.js - REAL FIREBASE INTEGRATION
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
  FormControlLabel,
  Switch,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Paper,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Notifications as NotificationIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  AutoMode as AutoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  where,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [mobileUsers, setMobileUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  const [sendingNotification, setSendingNotification] = useState(false);

  // Manual notification form
  const [manualNotification, setManualNotification] = useState({
    title: '',
    body: '',
    target: 'all',
    priority: 'normal',
    scheduleFor: ''
  });

  // Automation rule form
  const [newRule, setNewRule] = useState({
    trigger: 'issue_assigned',
    condition: '',
    templateId: '',
    enabled: true,
    description: ''
  });

  // Template form
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title: '',
    body: '',
    type: 'info'
  });

  // Load real data from Firebase
  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      setLoading(true);
      
      // Load mobile users with push tokens
      await loadMobileUsers();
      
      // Load notification history
      await loadNotificationHistory();
      
      // Load or create automation rules
      await loadAutomationRules();
      
      // Load or create templates
      await loadNotificationTemplates();
      
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error loading notification data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load mobile users with push tokens
  const loadMobileUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('source', '==', 'mobile_app'),
        where('pushToken', '!=', null)
      );
      
      const snapshot = await getDocs(usersQuery);
      const usersList = [];
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          email: userData.email,
          displayName: userData.displayName || userData.email?.split('@')[0],
          pushToken: userData.pushToken,
          lastActive: userData.lastActive,
          notificationsEnabled: userData.notificationsEnabled !== false
        });
      });
      
      setMobileUsers(usersList);
      console.log(`📱 Loaded ${usersList.length} mobile users with push tokens`);
    } catch (error) {
      console.error('Error loading mobile users:', error);
    }
  };

  // Load notification history
  const loadNotificationHistory = async () => {
    try {
      const notificationRef = collection(db, 'notificationLogs');
      const notificationQuery = query(
        notificationRef,
        orderBy('sentAt', 'desc'),
        limit(50)
      );
      
      const unsubscribe = onSnapshot(notificationQuery, (snapshot) => {
        const notificationsList = [];
        snapshot.forEach((doc) => {
          notificationsList.push({
            id: doc.id,
            ...doc.data(),
            sentAt: doc.data().sentAt?.toDate() || new Date()
          });
        });
        setNotifications(notificationsList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  // Load automation rules
  const loadAutomationRules = async () => {
    try {
      const rulesRef = collection(db, 'automationRules');
      
      // Check if rules exist, if not create default ones
      const rulesSnapshot = await getDocs(rulesRef);
      
      if (rulesSnapshot.empty) {
        await createDefaultAutomationRules();
      }
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(rulesRef, (snapshot) => {
        const rulesList = [];
        snapshot.forEach((doc) => {
          rulesList.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            lastTriggered: doc.data().lastTriggered?.toDate() || null
          });
        });
        setAutomationRules(rulesList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading automation rules:', error);
    }
  };

  // Load notification templates
  const loadNotificationTemplates = async () => {
    try {
      const templatesRef = collection(db, 'notificationTemplates');
      
      // Check if templates exist, if not create default ones
      const templatesSnapshot = await getDocs(templatesRef);
      
      if (templatesSnapshot.empty) {
        await createDefaultTemplates();
      }
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(templatesRef, (snapshot) => {
        const templatesList = [];
        snapshot.forEach((doc) => {
          templatesList.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          });
        });
        setTemplates(templatesList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading notification templates:', error);
    }
  };

  // Create default automation rules
  const createDefaultAutomationRules = async () => {
    const defaultRules = [
      {
        trigger: 'issue_assigned',
        condition: 'assignedDepartment != ""',
        templateId: 'issue_assigned',
        enabled: true,
        description: 'Send notification when issue is assigned to department',
        timesTriggered: 0,
        createdAt: serverTimestamp()
      },
      {
        trigger: 'status_changed',
        condition: 'status == "In Progress"',
        templateId: 'issue_in_progress',
        enabled: true,
        description: 'Send notification when issue status changes to In Progress',
        timesTriggered: 0,
        createdAt: serverTimestamp()
      },
      {
        trigger: 'status_changed',
        condition: 'status == "Resolved"',
        templateId: 'issue_resolved',
        enabled: true,
        description: 'Send notification when issue is resolved',
        timesTriggered: 0,
        createdAt: serverTimestamp()
      },
      {
        trigger: 'priority_changed',
        condition: 'priority == "Critical"',
        templateId: 'issue_escalated',
        enabled: true,
        description: 'Send notification when issue is marked as critical',
        timesTriggered: 0,
        createdAt: serverTimestamp()
      }
    ];

    const rulesRef = collection(db, 'automationRules');
    for (const rule of defaultRules) {
      await addDoc(rulesRef, rule);
    }
  };

  // Create default templates
  const createDefaultTemplates = async () => {
    const defaultTemplates = [
      {
        id: 'issue_assigned',
        name: 'Issue Assigned',
        title: 'Your issue has been assigned! 📋',
        body: 'We have assigned your issue "{title}" to the {assignedDepartment} department. You will receive updates shortly.',
        type: 'success',
        variables: ['title', 'assignedDepartment'],
        createdAt: serverTimestamp()
      },
      {
        id: 'issue_in_progress',
        name: 'Issue In Progress',
        title: 'Work started on your issue! 🚧',
        body: 'Good news! We have started working on your issue "{title}". Expected resolution soon.',
        type: 'info',
        variables: ['title'],
        createdAt: serverTimestamp()
      },
      {
        id: 'issue_resolved',
        name: 'Issue Resolved',
        title: 'Issue resolved! ✅',
        body: 'Great news! Your issue "{title}" has been successfully resolved. Thank you for your patience.',
        type: 'success',
        variables: ['title'],
        createdAt: serverTimestamp()
      },
      {
        id: 'issue_escalated',
        name: 'Issue Escalated',
        title: 'Issue escalated to higher authority ⚡',
        body: 'Your issue "{title}" has been escalated due to its priority. We are prioritizing its resolution.',
        type: 'warning',
        variables: ['title'],
        createdAt: serverTimestamp()
      }
    ];

    const templatesRef = collection(db, 'notificationTemplates');
    for (const template of defaultTemplates) {
      await addDoc(templatesRef, template);
    }
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Send real notification to mobile users
  const handleSendNotification = async () => {
    try {
      setSendingNotification(true);
      
      // Determine target users
      let targetUsers = [];
      switch (manualNotification.target) {
        case 'all':
          targetUsers = mobileUsers.filter(user => user.notificationsEnabled);
          break;
        case 'active':
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          targetUsers = mobileUsers.filter(user => 
            user.notificationsEnabled && 
            user.lastActive && 
            user.lastActive.toDate() > oneDayAgo
          );
          break;
        case 'recent':
          // Users who reported issues in last 7 days
          targetUsers = await getRecentReporters();
          break;
        default:
          targetUsers = mobileUsers.filter(user => user.notificationsEnabled);
      }

      if (targetUsers.length === 0) {
        showAlert('No users found matching the target criteria', 'warning');
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Send notification to each user
      for (const user of targetUsers) {
        try {
          // Save notification to user's notification collection
          const userNotificationRef = collection(db, `users/${user.id}/notifications`);
          await addDoc(userNotificationRef, {
            title: manualNotification.title,
            body: manualNotification.body,
            type: 'manual',
            priority: manualNotification.priority,
            read: false,
            sentBy: 'admin',
            sentAt: serverTimestamp(),
            data: {
              type: 'general',
              priority: manualNotification.priority,
              timestamp: Date.now()
            }
          });

          // In production, you would send actual push notification here
          // For now, we'll simulate success
          console.log(`📤 Notification sent to ${user.email}`);
          successCount++;
          
        } catch (error) {
          console.error(`❌ Failed to send to ${user.email}:`, error);
          failureCount++;
        }
      }

      // Save notification log
      await addDoc(collection(db, 'notificationLogs'), {
        title: manualNotification.title,
        body: manualNotification.body,
        type: 'manual',
        priority: manualNotification.priority,
        targetAudience: manualNotification.target,
        targetCount: targetUsers.length,
        successCount: successCount,
        failureCount: failureCount,
        sentBy: 'admin',
        sentAt: serverTimestamp(),
        recipients: successCount
      });

      showAlert(`✅ Notification sent to ${successCount} users!`, 'success');
      setSendDialogOpen(false);
      setManualNotification({
        title: '',
        body: '',
        target: 'all',
        priority: 'normal',
        scheduleFor: ''
      });
      
    } catch (error) {
      console.error('Error sending notification:', error);
      showAlert('Failed to send notification', 'error');
    } finally {
      setSendingNotification(false);
    }
  };

  // Get recent issue reporters
  const getRecentReporters = async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const issuesRef = collection(db, 'civicIssues');
      const recentIssuesQuery = query(
        issuesRef,
        where('reportedAt', '>=', sevenDaysAgo)
      );
      
      const snapshot = await getDocs(recentIssuesQuery);
      const reporterIds = new Set();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.reportedById) {
          reporterIds.add(data.reportedById);
        }
      });
      
      return mobileUsers.filter(user => 
        reporterIds.has(user.id) && user.notificationsEnabled
      );
    } catch (error) {
      console.error('Error getting recent reporters:', error);
      return [];
    }
  };

  // Add automation rule
  const handleAddRule = async () => {
    try {
      const rule = {
        ...newRule,
        timesTriggered: 0,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'automationRules'), rule);
      
      setNewRule({
        trigger: 'issue_assigned',
        condition: '',
        templateId: '',
        enabled: true,
        description: ''
      });
      setRuleDialogOpen(false);
      showAlert('Automation rule added successfully!', 'success');
    } catch (error) {
      console.error('Error adding automation rule:', error);
      showAlert('Failed to add automation rule', 'error');
    }
  };

  // Add template
  const handleAddTemplate = async () => {
    try {
      const template = {
        ...newTemplate,
        variables: extractVariables(newTemplate.body),
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'notificationTemplates'), template);
      
      setNewTemplate({
        name: '',
        title: '',
        body: '',
        type: 'info'
      });
      setTemplateDialogOpen(false);
      showAlert('Notification template added successfully!', 'success');
    } catch (error) {
      console.error('Error adding template:', error);
      showAlert('Failed to add template', 'error');
    }
  };

  // Extract variables from template body
  const extractVariables = (text) => {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  // Get notification type color
  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      case 'info': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate today's notifications
  const todayNotifications = notifications.filter(n => {
    const today = new Date();
    const notifDate = new Date(n.sentAt);
    return notifDate.toDateString() === today.toDateString();
  }).length;

  // Calculate active rules
  const activeRules = automationRules.filter(r => r.enabled).length;

  // Calculate total recipients
  const totalRecipients = notifications.reduce((sum, n) => sum + (n.recipients || 0), 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading notification system...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          🔔 Push Notifications
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            onClick={loadRealData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setSendDialogOpen(true)}
          >
            Send Notification
          </Button>
        </Box>
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

      {/* Real-time Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Notifications Sent Today
              </Typography>
              <Typography variant="h4" component="h2">
                {todayNotifications}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Rules
              </Typography>
              <Typography variant="h4" component="h2" color="success.main">
                {activeRules}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Mobile Users
              </Typography>
              <Typography variant="h4" component="h2" color="primary.main">
                {mobileUsers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Recipients
              </Typography>
              <Typography variant="h4" component="h2" color="warning.main">
                {totalRecipients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<HistoryIcon />} label="Notification History" />
          <Tab icon={<AutoIcon />} label="Automation Rules" />
          <Tab icon={<NotificationIcon />} label="Templates" />
          <Tab icon={<SettingsIcon />} label="Mobile Users" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Notifications ({notifications.length})
            </Typography>
            {notifications.length === 0 ? (
              <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                No notifications sent yet. Send your first notification to get started!
              </Typography>
            ) : (
              <List>
                {notifications.map((notification) => (
                  <ListItem key={notification.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {notification.title}
                          </Typography>
                          <Chip 
                            label={notification.type || 'manual'}
                            size="small"
                            color={notification.type === 'automatic' ? 'primary' : 'secondary'}
                          />
                          <Chip 
                            label={`${notification.successCount || notification.recipients || 0} sent`}
                            size="small"
                            color="success"
                          />
                          {notification.failureCount > 0 && (
                            <Chip 
                              label={`${notification.failureCount} failed`}
                              size="small"
                              color="error"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {notification.body}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Sent: {formatDate(notification.sentAt)} • 
                            Target: {notification.targetAudience || 'all'} • 
                            Priority: {notification.priority || 'normal'}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Automation Rules ({automationRules.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRuleDialogOpen(true)}
              >
                Add Rule
              </Button>
            </Box>
            
            {automationRules.length === 0 ? (
              <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                No automation rules yet. Create rules to automatically send notifications when issues are updated.
              </Typography>
            ) : (
              <List>
                {automationRules.map((rule) => (
                  <ListItem key={rule.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {rule.description}
                          </Typography>
                          <Chip 
                            label={rule.trigger}
                            size="small"
                            color="primary"
                          />
                          {rule.enabled ? (
                            <Chip label="Enabled" size="small" color="success" />
                          ) : (
                            <Chip label="Disabled" size="small" color="default" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Condition: {rule.condition || 'Always'} • Template: {rule.templateId}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Triggered {rule.timesTriggered || 0} times
                            {rule.lastTriggered && ` • Last: ${formatDate(rule.lastTriggered)}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Notification Templates ({templates.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setTemplateDialogOpen(true)}
              >
                Add Template
              </Button>
            </Box>
            
            {templates.length === 0 ? (
              <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                No templates yet. Create templates to standardize your notification messages.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {templates.map((template) => (
                  <Grid item xs={12} md={6} key={template.id}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {template.name}
                        </Typography>
                        <Chip 
                          label={template.type}
                          size="small"
                          sx={{ bgcolor: getTypeColor(template.type), color: 'white' }}
                        />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {template.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" mb={2}>
                        {template.body}
                      </Typography>
                      {template.variables && template.variables.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Variables: {template.variables.join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Mobile App Users ({mobileUsers.length})
            </Typography>
            
            {mobileUsers.length === 0 ? (
              <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                No mobile users with push tokens found. Users need to enable notifications in the mobile app.
              </Typography>
            ) : (
              <List>
                {mobileUsers.map((user) => (
                  <ListItem key={user.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {user.displayName}
                          </Typography>
                          {user.notificationsEnabled ? (
                            <Chip label="Notifications On" size="small" color="success" />
                          ) : (
                            <Chip label="Notifications Off" size="small" color="default" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {user.email}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Last active: {user.lastActive ? formatDate(user.lastActive.toDate()) : 'Never'}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Notification Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Send Push Notification</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Notification Title"
              value={manualNotification.title}
              onChange={(e) => setManualNotification({ ...manualNotification, title: e.target.value })}
              placeholder="Enter notification title"
            />
            <TextField
              fullWidth
              label="Message Body"
              multiline
              rows={3}
              value={manualNotification.body}
              onChange={(e) => setManualNotification({ ...manualNotification, body: e.target.value })}
              placeholder="Enter notification message"
            />
            <FormControl fullWidth>
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={manualNotification.target}
                label="Target Audience"
                onChange={(e) => setManualNotification({ ...manualNotification, target: e.target.value })}
              >
                <MenuItem value="all">All Users ({mobileUsers.filter(u => u.notificationsEnabled).length})</MenuItem>
                <MenuItem value="active">Active Users Only (Last 24h)</MenuItem>
                <MenuItem value="recent">Recent Issue Reporters (Last 7 days)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={manualNotification.priority}
                label="Priority"
                onChange={(e) => setManualNotification({ ...manualNotification, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSendNotification} 
            variant="contained"
            disabled={!manualNotification.title || !manualNotification.body || sendingNotification}
            startIcon={sendingNotification ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {sendingNotification ? 'Sending...' : 'Send Notification'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Automation Rule Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Automation Rule</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Trigger Event</InputLabel>
              <Select
                value={newRule.trigger}
                label="Trigger Event"
                onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
              >
                <MenuItem value="issue_assigned">Issue Assigned</MenuItem>
                <MenuItem value="status_changed">Status Changed</MenuItem>
                <MenuItem value="priority_changed">Priority Changed</MenuItem>
                <MenuItem value="comment_added">Comment Added</MenuItem>
                <MenuItem value="issue_escalated">Issue Escalated</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Condition (Optional)"
              value={newRule.condition}
              onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
              placeholder="e.g., priority == 'Critical' or status == 'Resolved'"
              helperText="Leave empty to trigger for all events"
            />
            <FormControl fullWidth>
              <InputLabel>Notification Template</InputLabel>
              <Select
                value={newRule.templateId}
                label="Notification Template"
                onChange={(e) => setNewRule({ ...newRule, templateId: e.target.value })}
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              value={newRule.description}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              placeholder="Describe when this rule should trigger"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={newRule.enabled} 
                  onChange={(e) => setNewRule({ ...newRule, enabled: e.target.checked })}
                />
              }
              label="Enable this rule"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddRule} 
            variant="contained"
            disabled={!newRule.trigger || !newRule.templateId || !newRule.description}
          >
            Add Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Notification Template</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              placeholder="Enter template name"
            />
            <TextField
              fullWidth
              label="Notification Title"
              value={newTemplate.title}
              onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
              placeholder="Enter notification title"
            />
            <TextField
              fullWidth
              label="Message Body"
              multiline
              rows={4}
              value={newTemplate.body}
              onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
              placeholder="Enter message body. Use {variable} for dynamic content"
              helperText="Use {title}, {assignedDepartment}, {status} etc. for dynamic variables"
            />
            <FormControl fullWidth>
              <InputLabel>Template Type</InputLabel>
              <Select
                value={newTemplate.type}
                label="Template Type"
                onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
              >
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddTemplate} 
            variant="contained"
            disabled={!newTemplate.name || !newTemplate.title || !newTemplate.body}
          >
            Add Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationsPage;
