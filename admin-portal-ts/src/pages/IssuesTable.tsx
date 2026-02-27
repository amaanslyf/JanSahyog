import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Button, IconButton, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert, Stack, FormControl,
    InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import {
    Edit as EditIcon, Delete as DeleteIcon,
    Visibility as ViewIcon, Download as ExportIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbar, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import {
    collection, onSnapshot, query, doc, updateDoc, deleteDoc,
    orderBy, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { formatDate, toDate } from '../utils/dateUtils';
import { getStatusColor, getPriorityColor } from '../utils/colorUtils';
import { useAlert } from '../hooks/useAlert';
import type { CivicIssue, Department, IssueStatus, IssuePriority } from '../types';

// ─── View Dialog ─────────────────────────────────────────────────────────────

interface ViewDialogProps {
    open: boolean;
    issue: CivicIssue | null;
    onClose: () => void;
}

const ViewIssueDialog: React.FC<ViewDialogProps> = ({ open, issue, onClose }) => {
    if (!issue) return null;
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{issue.title}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Typography><strong>Category:</strong> {issue.category}</Typography>
                    <Typography><strong>Description:</strong> {issue.description}</Typography>
                    <Typography><strong>Status:</strong> <Chip label={issue.status} color={getStatusColor(issue.status)} size="small" /></Typography>
                    <Typography><strong>Priority:</strong> <Chip label={issue.priority} color={getPriorityColor(issue.priority)} size="small" /></Typography>
                    <Typography><strong>Department:</strong> {issue.assignedDepartment || 'Unassigned'}</Typography>
                    <Typography><strong>Reported By:</strong> {issue.reportedBy}</Typography>
                    <Typography><strong>Reported At:</strong> {formatDate(issue.reportedAt)}</Typography>
                    <Typography><strong>Last Updated:</strong> {formatDate(issue.lastUpdated)}</Typography>
                    {issue.location?.address && <Typography><strong>Location:</strong> {issue.location.address}</Typography>}
                    {issue.imageUrl && <Box component="img" src={issue.imageUrl} alt="Issue" sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: 1 }} />}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Edit Dialog ─────────────────────────────────────────────────────────────

interface EditDialogProps {
    open: boolean;
    issue: CivicIssue | null;
    departments: Department[];
    onClose: () => void;
    onSave: (issueId: string, updates: Partial<CivicIssue>) => Promise<void>;
}

const EditIssueDialog: React.FC<EditDialogProps> = ({ open, issue, departments, onClose, onSave }) => {
    const [status, setStatus] = useState<IssueStatus>('Open');
    const [priority, setPriority] = useState<IssuePriority>('Medium');
    const [department, setDepartment] = useState('');

    useEffect(() => {
        if (issue) {
            setStatus(issue.status);
            setPriority(issue.priority);
            setDepartment(issue.assignedDepartment);
        }
    }, [issue]);

    const handleSave = async () => {
        if (!issue) return;
        await onSave(issue.id, {
            status,
            priority,
            assignedDepartment: department,
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Issue</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value as IssueStatus)}>
                            <MenuItem value="Open">Open</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Resolved">Resolved</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value as IssuePriority)}>
                            <MenuItem value="Critical">Critical</MenuItem>
                            <MenuItem value="High">High</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Department</InputLabel>
                        <Select value={department} label="Department" onChange={(e) => setDepartment(e.target.value)}>
                            {departments.filter((d) => d.active).map((dept) => (
                                <MenuItem key={dept.id} value={dept.name}>{dept.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const IssuesTable: React.FC = () => {
    const [issues, setIssues] = useState<CivicIssue[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ ids: new Set(), type: 'include' });
    const { alert, showAlert, dismissAlert } = useAlert();
    const navigate = useNavigate();
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Load issues
    useEffect(() => {
        const issuesQuery = query(collection(db, 'civicIssues'), orderBy('reportedAt', 'desc'));
        const unsubscribe = onSnapshot(issuesQuery, (snapshot) => {
            const list: CivicIssue[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                list.push({ id: docSnap.id, ...data } as CivicIssue);
            });
            setIssues(list);
            setLoading(false);
        });
        unsubscribeRef.current = unsubscribe;
        return () => unsubscribe();
    }, []);

    // Load departments
    useEffect(() => {
        const loadDepts = async () => {
            const snapshot = await getDocs(collection(db, 'departments'));
            const list: Department[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Department));
            setDepartments(list);
        };
        loadDepts();
    }, []);

    const handleUpdateIssue = useCallback(async (issueId: string, updates: Partial<CivicIssue>) => {
        try {
            await updateDoc(doc(db, 'civicIssues', issueId), {
                ...updates,
                lastUpdated: serverTimestamp(),
            });
            showAlert('Issue updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating issue:', error);
            showAlert('Failed to update issue', 'error');
        }
    }, [showAlert]);

    const handleDeleteIssue = useCallback(async (issueId: string) => {
        try {
            await deleteDoc(doc(db, 'civicIssues', issueId));
            showAlert('Issue deleted successfully!', 'success');
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error deleting issue:', error);
            showAlert('Failed to delete issue', 'error');
        }
    }, [showAlert]);

    const handleBulkUpdate = useCallback(async (updates: Partial<CivicIssue>) => {
        try {
            const selectedIds = Array.from(rowSelection.ids) as string[];
            const promises = selectedIds.map((id) =>
                updateDoc(doc(db, 'civicIssues', id), { ...updates, lastUpdated: serverTimestamp() }),
            );
            await Promise.all(promises);
            showAlert(`${selectedIds.length} issues updated!`, 'success');
            setRowSelection({ ids: new Set(), type: 'include' });
        } catch (error) {
            console.error('Error in bulk update:', error);
            showAlert('Bulk update failed', 'error');
        }
    }, [rowSelection, showAlert]);

    const handleExport = useCallback(() => {
        const csv = [
            ['Title', 'Category', 'Status', 'Priority', 'Department', 'ReportedBy', 'ReportedAt'].join(','),
            ...issues.map((i) =>
                [i.title, i.category, i.status, i.priority, i.assignedDepartment, i.reportedBy, formatDate(i.reportedAt)]
                    .map((f) => `"${f}"`)
                    .join(','),
            ),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `issues-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showAlert('Exported!', 'success');
    }, [issues, showAlert]);

    // DataGrid columns
    const columns = React.useMemo<GridColDef[]>(() => [
        {
            field: 'title', headerName: 'Title', flex: 2, minWidth: 200,
            renderCell: (params) => (
                <Box display="flex" alignItems="center" gap={0.5}>
                    {params.row.duplicateOfId && <Chip label="DUP" size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />}
                    {params.value}
                </Box>
            ),
        },
        { field: 'category', headerName: 'Category', flex: 1, minWidth: 120 },
        {
            field: 'status', headerName: 'Status', width: 130,
            renderCell: (params) => <Chip label={params.value as IssueStatus} color={getStatusColor(params.value as IssueStatus)} size="small" />,
        },
        {
            field: 'priority', headerName: 'Priority', width: 120,
            renderCell: (params) => <Chip label={params.value as IssuePriority} color={getPriorityColor(params.value as IssuePriority)} size="small" />,
        },
        { field: 'assignedDepartment', headerName: 'Department', flex: 1, minWidth: 140 },
        { field: 'reportedBy', headerName: 'Reported By', flex: 1, minWidth: 150 },
        {
            field: 'reportedAt', headerName: 'Date', width: 130,
            valueGetter: (_value, row) => formatDate(row.reportedAt),
        },
        {
            field: 'sla', headerName: 'SLA', width: 120, sortable: false,
            renderCell: (params) => {
                const issue = params.row as CivicIssue;
                if (issue.status === 'Resolved') return <Chip label="✓ Done" size="small" color="success" sx={{ height: 22 }} />;
                const slaHours: Record<string, number> = { Critical: 4, High: 24, Medium: 48, Low: 72 };
                const deadline = slaHours[issue.priority] ?? 48;
                const reported = toDate(issue.reportedAt);
                const elapsed = (Date.now() - reported.getTime()) / (1000 * 60 * 60);
                const remaining = deadline - elapsed;
                if (remaining <= 0) return <Chip label="BREACHED" size="small" color="error" sx={{ height: 22, fontWeight: 'bold' }} />;
                const label = remaining < 1 ? `${Math.round(remaining * 60)}m` : `${Math.round(remaining)}h`;
                return <Chip label={label} size="small" color={remaining < deadline * 0.25 ? 'warning' : 'default'} sx={{ height: 22 }} />;
            },
        },
        {
            field: 'actions', headerName: 'Actions', width: 150, sortable: false,
            renderCell: (params) => (
                <Box>
                    <IconButton size="small" onClick={() => navigate(`/issue/${params.row.id}`)}><ViewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => { setSelectedIssue(params.row as CivicIssue); setEditDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { setSelectedIssue(params.row as CivicIssue); setDeleteDialogOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
            ),
        },
    ], [navigate]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress size={50} />
                <Typography ml={2}>Loading Issues...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    🗂️ Issues Management
                </Typography>
                <Stack direction="row" spacing={1}>
                    {rowSelection.ids.size > 0 && (
                        <>
                            <Button variant="outlined" color="warning" onClick={() => handleBulkUpdate({ status: 'In Progress' })}>
                                Mark In Progress ({rowSelection.ids.size})
                            </Button>
                            <Button variant="outlined" color="success" onClick={() => handleBulkUpdate({ status: 'Resolved' })}>
                                Mark Resolved ({rowSelection.ids.size})
                            </Button>
                        </>
                    )}
                    <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport}>Export CSV</Button>
                </Stack>
            </Box>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            <Box sx={{ height: 650, width: '100%' }}>
                <DataGrid
                    rows={issues}
                    columns={columns}
                    checkboxSelection
                    disableRowSelectionOnClick
                    onRowSelectionModelChange={(model) => setRowSelection(model)}
                    rowSelectionModel={rowSelection}
                    slots={{ toolbar: GridToolbar }}
                    paginationModel={{ page: 0, pageSize: 25 }}
                    pageSizeOptions={[10, 25, 50]}
                />
            </Box>

            {/* Dialogs */}
            <ViewIssueDialog open={viewDialogOpen} issue={selectedIssue} onClose={() => setViewDialogOpen(false)} />
            <EditIssueDialog
                open={editDialogOpen} issue={selectedIssue} departments={departments}
                onClose={() => setEditDialogOpen(false)} onSave={handleUpdateIssue}
            />
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Issue?</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete "{selectedIssue?.title}"? This cannot be undone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={() => selectedIssue && handleDeleteIssue(selectedIssue.id)}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default IssuesTable;
