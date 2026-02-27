import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Button, IconButton, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
    Stack, Grid, List, ListItem, ListItemText, ListItemSecondaryAction,
    FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel,
    Tabs, Tab, Paper, CircularProgress,
} from '@mui/material';
import {
    Send as SendIcon, Settings as SettingsIcon, History as HistoryIcon,
    AutoMode as AutoIcon, Edit as EditIcon, Add as AddIcon,
} from '@mui/icons-material';
import {
    collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp,
    getDocs, where, limit, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAlert } from '../hooks/useAlert';
import { formatDate } from '../utils/dateUtils';
import NotificationService from '../services/notificationService';
import type { NotificationLog, NotificationTemplate, AutomationRule } from '../types';

const NotificationsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [notifications, setNotifications] = useState<NotificationLog[]>([]);
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [sendingNotification, setSendingNotification] = useState(false);
    const { alert, showAlert, dismissAlert } = useAlert();
    const unsubscribesRef = useRef<(() => void)[]>([]);

    const [manualNotification, setManualNotification] = useState({
        title: '', body: '', target: 'all', priority: 'normal',
    });
    const [newRule, setNewRule] = useState({
        trigger: 'issue_assigned', condition: '', templateId: '', enabled: true, description: '',
    });
    const [newTemplate, setNewTemplate] = useState({
        name: '', title: '', body: '', type: 'info',
    });

    // Load data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Notification history
                const notifQuery = query(collection(db, 'notificationLogs'), orderBy('sentAt', 'desc'), limit(50));
                const notifUnsub = onSnapshot(notifQuery, (snapshot) => {
                    const list: NotificationLog[] = [];
                    snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as NotificationLog));
                    setNotifications(list);
                });

                // Automation rules
                const rulesUnsub = onSnapshot(collection(db, 'automationRules'), (snapshot) => {
                    const list: AutomationRule[] = [];
                    snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as AutomationRule));
                    setAutomationRules(list);
                });

                // Templates
                const templatesUnsub = onSnapshot(collection(db, 'notificationTemplates'), (snapshot) => {
                    const list: NotificationTemplate[] = [];
                    snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as NotificationTemplate));
                    setTemplates(list);
                });

                unsubscribesRef.current = [notifUnsub, rulesUnsub, templatesUnsub];
            } catch (error) {
                console.error('Error loading data:', error);
                showAlert('Error loading notification data', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadData();
        return () => unsubscribesRef.current.forEach((u) => u());
    }, [showAlert]);

    const handleSendNotification = useCallback(async () => {
        if (!manualNotification.title || !manualNotification.body) {
            showAlert('Title and body required', 'warning');
            return;
        }
        setSendingNotification(true);
        try {
            // Fetch users with push tokens
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const targetUsers: import('../types').AppUser[] = [];
            usersSnapshot.forEach((docSnap) => {
                const u = { id: docSnap.id, ...docSnap.data() } as import('../types').AppUser;
                if (u.pushToken) targetUsers.push(u);
            });

            // Actually send push notifications
            const result = await NotificationService.sendNotificationToUsers(
                {
                    title: manualNotification.title,
                    body: manualNotification.body,
                    type: 'manual',
                    target: manualNotification.target,
                    priority: manualNotification.priority,
                },
                targetUsers,
            );

            // Log with real counts
            await addDoc(collection(db, 'notificationLogs'), {
                ...manualNotification,
                type: 'manual',
                sentAt: serverTimestamp(),
                sentBy: 'admin',
                recipientCount: targetUsers.length,
                successCount: result.successCount,
                failureCount: result.failureCount,
                status: result.success ? 'sent' : 'partial',
            });

            showAlert(`Notification sent to ${result.successCount} users!`, 'success');
            setSendDialogOpen(false);
            setManualNotification({ title: '', body: '', target: 'all', priority: 'normal' });
        } catch (error) {
            console.error('Error sending notification:', error);
            showAlert('Failed to send notification', 'error');
        } finally {
            setSendingNotification(false);
        }
    }, [manualNotification, showAlert]);

    const handleAddRule = useCallback(async () => {
        try {
            await addDoc(collection(db, 'automationRules'), {
                ...newRule, timesTriggered: 0, createdAt: serverTimestamp(), lastTriggered: null,
            });
            showAlert('Rule created!', 'success');
            setRuleDialogOpen(false);
        } catch (error) {
            console.error('Error adding rule:', error);
            showAlert('Failed to add rule', 'error');
        }
    }, [newRule, showAlert]);

    const handleAddTemplate = useCallback(async () => {
        try {
            await addDoc(collection(db, 'notificationTemplates'), {
                ...newTemplate, createdAt: serverTimestamp(),
            });
            showAlert('Template created!', 'success');
            setTemplateDialogOpen(false);
        } catch (error) {
            console.error('Error adding template:', error);
            showAlert('Failed to add template', 'error');
        }
    }, [newTemplate, showAlert]);

    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>🔔 Notifications</Typography>
                <Button variant="contained" startIcon={<SendIcon />} onClick={() => setSendDialogOpen(true)}>
                    Send Notification
                </Button>
            </Box>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
                    <Tab icon={<HistoryIcon />} label="History" />
                    <Tab icon={<AutoIcon />} label="Automation Rules" />
                    <Tab icon={<SettingsIcon />} label="Templates" />
                </Tabs>
            </Paper>

            {/* History Tab */}
            {activeTab === 0 && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Notification History</Typography>
                    <List>
                        {notifications.map((notif) => (
                            <ListItem key={notif.id} divider>
                                <ListItemText
                                    primary={notif.title}
                                    secondary={`${notif.body} • ${formatDate(notif.sentAt)} • Target: ${notif.target}`}
                                />
                                <Chip
                                    label={notif.status}
                                    color={notif.status === 'sent' ? 'success' : notif.status === 'partial' ? 'warning' : 'error'}
                                    size="small"
                                />
                            </ListItem>
                        ))}
                        {notifications.length === 0 && <Typography color="textSecondary" textAlign="center" py={3}>No notifications sent yet</Typography>}
                    </List>
                </Paper>
            )}

            {/* Automation Rules Tab */}
            {activeTab === 1 && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Automation Rules</Typography>
                        <Button startIcon={<AddIcon />} onClick={() => setRuleDialogOpen(true)}>Add Rule</Button>
                    </Box>
                    <List>
                        {automationRules.map((rule) => (
                            <ListItem key={rule.id} divider>
                                <ListItemText primary={rule.description} secondary={`Trigger: ${rule.trigger} • Triggered ${rule.timesTriggered} times`} />
                                <ListItemSecondaryAction>
                                    <Chip label={rule.enabled ? 'Active' : 'Disabled'} color={rule.enabled ? 'success' : 'default'} size="small" />
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Templates Tab */}
            {activeTab === 2 && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Notification Templates</Typography>
                        <Button startIcon={<AddIcon />} onClick={() => setTemplateDialogOpen(true)}>Add Template</Button>
                    </Box>
                    <Grid container spacing={2}>
                        {templates.map((tpl) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tpl.id}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight="bold">{tpl.name}</Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{tpl.title}</Typography>
                                        <Typography variant="body2">{tpl.body}</Typography>
                                        <Chip label={tpl.type} size="small" sx={{ mt: 1 }} />
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Send Dialog */}
            <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Send Notification</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField fullWidth label="Title" value={manualNotification.title} onChange={(e) => setManualNotification((p) => ({ ...p, title: e.target.value }))} />
                        <TextField fullWidth multiline rows={3} label="Body" value={manualNotification.body} onChange={(e) => setManualNotification((p) => ({ ...p, body: e.target.value }))} />
                        <FormControl fullWidth>
                            <InputLabel>Target</InputLabel>
                            <Select value={manualNotification.target} label="Target" onChange={(e) => setManualNotification((p) => ({ ...p, target: e.target.value }))}>
                                <MenuItem value="all">All Users</MenuItem>
                                <MenuItem value="department">Department</MenuItem>
                                <MenuItem value="role">By Role</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select value={manualNotification.priority} label="Priority" onChange={(e) => setManualNotification((p) => ({ ...p, priority: e.target.value }))}>
                                <MenuItem value="normal">Normal</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSendDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSendNotification} disabled={sendingNotification}>
                        {sendingNotification ? <CircularProgress size={20} /> : 'Send'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rule Dialog */}
            <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Automation Rule</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Trigger</InputLabel>
                            <Select value={newRule.trigger} label="Trigger" onChange={(e) => setNewRule((p) => ({ ...p, trigger: e.target.value }))}>
                                <MenuItem value="issue_assigned">Issue Assigned</MenuItem>
                                <MenuItem value="status_changed">Status Changed</MenuItem>
                                <MenuItem value="priority_changed">Priority Changed</MenuItem>
                                <MenuItem value="comment_added">Comment Added</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Condition" value={newRule.condition} onChange={(e) => setNewRule((p) => ({ ...p, condition: e.target.value }))} />
                        <TextField fullWidth label="Description" value={newRule.description} onChange={(e) => setNewRule((p) => ({ ...p, description: e.target.value }))} />
                        <FormControlLabel control={<Switch checked={newRule.enabled} onChange={(e) => setNewRule((p) => ({ ...p, enabled: e.target.checked }))} />} label="Enabled" />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddRule}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Template Dialog */}
            <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Template</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField fullWidth label="Name" value={newTemplate.name} onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))} />
                        <TextField fullWidth label="Title" value={newTemplate.title} onChange={(e) => setNewTemplate((p) => ({ ...p, title: e.target.value }))} />
                        <TextField fullWidth multiline rows={3} label="Body" value={newTemplate.body} onChange={(e) => setNewTemplate((p) => ({ ...p, body: e.target.value }))} />
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select value={newTemplate.type} label="Type" onChange={(e) => setNewTemplate((p) => ({ ...p, type: e.target.value }))}>
                                <MenuItem value="info">Info</MenuItem>
                                <MenuItem value="warning">Warning</MenuItem>
                                <MenuItem value="success">Success</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddTemplate}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default NotificationsPage;
