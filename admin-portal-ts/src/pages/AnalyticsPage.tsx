import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, Button, Stack,
    FormControl, InputLabel, Select, MenuItem, Alert, Tabs, Tab,
    Paper, CircularProgress, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, LinearProgress,
} from '@mui/material';
import { Download as ExportIcon, TrendingUp, Assessment } from '@mui/icons-material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAlert } from '../hooks/useAlert';
import { toDate, formatDate, formatDateForChart, calculateResponseTime } from '../utils/dateUtils';
import { getPriorityFill, getStatusFill, getDepartmentColor } from '../utils/colorUtils';
import type { CivicIssue, AnalyticsData, DailyTrend, DepartmentPerformance, ChartDataItem, TopReporter, GeographicArea, PreviousPeriodData } from '../types';

// ─── Helper: extract area from address ───────────────────────────────────────

function extractAreaFromAddress(address: string | undefined): string {
    if (!address) return 'Unknown Area';
    const patterns = [/Block [A-Z]/gi, /Sector \d+/gi, /Phase \d+/gi, /Colony .+?(?:,|$)/gi];
    for (const pattern of patterns) {
        const match = address.match(pattern);
        if (match?.[0]) return match[0].trim();
    }
    const parts = address.split(',');
    return parts.length > 1 ? (parts[1]?.trim() ?? 'Unknown Area') : (parts[0]?.trim() ?? 'Unknown Area');
}

// ─── Main Component ──────────────────────────────────────────────────────────

const AnalyticsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [timeRange, setTimeRange] = useState('30');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [allIssues, setAllIssues] = useState<CivicIssue[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [previousPeriod, setPreviousPeriod] = useState<PreviousPeriodData | null>(null);
    const [loading, setLoading] = useState(true);
    const { alert, showAlert, dismissAlert } = useAlert();
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Load issues
    useEffect(() => {
        const q = query(collection(db, 'civicIssues'), orderBy('reportedAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: CivicIssue[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as CivicIssue));
            setAllIssues(list);
            setLoading(false);
        });
        unsubscribeRef.current = unsub;
        return () => unsub();
    }, []);

    // Calculate analytics whenever filters or data change
    const computedAnalytics = useMemo((): AnalyticsData | null => {
        if (allIssues.length === 0) return null;

        const now = new Date();
        const daysBack = parseInt(timeRange);
        const cutoff = new Date(now.getTime() - daysBack * 86400000);

        const filtered = allIssues.filter((issue) => {
            const date = toDate(issue.reportedAt);
            const inRange = date >= cutoff;
            const inDept = selectedDepartment === 'all' || issue.assignedDepartment === selectedDepartment;
            return inRange && inDept;
        });

        const resolved = filtered.filter((i) => i.status === 'Resolved');
        const responseTimes = filtered
            .map((i) => calculateResponseTime(i.reportedAt, i.lastUpdated, i.status))
            .filter((t): t is number => t !== null);
        const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10 : 0;

        // Daily trends
        const trendMap = new Map<string, { reported: number; resolved: number; inProgress: number; open: number }>();
        for (let i = daysBack - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            trendMap.set(d.toDateString(), { reported: 0, resolved: 0, inProgress: 0, open: 0 });
        }
        filtered.forEach((issue) => {
            const key = toDate(issue.reportedAt).toDateString();
            const entry = trendMap.get(key);
            if (entry) {
                entry.reported++;
                if (issue.status === 'Resolved') entry.resolved++;
                else if (issue.status === 'In Progress') entry.inProgress++;
                else entry.open++;
            }
        });
        let cumulative = 0;
        const dailyTrends: DailyTrend[] = [];
        trendMap.forEach((val, key) => {
            cumulative += val.reported;
            dailyTrends.push({ date: formatDateForChart(new Date(key)), ...val, cumulative });
        });

        // Department performance
        const deptMap = new Map<string, CivicIssue[]>();
        filtered.forEach((i) => {
            const dept = i.assignedDepartment || 'Unassigned';
            const list = deptMap.get(dept) ?? [];
            list.push(i);
            deptMap.set(dept, list);
        });
        const departmentData: DepartmentPerformance[] = Array.from(deptMap.entries()).map(([dept, issues]) => {
            const dResolved = issues.filter((i) => i.status === 'Resolved').length;
            const dTimes = issues.map((i) => calculateResponseTime(i.reportedAt, i.lastUpdated, i.status)).filter((t): t is number => t !== null);
            return {
                department: dept,
                shortName: dept.length > 15 ? dept.substring(0, 15) + '...' : dept,
                total: issues.length,
                resolved: dResolved,
                open: issues.filter((i) => i.status === 'Open').length,
                inProgress: issues.filter((i) => i.status === 'In Progress').length,
                resolveRate: issues.length > 0 ? Math.round((dResolved / issues.length) * 100) : 0,
                avgResponseTime: dTimes.length > 0 ? Math.round(dTimes.reduce((a, b) => a + b, 0) / dTimes.length * 10) / 10 : 0,
                satisfaction: Math.min(100, Math.round((dResolved / Math.max(issues.length, 1)) * 100 + Math.random() * 10)),
            };
        }).sort((a, b) => b.total - a.total);

        // Priority / status / category distributions
        const priorityData: ChartDataItem[] = ['Critical', 'High', 'Medium', 'Low'].map((p) => ({
            name: p, value: filtered.filter((i) => i.priority === p).length, fill: getPriorityFill(p),
        })).filter((d) => d.value > 0);

        const statusData: ChartDataItem[] = ['Open', 'In Progress', 'Resolved'].map((s) => ({
            name: s, value: filtered.filter((i) => i.status === s).length, fill: getStatusFill(s),
        })).filter((d) => d.value > 0);

        const catMap = new Map<string, number>();
        filtered.forEach((i) => catMap.set(i.category, (catMap.get(i.category) ?? 0) + 1));
        const categoryChartData: ChartDataItem[] = Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        // Top reporters
        const reporterMap = new Map<string, number>();
        filtered.forEach((i) => reporterMap.set(i.reportedBy, (reporterMap.get(i.reportedBy) ?? 0) + 1));
        const topReporters: TopReporter[] = Array.from(reporterMap.entries())
            .map(([email, count]) => ({ email: email.split('@')[0] ?? email, fullEmail: email, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Geographic
        const areaMap = new Map<string, { total: number; resolved: number; open: number }>();
        filtered.forEach((i) => {
            const area = extractAreaFromAddress(i.address ?? i.location?.address);
            const entry = areaMap.get(area) ?? { total: 0, resolved: 0, open: 0 };
            entry.total++;
            if (i.status === 'Resolved') entry.resolved++;
            else entry.open++;
            areaMap.set(area, entry);
        });
        const geographicData: GeographicArea[] = Array.from(areaMap.entries())
            .map(([area, d]) => ({ area, ...d, resolveRate: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0 }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // Unique reporters count as "active users"
        const uniqueReporters = new Set(filtered.map((i) => i.reportedById)).size;

        return {
            filteredIssues: filtered,
            dailyTrends,
            departmentData,
            priorityData,
            statusData,
            categoryChartData,
            topReporters,
            geographicData,
            totalIssues: filtered.length,
            resolvedIssues: resolved.length,
            avgResponseTime,
            activeUsers: uniqueReporters,
            newUsers: 0,
            resolutionRate: filtered.length > 0 ? Math.round((resolved.length / filtered.length) * 100) : 0,
        };
    }, [allIssues, timeRange, selectedDepartment]);

    useEffect(() => { setAnalytics(computedAnalytics); }, [computedAnalytics]);

    // Get unique departments
    const departments = useMemo(() => [...new Set(allIssues.map((i) => i.assignedDepartment).filter(Boolean))], [allIssues]);

    const handleExportCSV = useCallback(() => {
        if (!analytics) return;
        const csv = [
            ['Title', 'Category', 'Status', 'Priority', 'Department', 'Reported', 'ResponseDays'].join(','),
            ...analytics.filteredIssues.map((i) =>
                [i.title, i.category, i.status, i.priority, i.assignedDepartment, formatDate(i.reportedAt), calculateResponseTime(i.reportedAt, i.lastUpdated, i.status) ?? 'N/A']
                    .map((f) => `"${f}"`)
                    .join(','),
            ),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showAlert('Exported!', 'success');
    }, [analytics, showAlert]);

    if (loading || !analytics) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /><Typography ml={2}>Loading Analytics...</Typography></Box>;
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>📈 Analytics</Typography>
                <Stack direction="row" spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Time Range</InputLabel>
                        <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
                            <MenuItem value="7">7 Days</MenuItem>
                            <MenuItem value="30">30 Days</MenuItem>
                            <MenuItem value="90">90 Days</MenuItem>
                            <MenuItem value="365">1 Year</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Department</InputLabel>
                        <Select value={selectedDepartment} label="Department" onChange={(e) => setSelectedDepartment(e.target.value)}>
                            <MenuItem value="all">All Departments</MenuItem>
                            {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExportCSV}>Export CSV</Button>
                </Stack>
            </Box>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            {/* KPI Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Issues', value: analytics.totalIssues, color: '#1976d2' },
                    { label: 'Resolved', value: analytics.resolvedIssues, color: '#4caf50' },
                    { label: 'Resolution Rate', value: `${analytics.resolutionRate}%`, color: '#ff9800' },
                    { label: 'Avg Response', value: `${analytics.avgResponseTime}d`, color: '#9c27b0' },
                ].map((kpi) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.label}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography color="textSecondary">{kpi.label}</Typography>
                                <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 'bold' }}>{kpi.value}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Tab Navigation */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
                    <Tab icon={<TrendingUp />} label="Trends" />
                    <Tab icon={<Assessment />} label="Department" />
                    <Tab label="Categories" />
                    <Tab label="Geographic" />
                </Tabs>
            </Paper>

            {/* Trends Tab */}
            {activeTab === 0 && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Daily Issue Trends</Typography>
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={analytics.dailyTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Area type="monotone" dataKey="reported" stroke="#1976d2" fill="#1976d222" name="Reported" />
                                    <Area type="monotone" dataKey="resolved" stroke="#4caf50" fill="#4caf5022" name="Resolved" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>By Priority</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={analytics.priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                        {analytics.priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Department Tab */}
            {activeTab === 1 && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Department Performance</Typography>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.departmentData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="shortName" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="open" fill="#f44336" name="Open" stackId="a" />
                            <Bar dataKey="inProgress" fill="#ff9800" name="In Progress" stackId="a" />
                            <Bar dataKey="resolved" fill="#4caf50" name="Resolved" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                    <TableContainer sx={{ mt: 3 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Department</TableCell>
                                    <TableCell>Total</TableCell>
                                    <TableCell>Resolution Rate</TableCell>
                                    <TableCell>Avg Response</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analytics.departmentData.map((d) => (
                                    <TableRow key={d.department}>
                                        <TableCell>{d.department}</TableCell>
                                        <TableCell>{d.total}</TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <LinearProgress variant="determinate" value={d.resolveRate} sx={{ flex: 1, height: 6, borderRadius: 3 }} color={d.resolveRate > 70 ? 'success' : 'warning'} />
                                                <Typography variant="caption">{d.resolveRate}%</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{d.avgResponseTime}d</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Categories Tab */}
            {activeTab === 2 && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Issues by Category</Typography>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.categoryChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={150} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#1976d2" name="Issues" />
                        </BarChart>
                    </ResponsiveContainer>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Top Reporters</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Reporter</TableCell>
                                    <TableCell>Issues Reported</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analytics.topReporters.map((r) => (
                                    <TableRow key={r.fullEmail}>
                                        <TableCell>{r.email}</TableCell>
                                        <TableCell>{r.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Geographic Tab */}
            {activeTab === 3 && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Geographic Distribution</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Area</TableCell>
                                    <TableCell>Total</TableCell>
                                    <TableCell>Open</TableCell>
                                    <TableCell>Resolved</TableCell>
                                    <TableCell>Resolution Rate</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analytics.geographicData.map((g) => (
                                    <TableRow key={g.area}>
                                        <TableCell>{g.area}</TableCell>
                                        <TableCell>{g.total}</TableCell>
                                        <TableCell>{g.open}</TableCell>
                                        <TableCell>{g.resolved}</TableCell>
                                        <TableCell>
                                            <Chip label={`${g.resolveRate}%`} color={g.resolveRate > 70 ? 'success' : 'warning'} size="small" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
};

export default AnalyticsPage;
