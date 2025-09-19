// src/pages/NotificationsPage.js - AUTOMATIC PUSH NOTIFICATION SYSTEM
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
} from '@mui/icons-material';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

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

  // Initialize default data
  useEffect(() => {
    initializeNotificationSystem();
  }, []);

  const initializeNotificationSystem = () => {
    // Default notification templates
    const defaultTemplates = [
      {
        id: 'issue_assigned',
        name: 'Issue Assigned',
        title: 'Your issue has been assigned! 📋',
        body: 'We have assigned your issue "{issueTitle}" to the {department} department. You will receive updates shortly.',
        type: 'success',
        variables: ['issueTitle', 'department']
      },
      {
        id: 'issue_in_progress',
        name: 'Issue In Progress',
        title: 'Work started on your issue! 🚧',
        body: 'Good news! We have started working on your issue "{issueTitle}". Expected completion: {timeframe}.',
        type: 'info',
        variables: ['issueTitle', 'timeframe']
      },
      {
        id: 'issue_resolved',
        name: 'Issue Resolved',
        title: 'Issue resolved! ✅',
        body: 'Great news! Your issue "{issueTitle}" has been successfully resolved. Thank you for your patience.',
        type: 'success',
        variables: ['issueTitle']
      },
      {
        id: 'issue_update',
        name: 'Issue Update',
        title: 'Update on your issue 📢',
        body: 'There is an update on your issue "{issueTitle}": {updateMessage}',
        type: 'info',
        variables: ['issueTitle', 'updateMessage']
      },
      {
        id: 'issue_escalated',
        name: 'Issue Escalated',
        title: 'Issue escalated to higher authority ⚡',
        body: 'Your issue "{issueTitle}" has been escalated due to its priority. We are prioritizing its resolution.',
        type: 'warning',
        variables: ['issueTitle']
      }
    ];

    // Default automation rules
    const defaultRules = [
      {
        id: 'auto_assign',
        trigger: 'issue_assigned',
        condition: 'always',
        templateId: 'issue_assigned',
        enabled: true,
        description: 'Send notification when issue is assigned to department',
        lastTriggered: null,
        timesTriggered: 0
      },
      {
        id: 'auto_progress',
        trigger: 'status_changed',
        condition: 'status == "In Progress"',
        templateId: 'issue_in_progress',
        enabled: true,
        description: 'Send notification when issue status changes to In Progress',
        lastTriggered: null,
        timesTriggered: 0
      },
      {
        id: 'auto_resolved',
        trigger: 'status_changed',
        condition: 'status == "Resolved"',
        templateId: 'issue_resolved',
        enabled: true,
        description: 'Send notification when issue is resolved',
        lastTriggered: null,
        timesTriggered: 0
      },
      {
        id: 'auto_critical',
        trigger: 'priority_changed',
        condition: 'priority == "Critical"',
        templateId: 'issue_escalated',
        enabled: true,
        description: 'Send notification when issue is marked as critical',
        lastTriggered: null,
        timesTriggered: 0
      }
    ];

    // Sample notification history
    const sampleNotifications = [
      {
        id: '1',
        title: 'Your issue has been assigned! 📋',
        body: 'We have assigned your issue "Pothole on Main Street" to the Roads & Infrastructure department.',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        recipients: 1,
        status: 'delivered',
        type: 'automatic',
        trigger: 'issue_assigned'
      },
      {
        id: '2',
        title: 'Issue resolved! ✅',
        body: 'Great news! Your issue "Broken streetlight" has been successfully resolved.',
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        recipients: 1,
        status: 'delivered',
        type: 'automatic',
        trigger: 'issue_resolved'
      },
      {
        id: '3',
        title: 'Work started on your issue! 🚧',
        body: 'Good news! We have started working on your issue "Garbage collection delay".',
        sentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        recipients: 1,
        status: 'delivered',
        type: 'automatic',
        trigger: 'issue_in_progress'
      }
    ];

    setTemplates(defaultTemplates);
    setAutomationRules(defaultRules);
    setNotifications(sampleNotifications);
    setLoading(false);
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Send manual notification
  const handleSendNotification = async () => {
    try {
      const notification = {
        ...manualNotification,
        id: Date.now().toString(),
        sentAt: new Date(),
        status: 'delivered',
        type: 'manual',
        recipients: manualNotification.target === 'all' ? 100 : 1 // Mock recipient count
      };

      setNotifications([notification, ...notifications]);
      
      // In real implementation, this would call FCM API
      await simulatePushNotification(notification);
      
      showAlert('Push notification sent successfully!', 'success');
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
    }
  };

  // Simulate push notification (replace with actual FCM implementation)
  const simulatePushNotification = async (notification) => {
    // This would be replaced with actual FCM API call
    console.log('Sending push notification:', notification);
    
    // Mock FCM API call
    const fcmPayload = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/logo192.png'
      },
      data: {
        type: notification.type || 'general',
        timestamp: notification.sentAt.toISOString()
      }
    };

    // In real implementation:
    // const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `key=${FCM_SERVER_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     to: '/topics/all_users', // or specific device tokens
    //     ...fcmPayload
    //   })
    // });

    return Promise.resolve({ success: true });
  };

  // Add automation rule
  const handleAddRule = () => {
    const rule = {
      ...newRule,
      id: Date.now().toString(),
      lastTriggered: null,
      timesTriggered: 0,
      createdAt: new Date()
    };
    
    setAutomationRules([...automationRules, rule]);
    setNewRule({
      trigger: 'issue_assigned',
      condition: '',
      templateId: '',
      enabled: true,
      description: ''
    });
    setRuleDialogOpen(false);
    showAlert('Automation rule added successfully!', 'success');
  };

  // Add template
  const handleAddTemplate = () => {
    const template = {
      ...newTemplate,
      id: Date.now().toString(),
      variables: extractVariables(newTemplate.body),
      createdAt: new Date()
    };
    
    setTemplates([...templates, template]);
    setNewTemplate({
      name: '',
      title: '',
      body: '',
      type: 'info'
    });
    setTemplateDialogOpen(false);
    showAlert('Notification template added successfully!', 'success');
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
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          🔔 Push Notifications
        </Typography>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => setSendDialogOpen(true)}
        >
          Send Notification
        </Button>
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
                Notifications Sent Today
              </Typography>
              <Typography variant="h4" component="h2">
                {notifications.filter(n => {
                  const today = new Date();
                  const notifDate = new Date(n.sentAt);
                  return notifDate.toDateString() === today.toDateString();
                }).length}
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
                {automationRules.filter(r => r.enabled).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Templates
              </Typography>
              <Typography variant="h4" component="h2" color="primary.main">
                {templates.length}
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
                {notifications.reduce((sum, n) => sum + n.recipients, 0)}
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
          <Tab icon={<SettingsIcon />} label="Settings" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Notifications
            </Typography>
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
                          label={notification.type}
                          size="small"
                          color={notification.type === 'automatic' ? 'primary' : 'secondary'}
                        />
                        <Chip 
                          label={notification.status}
                          size="small"
                          color="success"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {notification.body}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Sent: {formatDate(new Date(notification.sentAt))} • Recipients: {notification.recipients}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Automation Rules
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRuleDialogOpen(true)}
              >
                Add Rule
              </Button>
            </Box>
            
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
                          Condition: {rule.condition || 'Always'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Triggered {rule.timesTriggered} times
                          {rule.lastTriggered && ` • Last: ${formatDate(new Date(rule.lastTriggered))}`}
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
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Notification Templates
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setTemplateDialogOpen(true)}
              >
                Add Template
              </Button>
            </Box>
            
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
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Push Notification Settings
            </Typography>
            
            <Stack spacing={3}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Enable automatic notifications"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Send notifications for issue assignments"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Send notifications for status updates"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Send notifications for issue resolution"
              />
              <Divider />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                FCM Configuration
              </Typography>
              <TextField
                label="FCM Server Key"
                type="password"
                fullWidth
                placeholder="Enter your Firebase Cloud Messaging server key"
                helperText="This key is used to authenticate with Firebase Cloud Messaging"
              />
              <TextField
                label="VAPID Key"
                fullWidth
                placeholder="Enter your VAPID key for web push notifications"
                helperText="VAPID key for web browser notifications"
              />
            </Stack>
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
                <MenuItem value="all">All Users</MenuItem>
                <MenuItem value="active">Active Users Only</MenuItem>
                <MenuItem value="recent">Recent Issue Reporters</MenuItem>
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
            <TextField
              fullWidth
              label="Schedule For (Optional)"
              type="datetime-local"
              value={manualNotification.scheduleFor}
              onChange={(e) => setManualNotification({ ...manualNotification, scheduleFor: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty to send immediately"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSendNotification} 
            variant="contained"
            disabled={!manualNotification.title || !manualNotification.body}
          >
            Send Notification
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
              placeholder="e.g., priority == 'Critical'"
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
              helperText="Use {issueTitle}, {department}, {status} etc. for dynamic variables"
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
