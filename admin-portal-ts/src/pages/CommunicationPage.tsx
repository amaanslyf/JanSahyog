import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, Alert, Chip, Stack,
    Paper, CircularProgress, List, ListItem, ListItemText, Avatar,
    Tab, Tabs,
} from '@mui/material';
import {
    Send as SendIcon, History as HistoryIcon, Group as GroupIcon,
    Assessment as AnalyticsIcon,
} from '@mui/icons-material';
import {
    collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, writeBatch, doc,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAlert } from '../hooks/useAlert';
import { formatDate } from '../utils/dateUtils';
import NotificationService from '../services/notificationService';
import type { AppUser, NotificationLog, NotificationTemplate, CommunicationAnalytics } from '../types';

const CommunicationPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [notifications, setNotifications] = useState<NotificationLog[]>([]);
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const { alert, showAlert, dismissAlert } = useAlert();
    const unsubscribesRef = useRef<(() => void)[]>([]);

    const [form, setForm] = useState({
        title: '', body: '', target: 'all', department: '', priority: 'normal',
    });

    // Load data
    useEffect(() => {
        const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            const list: AppUser[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as AppUser));
            setUsers(list);
        });

        const notifUnsub = onSnapshot(query(collection(db, 'notificationLogs'), orderBy('sentAt', 'desc')), (snapshot) => {
            const list: NotificationLog[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as NotificationLog));
            setNotifications(list);
            setLoading(false);
        });

        const templatesUnsub = onSnapshot(collection(db, 'notificationTemplates'), (snapshot) => {
            const list: NotificationTemplate[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as NotificationTemplate));
            setTemplates(list);
        });

        unsubscribesRef.current = [usersUnsub, notifUnsub, templatesUnsub];
        return () => unsubscribesRef.current.forEach((u) => u());
    }, []);

    const getTargetedUsers = useCallback((): AppUser[] => {
        if (form.target === 'all') return users.filter((u) => u.pushToken);
        if (form.target === 'department') return users.filter((u) => u.role === 'department_head' && u.pushToken);
        return users.filter((u) => u.pushToken);
    }, [form.target, users]);

    const handleSend = useCallback(async () => {
        if (!form.title || !form.body) {
            showAlert('Title and body required', 'warning');
            return;
        }
        setSending(true);
        try {
            const targetUsers = getTargetedUsers();
            await addDoc(collection(db, 'notificationLogs'), {
                title: form.title,
                body: form.body,
                type: 'manual',
                target: form.target,
                priority: form.priority,
                sentAt: serverTimestamp(),
                sentBy: 'admin',
                recipientCount: targetUsers.length,
                successCount: targetUsers.length,
                failureCount: 0,
                status: 'sent',
            });

            // Create in-app notifications
            const batch = writeBatch(db);
            targetUsers.forEach((user) => {
                const notifRef = doc(collection(db, 'users', user.id, 'notifications'));
                batch.set(notifRef, {
                    title: form.title, body: form.body, type: 'manual', read: false, createdAt: serverTimestamp(),
                });
            });
            await batch.commit();

            // Send actual push notifications via Expo
            const pushResult = await NotificationService.sendToMobileUsers(
                { title: form.title, body: form.body },
                targetUsers.map((u) => u.pushToken!),
            );
            console.log(`Push sent: ${pushResult.successCount} success, ${pushResult.failureCount} failed`);

            showAlert(`Notification sent to ${targetUsers.length} users!`, 'success');
            setForm({ title: '', body: '', target: 'all', department: '', priority: 'normal' });
        } catch (error) {
            console.error('Error sending notification:', error);
            showAlert('Failed to send notification', 'error');
        } finally {
            setSending(false);
        }
    }, [form, getTargetedUsers, showAlert]);

    const handleApplyTemplate = useCallback((template: NotificationTemplate) => {
        setForm((p) => ({ ...p, title: template.title, body: template.body }));
        showAlert(`Template "${template.name}" applied`, 'info');
    }, [showAlert]);

    const analyticsData = React.useMemo((): CommunicationAnalytics => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const weekNotifs = notifications.filter((n) => {
            const date = n.sentAt ? new Date(n.sentAt as string) : new Date();
            return date >= weekAgo;
        });
        const byType: Record<string, number> = {};
        notifications.forEach((n) => { byType[n.type] = (byType[n.type] ?? 0) + 1; });
        const totalRecipients = notifications.reduce((sum, n) => sum + (n.recipientCount ?? 0), 0);
        const totalSuccess = notifications.reduce((sum, n) => sum + (n.successCount ?? 0), 0);

        return {
            totalSent: notifications.length,
            sentThisWeek: weekNotifs.length,
            successRate: totalRecipients > 0 ? Math.round((totalSuccess / totalRecipients) * 100) : 0,
            totalRecipients,
            byType,
        };
    }, [notifications]);

    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 3 }}>📧 Communication Center</Typography>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
                    <Tab icon={<SendIcon />} label="Send" />
                    <Tab icon={<HistoryIcon />} label="History" />
                    <Tab icon={<AnalyticsIcon />} label="Analytics" />
                </Tabs>
            </Paper>

            {/* Send Tab */}
            {activeTab === 0 && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Compose Notification</Typography>
                            <Stack spacing={2}>
                                <TextField fullWidth label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                                <TextField fullWidth multiline rows={4} label="Message Body" value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>Target</InputLabel>
                                            <Select value={form.target} label="Target" onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}>
                                                <MenuItem value="all">All Users</MenuItem>
                                                <MenuItem value="department">Department Heads</MenuItem>
                                                <MenuItem value="role">By Role</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>Priority</InputLabel>
                                            <Select value={form.priority} label="Priority" onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                                                <MenuItem value="normal">Normal</MenuItem>
                                                <MenuItem value="high">High</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="textSecondary">
                                        Will send to {getTargetedUsers().length} users
                                    </Typography>
                                    <Button variant="contained" startIcon={<SendIcon />} onClick={handleSend} disabled={sending} size="large">
                                        {sending ? <CircularProgress size={20} /> : 'Send Notification'}
                                    </Button>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Templates</Typography>
                            <List>
                                {templates.map((tpl) => (
                                    <ListItem key={tpl.id} divider sx={{ cursor: 'pointer' }} onClick={() => handleApplyTemplate(tpl)}>
                                        <ListItemText primary={tpl.name} secondary={tpl.title} />
                                        <Chip label={tpl.type} size="small" />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* History Tab */}
            {activeTab === 1 && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Notification History</Typography>
                    <List>
                        {notifications.map((notif) => (
                            <ListItem key={notif.id} divider>
                                <ListItemText
                                    primary={notif.title}
                                    secondary={`${notif.body} • ${formatDate(notif.sentAt)} • ${notif.recipientCount} recipients`}
                                />
                                <Chip label={notif.status} color={notif.status === 'sent' ? 'success' : 'error'} size="small" />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Analytics Tab */}
            {activeTab === 2 && (
                <Grid container spacing={3}>
                    {[
                        { label: 'Total Sent', value: analyticsData.totalSent, color: '#1976d2' },
                        { label: 'This Week', value: analyticsData.sentThisWeek, color: '#4caf50' },
                        { label: 'Success Rate', value: `${analyticsData.successRate}%`, color: '#ff9800' },
                        { label: 'Total Recipients', value: analyticsData.totalRecipients, color: '#9c27b0' },
                    ].map((stat) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
                            <Card elevation={3}>
                                <CardContent>
                                    <Typography color="textSecondary">{stat.label}</Typography>
                                    <Typography variant="h4" sx={{ color: stat.color, fontWeight: 'bold' }}>{stat.value}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default CommunicationPage;
