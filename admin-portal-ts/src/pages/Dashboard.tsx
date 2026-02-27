import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, CircularProgress,
    Paper, List, ListItemText, Chip, Avatar, ListItemButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    ReportProblem as IssueIcon, CheckCircle as ResolvedIcon,
    HourglassTop as PendingIcon, People as UsersIcon,
} from '@mui/icons-material';
import {
    PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar,
} from 'recharts';
import { collection, onSnapshot, query, orderBy, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { toDate, formatDate, formatDateForChart } from '../utils/dateUtils';
import { getStatusColor, getPriorityColor } from '../utils/colorUtils';
import type { CivicIssue, AppUser } from '../types';

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactElement;
    color: string;
    change?: number;
    subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, change, subtitle }) => (
    <Card elevation={3}>
        <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                    <Typography color="textSecondary" gutterBottom>{title}</Typography>
                    <Typography variant="h4" component="h2" sx={{ color }}>{value}</Typography>
                    {change !== undefined && (
                        <Typography variant="body2" sx={{ mt: 1, color: change >= 0 ? 'success.main' : 'error.main' }}>
                            {change >= 0 ? '+' : ''}{change}% vs last month
                        </Typography>
                    )}
                    {subtitle && (
                        <Typography variant="caption" color="textSecondary">{subtitle}</Typography>
                    )}
                </Box>
                <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>{icon}</Avatar>
            </Box>
        </CardContent>
    </Card>
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const PIE_COLORS = ['#f44336', '#ff9800', '#4caf50'];

const Dashboard: React.FC = () => {
    const [issues, setIssues] = useState<CivicIssue[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [percentageChanges, setPercentageChanges] = useState({ issues: 0, resolved: 0, pending: 0, users: 0 });
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const navigate = useNavigate();

    // Load issues with real-time listener
    useEffect(() => {
        const issuesQuery = query(collection(db, 'civicIssues'), orderBy('reportedAt', 'desc'));
        const unsubscribe = onSnapshot(issuesQuery, (snapshot) => {
            const list: CivicIssue[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                list.push({ id: doc.id, ...data } as CivicIssue);
            });
            setIssues(list);
            setLoading(false);
        });
        unsubscribeRef.current = unsubscribe;
        return () => unsubscribe();
    }, []);

    // Load users
    useEffect(() => {
        const loadUsers = async () => {
            const snapshot = await getDocs(collection(db, 'users'));
            const list: AppUser[] = [];
            snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as AppUser));
            setUsers(list);
        };
        loadUsers();
    }, []);

    // Calculate percentage changes vs previous month
    useEffect(() => {
        const loadPreviousMonthStats = async () => {
            const now = new Date();
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            try {
                const prevQuery = query(
                    collection(db, 'civicIssues'),
                    where('reportedAt', '>=', Timestamp.fromDate(startOfLastMonth)),
                    where('reportedAt', '<', Timestamp.fromDate(startOfThisMonth)),
                );
                const prevSnapshot = await getDocs(prevQuery);
                const prevIssues: CivicIssue[] = [];
                prevSnapshot.forEach((doc) => prevIssues.push({ id: doc.id, ...doc.data() } as CivicIssue));

                const currentIssues = issues.filter((i) => toDate(i.reportedAt) >= startOfThisMonth);
                const calc = (current: number, previous: number) =>
                    previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

                setPercentageChanges({
                    issues: calc(currentIssues.length, prevIssues.length),
                    resolved: calc(
                        currentIssues.filter((i) => i.status === 'Resolved').length,
                        prevIssues.filter((i) => i.status === 'Resolved').length,
                    ),
                    pending: calc(
                        currentIssues.filter((i) => i.status !== 'Resolved').length,
                        prevIssues.filter((i) => i.status !== 'Resolved').length,
                    ),
                    users: 0,
                });
            } catch (error) {
                console.error('Error loading previous month stats:', error);
            }
        };

        if (issues.length > 0) loadPreviousMonthStats();
    }, [issues]);

    // Derived data
    const stats = useMemo(() => {
        const open = issues.filter((i) => i.status === 'Open').length;
        const inProgress = issues.filter((i) => i.status === 'In Progress').length;
        const resolved = issues.filter((i) => i.status === 'Resolved').length;
        return { total: issues.length, open, inProgress, resolved };
    }, [issues]);

    const statusData = useMemo(
        () => [
            { name: 'Open', value: stats.open },
            { name: 'In Progress', value: stats.inProgress },
            { name: 'Resolved', value: stats.resolved },
        ].filter((d) => d.value > 0),
        [stats],
    );

    const trendData = useMemo(() => {
        const last14Days: { date: string; reported: number; resolved: number }[] = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = formatDateForChart(date);
            const dayIssues = issues.filter((issue) => {
                const issueDate = toDate(issue.reportedAt);
                return issueDate.toDateString() === date.toDateString();
            });
            last14Days.push({
                date: dateStr,
                reported: dayIssues.length,
                resolved: dayIssues.filter((i) => i.status === 'Resolved').length,
            });
        }
        return last14Days;
    }, [issues]);

    const recentIssues = useMemo(() => issues.slice(0, 10), [issues]);

    // Department breakdown
    const deptData = useMemo(() => {
        const deptMap = new Map<string, { total: number; resolved: number }>();
        issues.forEach((i) => {
            const dept = i.assignedDepartment || 'Unassigned';
            const existing = deptMap.get(dept) || { total: 0, resolved: 0 };
            existing.total++;
            if (i.status === 'Resolved') existing.resolved++;
            deptMap.set(dept, existing);
        });
        return Array.from(deptMap.entries()).map(([name, data]) => ({
            name: name.length > 12 ? name.substring(0, 12) + '...' : name,
            total: data.total,
            resolved: data.resolved,
            open: data.total - data.resolved,
        })).sort((a, b) => b.total - a.total).slice(0, 6);
    }, [issues]);

    // Category distribution
    const categoryData = useMemo(() => {
        const catMap = new Map<string, number>();
        issues.forEach((i) => {
            const cat = i.category || 'Unknown';
            catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });
        return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
    }, [issues]);

    const CATEGORY_COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688'];

    // SLA: % of issues resolved within 48 hours
    const slaCompliance = useMemo(() => {
        const resolved = issues.filter((i) => i.status === 'Resolved');
        if (resolved.length === 0) return 0;
        const within48h = resolved.filter((i) => {
            const reported = toDate(i.reportedAt);
            const updated = toDate(i.lastUpdated);
            const diff = updated.getTime() - reported.getTime();
            return diff <= 48 * 60 * 60 * 1000;
        });
        return Math.round((within48h.length / resolved.length) * 100);
    }, [issues]);

    // Avg response time (hours)
    const avgResponseTime = useMemo(() => {
        const resolved = issues.filter((i) => i.status === 'Resolved');
        if (resolved.length === 0) return 0;
        const totalHours = resolved.reduce((sum, i) => {
            const reported = toDate(i.reportedAt);
            const updated = toDate(i.lastUpdated);
            return sum + (updated.getTime() - reported.getTime()) / (1000 * 60 * 60);
        }, 0);
        return Math.round(totalHours / resolved.length);
    }, [issues]);

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
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 3 }}>
                📊 Dashboard
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Total Issues" value={stats.total} icon={<IssueIcon />} color="#1976d2" change={percentageChanges.issues} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Resolved" value={stats.resolved} icon={<ResolvedIcon />} color="#4caf50" change={percentageChanges.resolved} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Avg Response" value={`${avgResponseTime}h`} icon={<PendingIcon />} color="#ff9800" subtitle={`SLA: ${slaCompliance}% within 48h`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Total Users" value={users.length} icon={<UsersIcon />} color="#dc004e" />
                </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Issue Trends (14 Days)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="reported" stroke="#1976d2" name="Reported" strokeWidth={2} />
                                <Line type="monotone" dataKey="resolved" stroke="#4caf50" name="Resolved" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Status Distribution</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}>
                                    {statusData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Department Performance + Category Distribution */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Department Performance</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="resolved" fill="#4caf50" name="Resolved" />
                                <Bar dataKey="open" fill="#ff9800" name="Open" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Category Distribution</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}>
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Issues */}
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Recent Issues</Typography>
                <List>
                    {recentIssues.map((issue) => (
                        <ListItemButton key={issue.id} divider onClick={() => navigate(`/issue/${issue.id}`)}>
                            <ListItemText
                                primary={issue.title}
                                secondary={`${issue.category} • ${formatDate(issue.reportedAt)} • ${issue.assignedDepartment || 'Unassigned'}`}
                            />
                            <Box display="flex" gap={1}>
                                <Chip label={issue.status} color={getStatusColor(issue.status)} size="small" />
                                <Chip label={issue.priority} color={getPriorityColor(issue.priority)} size="small" />
                            </Box>
                        </ListItemButton>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default Dashboard;
