// src/pages/CommunicationPage.js - EMAIL & SMS INTEGRATION
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
} from '@mui/icons-material';

const CommunicationPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'admin@jansahyog.gov.in',
    smtpPass: '',
    fromName: 'JanSahyog Administration',
    enableEmail: true
  });
  const [smsSettings, setSmsSettings] = useState({
    provider: 'twilio',
    apiKey: '',
    apiSecret: '',
    fromNumber: '+91-9876543210',
    enableSms: true
  });
  const [emailForm, setEmailForm] = useState({
    recipients: 'all',
    subject: '',
    body: '',
    priority: 'normal'
  });
  const [smsForm, setSmsForm] = useState({
    recipients: 'all',
    message: '',
    priority: 'normal'
  });
  const [communications, setCommunications] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  const [settingsDialog, setSettingsDialog] = useState(false);

  // Initialize sample communication history
  useEffect(() => {
    const sampleCommunications = [
      {
        id: '1',
        type: 'email',
        subject: 'Issue Resolution Update',
        recipients: 5,
        status: 'delivered',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        deliveryRate: 100
      },
      {
        id: '2',
        type: 'sms',
        message: 'Your pothole report has been assigned to Roads dept.',
        recipients: 1,
        status: 'delivered',
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        deliveryRate: 100
      },
      {
        id: '3',
        type: 'email',
        subject: 'Monthly JanSahyog Newsletter',
        recipients: 150,
        status: 'delivered',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        deliveryRate: 95
      }
    ];

    setCommunications(sampleCommunications);
  }, []);

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Send Email
  const handleSendEmail = async () => {
    try {
      // Simulate email sending
      const newEmail = {
        id: Date.now().toString(),
        type: 'email',
        subject: emailForm.subject,
        recipients: emailForm.recipients === 'all' ? 150 : 1,
        status: 'delivered',
        sentAt: new Date(),
        deliveryRate: 95 + Math.random() * 5
      };

      setCommunications([newEmail, ...communications]);
      
      // In real implementation:
      // const response = await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     to: emailForm.recipients,
      //     subject: emailForm.subject,
      //     html: emailForm.body,
      //     priority: emailForm.priority
      //   })
      // });

      showAlert('Email sent successfully!', 'success');
      setEmailForm({ recipients: 'all', subject: '', body: '', priority: 'normal' });
    } catch (error) {
      console.error('Error sending email:', error);
      showAlert('Failed to send email', 'error');
    }
  };

  // Send SMS
  const handleSendSMS = async () => {
    try {
      // Simulate SMS sending
      const newSms = {
        id: Date.now().toString(),
        type: 'sms',
        message: smsForm.message.substring(0, 50) + '...',
        recipients: smsForm.recipients === 'all' ? 150 : 1,
        status: 'delivered',
        sentAt: new Date(),
        deliveryRate: 98 + Math.random() * 2
      };

      setCommunications([newSms, ...communications]);

      // In real implementation:
      // const response = await fetch('/api/send-sms', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     to: smsForm.recipients,
      //     message: smsForm.message,
      //     priority: smsForm.priority
      //   })
      // });

      showAlert('SMS sent successfully!', 'success');
      setSmsForm({ recipients: 'all', message: '', priority: 'normal' });
    } catch (error) {
      console.error('Error sending SMS:', error);
      showAlert('Failed to send SMS', 'error');
    }
  };

  // Update settings
  const handleUpdateSettings = () => {
    // In real implementation, save to database
    showAlert('Communication settings updated successfully!', 'success');
    setSettingsDialog(false);
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
          📧 Communication Center
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsDialog(true)}
        >
          Settings
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
                Emails Sent Today
              </Typography>
              <Typography variant="h4" component="h2">
                {communications.filter(c => c.type === 'email' && 
                  new Date(c.sentAt).toDateString() === new Date().toDateString()).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                SMS Sent Today
              </Typography>
              <Typography variant="h4" component="h2">
                {communications.filter(c => c.type === 'sms' && 
                  new Date(c.sentAt).toDateString() === new Date().toDateString()).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Email Delivery Rate
              </Typography>
              <Typography variant="h4" component="h2" color="success.main">
                95%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                SMS Delivery Rate
              </Typography>
              <Typography variant="h4" component="h2" color="success.main">
                98%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<EmailIcon />} label="Send Email" />
          <Tab icon={<SmsIcon />} label="Send SMS" />
          <Tab icon={<HistoryIcon />} label="Communication History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Send Email Notification
            </Typography>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Recipients</InputLabel>
                <Select 
                  value={emailForm.recipients} 
                  label="Recipients"
                  onChange={(e) => setEmailForm({ ...emailForm, recipients: e.target.value })}
                >
                  <MenuItem value="all">All Citizens</MenuItem>
                  <MenuItem value="recent">Recent Issue Reporters</MenuItem>
                  <MenuItem value="active">Active Users Only</MenuItem>
                  <MenuItem value="specific">Specific Email</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Enter email subject"
              />

              <TextField
                fullWidth
                label="Email Body"
                multiline
                rows={6}
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                placeholder="Enter email content (HTML supported)"
                helperText="You can use HTML formatting in the email body"
              />

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select 
                  value={emailForm.priority} 
                  label="Priority"
                  onChange={(e) => setEmailForm({ ...emailForm, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSendEmail}
                disabled={!emailForm.subject || !emailForm.body}
                sx={{ alignSelf: 'flex-start' }}
              >
                Send Email
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Send SMS Notification
            </Typography>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Recipients</InputLabel>
                <Select 
                  value={smsForm.recipients} 
                  label="Recipients"
                  onChange={(e) => setSmsForm({ ...smsForm, recipients: e.target.value })}
                >
                  <MenuItem value="all">All Citizens</MenuItem>
                  <MenuItem value="recent">Recent Issue Reporters</MenuItem>
                  <MenuItem value="critical">Critical Issue Reporters</MenuItem>
                  <MenuItem value="specific">Specific Phone Number</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="SMS Message"
                multiline
                rows={4}
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                placeholder="Enter SMS message (160 characters recommended)"
                helperText={`Character count: ${smsForm.message.length}/160`}
              />

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select 
                  value={smsForm.priority} 
                  label="Priority"
                  onChange={(e) => setSmsForm({ ...smsForm, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSendSMS}
                disabled={!smsForm.message}
                sx={{ alignSelf: 'flex-start' }}
              >
                Send SMS
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Communication History
            </Typography>
            <List>
              {communications.map((comm) => (
                <ListItem key={comm.id} divider>
                  <ListItemIcon>
                    {comm.type === 'email' ? <EmailIcon color="primary" /> : <SmsIcon color="secondary" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {comm.subject || comm.message}
                        </Typography>
                        <Chip 
                          icon={<SuccessIcon />}
                          label={comm.status}
                          size="small"
                          color="success"
                        />
                        <Chip 
                          label={`${comm.deliveryRate.toFixed(0)}% delivered`}
                          size="small"
                          color={comm.deliveryRate > 90 ? 'success' : 'warning'}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        Sent to {comm.recipients} recipients • {formatDate(comm.sentAt)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Communication Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <Typography variant="h6">Email Settings (SMTP)</Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={emailSettings.enableEmail} 
                  onChange={(e) => setEmailSettings({ ...emailSettings, enableEmail: e.target.checked })}
                />
              }
              label="Enable Email Notifications"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SMTP Host"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SMTP Port"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SMTP Username"
                  value={emailSettings.smtpUser}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SMTP Password"
                  type="password"
                  value={emailSettings.smtpPass}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPass: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider />

            <Typography variant="h6">SMS Settings</Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={smsSettings.enableSms} 
                  onChange={(e) => setSmsSettings({ ...smsSettings, enableSms: e.target.checked })}
                />
              }
              label="Enable SMS Notifications"
            />

            <FormControl fullWidth>
              <InputLabel>SMS Provider</InputLabel>
              <Select 
                value={smsSettings.provider}
                label="SMS Provider"
                onChange={(e) => setSmsSettings({ ...smsSettings, provider: e.target.value })}
              >
                <MenuItem value="twilio">Twilio</MenuItem>
                <MenuItem value="aws-sns">AWS SNS</MenuItem>
                <MenuItem value="msg91">MSG91 (India)</MenuItem>
                <MenuItem value="textlocal">TextLocal</MenuItem>
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="API Key"
                  value={smsSettings.apiKey}
                  onChange={(e) => setSmsSettings({ ...smsSettings, apiKey: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="API Secret"
                  type="password"
                  value={smsSettings.apiSecret}
                  onChange={(e) => setSmsSettings({ ...smsSettings, apiSecret: e.target.value })}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="From Number"
              value={smsSettings.fromNumber}
              onChange={(e) => setSmsSettings({ ...smsSettings, fromNumber: e.target.value })}
              helperText="Phone number or sender ID"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateSettings} variant="contained">
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunicationPage;
