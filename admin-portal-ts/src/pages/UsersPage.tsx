import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Button, IconButton, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
    InputLabel, Select, MenuItem, TextField, Alert, Stack,
    Avatar, Grid, Paper, Tabs, Tab, CircularProgress,
} from '@mui/material';
import {
    PersonAdd as AddUserIcon, Edit as EditIcon,
    Download as ExportIcon, Block as BlockIcon,
    CheckCircle as ActivateIcon, AdminPanelSettings as AdminIcon,
    Person as UserIcon, SupervisorAccount as ModeratorIcon,
    Smartphone as MobileIcon, Computer as WebIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid';
import {
    collection, onSnapshot, query, doc, updateDoc, addDoc,
    getDocs, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAlert } from '../hooks/useAlert';
import { formatDate } from '../utils/dateUtils';
import type { AppUser, UserRole, UserStatus } from '../types';

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const { alert, showAlert, dismissAlert } = useAlert();
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const [newUser, setNewUser] = useState({
        email: '', displayName: '', role: 'citizen' as UserRole, status: 'active' as UserStatus,
    });
    const [editData, setEditData] = useState({
        role: '' as UserRole, status: '' as UserStatus, displayName: '', phone: '',
    });

    // Calculate user statistics
    const calculateUserStatistics = useCallback(async (usersList: AppUser[]): Promise<AppUser[]> => {
        const enrichmentPromises = usersList.map(async (user) => {
            try {
                const userIssuesQuery = query(collection(db, 'civicIssues'), where('reportedById', '==', user.id));
                const snapshot = await getDocs(userIssuesQuery);
                let totalIssues = 0;
                let resolvedIssues = 0;
                snapshot.forEach((docSnap) => {
                    totalIssues++;
                    if (docSnap.data().status === 'Resolved') resolvedIssues++;
                });
                return {
                    ...user,
                    totalIssues,
                    resolvedIssues,
                    openIssues: totalIssues - resolvedIssues,
                };
            } catch (error) {
                console.error(`Error enriching user ${user.id}:`, error);
                return { ...user, totalIssues: 0, resolvedIssues: 0, openIssues: 0 };
            }
        });
        return Promise.all(enrichmentPromises);
    }, []);

    // Load users
    useEffect(() => {
        const loadData = async () => {
            const usersQuery = query(collection(db, 'users'));
            const unsub = onSnapshot(usersQuery, async (snapshot) => {
                const list: AppUser[] = [];
                snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as AppUser));

                // Set initial list immediately so UI is responsive
                setUsers((prevUsers) => {
                    // Maintain existing enrichment if possible to avoid flickering
                    const enrichedMap = new Map(prevUsers.map(u => [u.id, u]));
                    return list.map(u => {
                        const existing = enrichedMap.get(u.id);
                        return existing ? { ...u, ...existing, ...u } : u; // doc data wins, but keep stats
                    });
                });
                setLoading(false);

                // Start enrichment in background
                const enriched = await calculateUserStatistics(list);
                setUsers(enriched);
            });
            unsubscribeRef.current = unsub;
        };
        loadData();
        return () => unsubscribeRef.current?.();
    }, [calculateUserStatistics]);

    const handleAddUser = useCallback(async () => {
        if (!newUser.email || !newUser.displayName) {
            showAlert('Email and name required', 'warning');
            return;
        }
        try {
            await addDoc(collection(db, 'users'), {
                ...newUser,
                source: 'admin_created',
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                notificationsEnabled: true,
            });
            showAlert('User created!', 'success');
            setAddUserDialogOpen(false);
            setNewUser({ email: '', displayName: '', role: 'citizen', status: 'active' });
        } catch (error) {
            console.error('Error adding user:', error);
            showAlert('Failed to add user', 'error');
        }
    }, [newUser, showAlert]);

    const handleUpdateUser = useCallback(async () => {
        if (!selectedUser) return;
        try {
            await updateDoc(doc(db, 'users', selectedUser.id), {
                role: editData.role,
                status: editData.status,
                displayName: editData.displayName,
                phone: editData.phone,
            });
            showAlert('User updated!', 'success');
            setEditDialogOpen(false);
        } catch (error) {
            console.error('Error updating user:', error);
            showAlert('Failed to update user', 'error');
        }
    }, [selectedUser, editData, showAlert]);

    const handleToggleUserStatus = useCallback(async (user: AppUser) => {
        const newStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
        try {
            await updateDoc(doc(db, 'users', user.id), { status: newStatus });
            showAlert(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`, 'success');
        } catch (error) {
            console.error('Error toggling status:', error);
            showAlert('Failed to update status', 'error');
        }
    }, [showAlert]);

    const handleExport = useCallback(() => {
        const csv = [
            ['Name', 'Email', 'Role', 'Status', 'Source', 'Issues', 'Resolved'].join(','),
            ...users.map((u) =>
                [u.displayName, u.email, u.role, u.status, u.source, u.totalIssues ?? 0, u.resolvedIssues ?? 0]
                    .map((f) => `"${f}"`)
                    .join(','),
            ),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showAlert('Exported!', 'success');
    }, [users, showAlert]);

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <AdminIcon fontSize="small" />;
            case 'moderator': return <ModeratorIcon fontSize="small" />;
            default: return <UserIcon fontSize="small" />;
        }
    };

    const getSourceIcon = (source: string) => {
        return source === 'mobile_app' ? <MobileIcon fontSize="small" /> : <WebIcon fontSize="small" />;
    };

    const openEditDialog = (user: AppUser) => {
        setSelectedUser(user);
        setEditData({
            role: user.role,
            status: user.status,
            displayName: user.displayName,
            phone: user.phone ?? '',
        });
        setEditDialogOpen(true);
    };

    // Filtered users by tab
    const filteredUsers = activeTab === 0
        ? users
        : activeTab === 1
            ? users.filter((u) => u.source === 'mobile_app')
            : users.filter((u) => u.role === 'admin' || u.role === 'moderator' || u.role === 'department_head');

    // Stats
    const stats = {
        total: users.length,
        active: users.filter((u) => u.status === 'active').length,
        mobile: users.filter((u) => u.source === 'mobile_app').length,
        admin: users.filter((u) => u.role === 'admin' || u.role === 'moderator').length,
    };

    // DataGrid columns
    const columns = React.useMemo<GridColDef[]>(() => [
        {
            field: 'displayName', headerName: 'User', flex: 1.5, minWidth: 200,
            renderCell: (params) => (
                <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {(params.value as string)?.[0]?.toUpperCase() ?? 'U'}
                    </Avatar>
                    <Box>
                        <Typography variant="body2">{params.value as string}</Typography>
                        <Typography variant="caption" color="textSecondary">{params.row.email}</Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'role', headerName: 'Role', width: 130,
            renderCell: (params) => (
                <Chip icon={getRoleIcon(params.value as string)} label={params.value as string} size="small"
                    color={params.value === 'admin' ? 'error' : params.value === 'moderator' ? 'warning' : 'default'} />
            ),
        },
        {
            field: 'status', headerName: 'Status', width: 110,
            renderCell: (params) => (
                <Chip label={params.value as string} size="small"
                    color={(params.value as string) === 'active' ? 'success' : (params.value as string) === 'suspended' ? 'error' : 'default'} />
            ),
        },
        {
            field: 'source', headerName: 'Source', width: 120,
            renderCell: (params) => (
                <Box display="flex" alignItems="center" gap={0.5}>
                    {getSourceIcon(params.value as string)}
                    <Typography variant="caption">{(params.value as string) === 'mobile_app' ? 'Mobile' : 'Web'}</Typography>
                </Box>
            ),
        },
        { field: 'totalIssues', headerName: 'Issues', width: 80, type: 'number' },
        { field: 'resolvedIssues', headerName: 'Resolved', width: 80, type: 'number' },
        {
            field: 'createdAt', headerName: 'Joined', width: 120,
            valueGetter: (_value, row) => formatDate(row.createdAt),
        },
        {
            field: 'actions', headerName: 'Actions', width: 130, sortable: false,
            renderCell: (params) => (
                <Box>
                    <IconButton size="small" onClick={() => openEditDialog(params.row as AppUser)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleToggleUserStatus(params.row as AppUser)}>
                        {(params.row as AppUser).status === 'active' ? <BlockIcon fontSize="small" color="error" /> : <ActivateIcon fontSize="small" color="success" />}
                    </IconButton>
                </Box>
            ),
        },
    ], [handleToggleUserStatus]);

    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>👥 Users</Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" startIcon={<AddUserIcon />} onClick={() => setAddUserDialogOpen(true)}>Add User</Button>
                    <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport}>Export</Button>
                </Stack>
            </Box>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Users', value: stats.total, color: '#1976d2' },
                    { label: 'Active', value: stats.active, color: '#4caf50' },
                    { label: 'Mobile Users', value: stats.mobile, color: '#ff9800' },
                    { label: 'Admin/Moderators', value: stats.admin, color: '#9c27b0' },
                ].map((s) => (
                    <Grid size={{ xs: 6, md: 3 }} key={s.label}>
                        <Card elevation={2}><CardContent>
                            <Typography color="textSecondary" variant="body2">{s.label}</Typography>
                            <Typography variant="h5" sx={{ color: s.color, fontWeight: 'bold' }}>{s.value}</Typography>
                        </CardContent></Card>
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
                    <Tab label={`All (${users.length})`} />
                    <Tab label={`Mobile (${stats.mobile})`} />
                    <Tab label={`Admins (${stats.admin})`} />
                </Tabs>
            </Paper>

            {/* DataGrid */}
            <Box sx={{ height: 550 }}>
                <DataGrid
                    rows={filteredUsers}
                    columns={columns}
                    disableRowSelectionOnClick
                    slots={{ toolbar: GridToolbar }}
                    paginationModel={{ page: 0, pageSize: 25 }}
                    pageSizeOptions={[10, 25, 50]}
                />
            </Box>

            {/* Add User Dialog */}
            <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New User</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField fullWidth label="Email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
                        <TextField fullWidth label="Display Name" value={newUser.displayName} onChange={(e) => setNewUser((p) => ({ ...p, displayName: e.target.value }))} />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select value={newUser.role} label="Role" onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRole }))}>
                                <MenuItem value="citizen">Citizen</MenuItem>
                                <MenuItem value="moderator">Moderator</MenuItem>
                                <MenuItem value="department_head">Department Head</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddUser}>Add User</Button>
                </DialogActions>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit User</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField fullWidth label="Display Name" value={editData.displayName} onChange={(e) => setEditData((p) => ({ ...p, displayName: e.target.value }))} />
                        <TextField fullWidth label="Phone" value={editData.phone} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select value={editData.role} label="Role" onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value as UserRole }))}>
                                <MenuItem value="citizen">Citizen</MenuItem>
                                <MenuItem value="moderator">Moderator</MenuItem>
                                <MenuItem value="department_head">Department Head</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select value={editData.status} label="Status" onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value as UserStatus }))}>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="suspended">Suspended</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateUser}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UsersPage;
