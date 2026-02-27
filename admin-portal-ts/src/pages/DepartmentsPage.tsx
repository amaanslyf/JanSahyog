import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Button, IconButton, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
    Stack, Grid, Switch, FormControlLabel, CircularProgress, FormControl,
    InputLabel, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, LinearProgress, Avatar,
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Business as DeptIcon, PlayArrow as RunIcon,
    Inventory as SeedIcon,
} from '@mui/icons-material';
import {
    seedDefaultDepartments, seedDefaultRules, runBulkAutoAssign, KNOWN_CATEGORIES,
} from '../services/autoAssignService';
import {
    collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
    query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAlert } from '../hooks/useAlert';
import { getDepartmentColor } from '../utils/colorUtils';
import type { Department, AutoAssignmentRule, CivicIssue } from '../types';

const DepartmentsPage: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [rules, setRules] = useState<AutoAssignmentRule[]>([]);
    const [issues, setIssues] = useState<CivicIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const { alert, showAlert, dismissAlert } = useAlert();
    const unsubscribeRef = useRef<(() => void)[]>([]);

    const [formData, setFormData] = useState({
        name: '', description: '', head: '', email: '', phone: '', active: true, categories: '',
    });
    const [ruleForm, setRuleForm] = useState({ category: '', department: '', priority: 'Medium', enabled: true });
    const [seeding, setSeeding] = useState(false);
    const [autoAssigning, setAutoAssigning] = useState(false);

    // Count unassigned issues
    const unassignedCount = issues.filter((i) => !i.assignedDepartment || i.assignedDepartment === '').length;

    // Load data
    useEffect(() => {
        const deptUnsub = onSnapshot(query(collection(db, 'departments'), orderBy('name')), (snapshot) => {
            const list: Department[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Department));
            setDepartments(list);
            setLoading(false);
        });

        const rulesUnsub = onSnapshot(collection(db, 'autoAssignmentRules'), (snapshot) => {
            const list: AutoAssignmentRule[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as AutoAssignmentRule));
            setRules(list);
        });

        const issuesUnsub = onSnapshot(collection(db, 'civicIssues'), (snapshot) => {
            const list: CivicIssue[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as CivicIssue));
            setIssues(list);
        });

        unsubscribeRef.current = [deptUnsub, rulesUnsub, issuesUnsub];
        return () => unsubscribeRef.current.forEach((u) => u());
    }, []);

    const getDeptStats = useCallback((deptName: string) => {
        const deptIssues = issues.filter((i) => i.assignedDepartment === deptName);
        const total = deptIssues.length;
        const resolved = deptIssues.filter((i) => i.status === 'Resolved').length;
        return {
            total,
            open: deptIssues.filter((i) => i.status === 'Open').length,
            inProgress: deptIssues.filter((i) => i.status === 'In Progress').length,
            resolved,
            resolveRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        };
    }, [issues]);

    const handleSaveDept = useCallback(async () => {
        try {
            const data = {
                name: formData.name,
                description: formData.description,
                head: formData.head,
                email: formData.email,
                phone: formData.phone,
                active: formData.active,
                categories: formData.categories.split(',').map((c) => c.trim()).filter(Boolean),
            };

            if (editingDept) {
                await updateDoc(doc(db, 'departments', editingDept.id), data);
                showAlert('Department updated!', 'success');
            } else {
                await addDoc(collection(db, 'departments'), { ...data, createdAt: serverTimestamp() });
                showAlert('Department created!', 'success');
            }
            setDialogOpen(false);
            setEditingDept(null);
            setFormData({ name: '', description: '', head: '', email: '', phone: '', active: true, categories: '' });
        } catch (error) {
            console.error('Error saving department:', error);
            showAlert('Failed to save department', 'error');
        }
    }, [formData, editingDept, showAlert]);

    const handleDeleteDept = useCallback(async (deptId: string) => {
        try {
            await deleteDoc(doc(db, 'departments', deptId));
            showAlert('Department deleted!', 'success');
        } catch (error) {
            console.error('Error deleting department:', error);
            showAlert('Failed to delete', 'error');
        }
    }, [showAlert]);

    const handleSaveRule = useCallback(async () => {
        try {
            await addDoc(collection(db, 'autoAssignmentRules'), {
                ...ruleForm, createdAt: serverTimestamp(),
            });
            showAlert('Rule created!', 'success');
            setRuleDialogOpen(false);
            setRuleForm({ category: '', department: '', priority: 'Medium', enabled: true });
        } catch (error) {
            console.error('Error saving rule:', error);
            showAlert('Failed to save rule', 'error');
        }
    }, [ruleForm, showAlert]);

    const handleToggleRule = useCallback(async (ruleId: string, enabled: boolean) => {
        try {
            await updateDoc(doc(db, 'autoAssignmentRules', ruleId), { enabled });
        } catch (error) {
            console.error('Error toggling rule:', error);
        }
    }, []);

    const handleDeleteRule = useCallback(async (ruleId: string) => {
        try {
            await deleteDoc(doc(db, 'autoAssignmentRules', ruleId));
            showAlert('Rule deleted!', 'success');
        } catch (error) {
            console.error('Error deleting rule:', error);
            showAlert('Failed to delete rule', 'error');
        }
    }, [showAlert]);

    const handleSeedDepartments = useCallback(async () => {
        setSeeding(true);
        try {
            const created = await seedDefaultDepartments();
            showAlert(created > 0 ? `Created ${created} default departments!` : 'All default departments already exist', created > 0 ? 'success' : 'info');
        } catch (error) {
            console.error('Error seeding departments:', error);
            showAlert('Failed to seed departments', 'error');
        } finally {
            setSeeding(false);
        }
    }, [showAlert]);

    const handleSeedRules = useCallback(async () => {
        setSeeding(true);
        try {
            const created = await seedDefaultRules();
            showAlert(created > 0 ? `Created ${created} default rules!` : 'All default rules already exist', created > 0 ? 'success' : 'info');
        } catch (error) {
            console.error('Error seeding rules:', error);
            showAlert('Failed to seed rules', 'error');
        } finally {
            setSeeding(false);
        }
    }, [showAlert]);

    const handleRunAutoAssign = useCallback(async () => {
        setAutoAssigning(true);
        try {
            const assigned = await runBulkAutoAssign();
            showAlert(assigned > 0 ? `Auto-assigned ${assigned} issues!` : 'No unassigned issues to route', assigned > 0 ? 'success' : 'info');
        } catch (error) {
            console.error('Error running auto-assign:', error);
            showAlert('Auto-assign failed', 'error');
        } finally {
            setAutoAssigning(false);
        }
    }, [showAlert]);

    const openEditDialog = (dept: Department) => {
        setEditingDept(dept);
        setFormData({
            name: dept.name,
            description: dept.description,
            head: dept.head,
            email: dept.email,
            phone: dept.phone,
            active: dept.active,
            categories: dept.categories?.join(', ') ?? '',
        });
        setDialogOpen(true);
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>🏢 Departments</Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<SeedIcon />} onClick={handleSeedDepartments} disabled={seeding}>Seed Departments</Button>
                    <Button variant="outlined" startIcon={<SeedIcon />} onClick={handleSeedRules} disabled={seeding}>Seed Rules</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingDept(null); setDialogOpen(true); }}>Add Department</Button>
                    <Button variant="outlined" onClick={() => setRuleDialogOpen(true)}>Add Rule</Button>
                </Stack>
            </Box>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            {/* Unassigned Issues Warning */}
            {unassignedCount > 0 && (
                <Alert
                    severity="warning" sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" startIcon={<RunIcon />} onClick={handleRunAutoAssign} disabled={autoAssigning}>
                            {autoAssigning ? 'Routing...' : `Auto-Assign ${unassignedCount} Issues`}
                        </Button>
                    }
                >
                    {unassignedCount} issue(s) have no department assigned.
                </Alert>
            )}

            {/* Department Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {departments.map((dept) => {
                    const stats = getDeptStats(dept.name);
                    return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={dept.id}>
                            <Card elevation={3}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ bgcolor: getDepartmentColor(dept.name) }}><DeptIcon /></Avatar>
                                            <Box>
                                                <Typography variant="h6">{dept.name}</Typography>
                                                <Typography variant="caption" color="textSecondary">{dept.head}</Typography>
                                            </Box>
                                        </Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => openEditDialog(dept)}><EditIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDeleteDept(dept.id)}><DeleteIcon fontSize="small" /></IconButton>
                                        </Box>
                                    </Box>
                                    <Chip label={dept.active ? 'Active' : 'Inactive'} color={dept.active ? 'success' : 'default'} size="small" sx={{ mb: 1 }} />
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{dept.description}</Typography>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Chip label={`Total: ${stats.total}`} size="small" color="primary" />
                                        <Chip label={`Open: ${stats.open}`} size="small" color="error" />
                                        <Chip label={`Resolved: ${stats.resolved}`} size="small" color="success" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Resolution Rate: {stats.resolveRate}%</Typography>
                                        <LinearProgress variant="determinate" value={stats.resolveRate} color={stats.resolveRate > 70 ? 'success' : 'warning'} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Auto-Assignment Rules */}
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Auto-Assignment Rules</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Category</TableCell>
                                <TableCell>Department</TableCell>
                                <TableCell>Priority</TableCell>
                                <TableCell>Enabled</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell>{rule.category}</TableCell>
                                    <TableCell>{rule.department}</TableCell>
                                    <TableCell>{rule.priority}</TableCell>
                                    <TableCell>
                                        <Switch checked={rule.enabled} onChange={(e) => handleToggleRule(rule.id, e.target.checked)} />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="error" onClick={() => handleDeleteRule(rule.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rules.length === 0 && (
                                <TableRow><TableCell colSpan={5} align="center">No rules configured</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Department Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                        <TextField fullWidth multiline rows={2} label="Description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
                        <TextField fullWidth label="Head" value={formData.head} onChange={(e) => setFormData((p) => ({ ...p, head: e.target.value }))} />
                        <TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                        <TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
                        <TextField fullWidth label="Categories (comma-separated)" value={formData.categories} onChange={(e) => setFormData((p) => ({ ...p, categories: e.target.value }))} />
                        <FormControlLabel control={<Switch checked={formData.active} onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))} />} label="Active" />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveDept}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Rule Dialog */}
            <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Auto-Assignment Rule</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select value={ruleForm.category} label="Category" onChange={(e) => setRuleForm((p) => ({ ...p, category: e.target.value }))}>
                                {KNOWN_CATEGORIES.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Department</InputLabel>
                            <Select value={ruleForm.department} label="Department" onChange={(e) => setRuleForm((p) => ({ ...p, department: e.target.value }))}>
                                {departments.filter((d) => d.active).map((d) => <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Default Priority</InputLabel>
                            <Select value={ruleForm.priority} label="Default Priority" onChange={(e) => setRuleForm((p) => ({ ...p, priority: e.target.value }))}>
                                <MenuItem value="Critical">Critical</MenuItem>
                                <MenuItem value="High">High</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="Low">Low</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel control={<Switch checked={ruleForm.enabled} onChange={(e) => setRuleForm((p) => ({ ...p, enabled: e.target.checked }))} />} label="Enabled" />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveRule}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DepartmentsPage;
