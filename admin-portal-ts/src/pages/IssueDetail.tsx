import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, Button, IconButton,
    TextField, Alert, Stack, FormControl, InputLabel, Select, MenuItem, Avatar,
    List, ListItem, ListItemText, ListItemAvatar, CircularProgress,
} from '@mui/material';
import {
    ArrowBack, Edit as EditIcon, Save as SaveIcon, Send as SendIcon,
    AccessTime, LocationOn, Person, Business,
} from '@mui/icons-material';
import {
    doc, onSnapshot, updateDoc, collection, addDoc, query, orderBy,
    serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';
import { getStatusColor, getPriorityColor } from '../utils/colorUtils';
import { useAlert } from '../hooks/useAlert';
import { clearDuplicateFlag } from '../services/duplicateDetectionService';
import type { CivicIssue, Comment, Department, IssueStatus, IssuePriority } from '../types';

const IssueDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { alert, showAlert, dismissAlert } = useAlert();

    const [issue, setIssue] = useState<CivicIssue | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [editData, setEditData] = useState({ status: '' as IssueStatus, priority: '' as IssuePriority, department: '' });
    const unsubscribeRef = useRef<(() => void)[]>([]);

    // Load issue data + comments
    useEffect(() => {
        if (!id) return;

        // Issue listener
        const issueUnsub = onSnapshot(doc(db, 'civicIssues', id), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as CivicIssue;
                setIssue(data);
                setEditData({ status: data.status, priority: data.priority, department: data.assignedDepartment });
            }
            setLoading(false);
        });

        // Comments listener
        const commentsQuery = query(collection(db, 'civicIssues', id, 'comments'), orderBy('createdAt', 'asc'));
        const commentsUnsub = onSnapshot(commentsQuery, (snapshot) => {
            const list: Comment[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Comment));
            setComments(list);
        });

        unsubscribeRef.current = [issueUnsub, commentsUnsub];

        // Load departments
        getDocs(collection(db, 'departments')).then((snapshot) => {
            const list: Department[] = [];
            snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Department));
            setDepartments(list);
        });

        return () => unsubscribeRef.current.forEach((unsub) => unsub());
    }, [id]);

    const handleSaveChanges = useCallback(async () => {
        if (!id || !issue) return;
        try {
            await updateDoc(doc(db, 'civicIssues', id), {
                status: editData.status,
                priority: editData.priority,
                assignedDepartment: editData.department,
                lastUpdated: serverTimestamp(),
            });

            // Log status change as comment
            if (editData.status !== issue.status) {
                await addDoc(collection(db, 'civicIssues', id, 'comments'), {
                    text: `Status changed from "${issue.status}" to "${editData.status}"`,
                    author: 'Admin',
                    authorEmail: auth.currentUser?.email ?? 'admin',
                    type: 'status_change',
                    createdAt: serverTimestamp(),
                });
            }

            setEditing(false);
            showAlert('Issue updated!', 'success');
        } catch (error) {
            console.error('Error updating issue:', error);
            showAlert('Failed to update', 'error');
        }
    }, [id, issue, editData, showAlert]);

    const handleAddComment = useCallback(async () => {
        if (!id || !newComment.trim()) return;
        try {
            await addDoc(collection(db, 'civicIssues', id, 'comments'), {
                text: newComment.trim(),
                author: auth.currentUser?.displayName ?? 'Admin',
                authorEmail: auth.currentUser?.email ?? 'admin',
                type: 'comment',
                createdAt: serverTimestamp(),
            });
            setNewComment('');
            showAlert('Comment added!', 'success');
        } catch (error) {
            console.error('Error adding comment:', error);
            showAlert('Failed to add comment', 'error');
        }
    }, [id, newComment, showAlert]);

    const handleQuickStatusChange = useCallback(async (newStatus: IssueStatus) => {
        if (!id) return;
        try {
            await updateDoc(doc(db, 'civicIssues', id), { status: newStatus, lastUpdated: serverTimestamp() });
            await addDoc(collection(db, 'civicIssues', id, 'comments'), {
                text: `Status changed to "${newStatus}"`,
                author: 'Admin',
                authorEmail: auth.currentUser?.email ?? 'admin',
                type: 'status_change',
                createdAt: serverTimestamp(),
            });
            showAlert(`Status changed to ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error changing status:', error);
            showAlert('Failed to change status', 'error');
        }
    }, [id, showAlert]);

    const handleClearDuplicate = useCallback(async () => {
        if (!id) return;
        try {
            await clearDuplicateFlag(id);
            showAlert('Duplicate flag removed', 'success');
        } catch (error) {
            console.error('Error clearing duplicate flag:', error);
            showAlert('Failed to clear flag', 'error');
        }
    }, [id, showAlert]);

    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
    }

    if (!issue) {
        return <Typography variant="h5" color="error">Issue not found</Typography>;
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
                <IconButton onClick={() => navigate('/issues')}><ArrowBack /></IconButton>
                <Typography variant="h4" sx={{ fontWeight: 'bold', flex: 1 }}>{issue.title}</Typography>
                <Button
                    variant={editing ? 'contained' : 'outlined'}
                    startIcon={editing ? <SaveIcon /> : <EditIcon />}
                    onClick={editing ? handleSaveChanges : () => setEditing(true)}
                >
                    {editing ? 'Save' : 'Edit'}
                </Button>
            </Box>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            {/* Duplicate Warning */}
            {issue.duplicateOfId && (
                <Alert
                    severity="warning" sx={{ mb: 2 }}
                    action={
                        <Stack direction="row" spacing={1}>
                            <Button size="small" color="inherit" onClick={() => navigate(`/issue/${issue.duplicateOfId}`)}>
                                View Original
                            </Button>
                            <Button size="small" color="inherit" onClick={handleClearDuplicate}>
                                Not a Duplicate
                            </Button>
                        </Stack>
                    }
                >
                    ⚠️ Possible duplicate ({Math.round((issue.duplicateScore ?? 0) * 100)}% match)
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Main Details */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card elevation={3} sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Description</Typography>
                            <Typography>{issue.description}</Typography>
                        </CardContent>
                    </Card>

                    {/* Image */}
                    {(issue.imageUrl || issue.imageUri || issue.imageBase64) && (
                        <Card elevation={3} sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Photo</Typography>
                                <Box
                                    component="img"
                                    src={issue.imageUrl || issue.imageUri || (issue.imageBase64 ? `data:image/jpeg;base64,${issue.imageBase64}` : '')}
                                    alt="Issue"
                                    sx={{ maxWidth: '100%', maxHeight: 500, borderRadius: 1, objectFit: 'contain' }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* AI Analysis */}
                    {issue.aiAnalysis && (
                        <Card elevation={3} sx={{ mb: 3, border: '1px solid', borderColor: 'info.light' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    🤖 AI Analysis
                                </Typography>
                                <Stack spacing={1.5}>
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">Suggested Category</Typography>
                                        <Chip label={issue.aiAnalysis.suggestedCategory} color="primary" size="small" />
                                        {issue.aiAnalysis.suggestedCategory !== issue.category && (
                                            <Chip label={`citizen chose: ${issue.category}`} size="small" variant="outlined" sx={{ ml: 1 }} />
                                        )}
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">Confidence</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ flex: 1, height: 8, bgcolor: 'grey.200', borderRadius: 1 }}>
                                                <Box sx={{ width: `${Math.round(issue.aiAnalysis.confidence * 100)}%`, height: '100%', bgcolor: issue.aiAnalysis.confidence > 0.7 ? 'success.main' : 'warning.main', borderRadius: 1 }} />
                                            </Box>
                                            <Typography variant="body2" fontWeight="bold">{Math.round(issue.aiAnalysis.confidence * 100)}%</Typography>
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">AI Description</Typography>
                                        <Typography variant="body2">{issue.aiAnalysis.description}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">Severity</Typography>
                                        <Chip
                                            label={issue.aiAnalysis.severity}
                                            size="small"
                                            color={
                                                issue.aiAnalysis.severity === 'critical' ? 'error' :
                                                    issue.aiAnalysis.severity === 'high' ? 'warning' :
                                                        issue.aiAnalysis.severity === 'medium' ? 'info' : 'default'
                                            }
                                        />
                                    </Box>
                                    {issue.aiAnalysis.tags?.length > 0 && (
                                        <Box>
                                            <Typography variant="body2" color="textSecondary">Tags</Typography>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                {issue.aiAnalysis.tags.map((tag) => (
                                                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {/* Comments */}
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Comments & Activity ({comments.length})</Typography>
                            <List>
                                {comments.map((comment) => (
                                    <ListItem key={comment.id} alignItems="flex-start" divider>
                                        <ListItemAvatar>
                                            <Avatar>{comment.author?.[0] ?? 'A'}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<Box display="flex" justifyContent="space-between">
                                                <Typography fontWeight="bold">{comment.author}</Typography>
                                                <Typography variant="caption" color="textSecondary">{formatDate(comment.createdAt)}</Typography>
                                            </Box>}
                                            secondary={comment.text}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            <Box display="flex" gap={1} mt={2}>
                                <TextField
                                    fullWidth size="small" placeholder="Add a comment..."
                                    value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                <IconButton color="primary" onClick={handleAddComment} disabled={!newComment.trim()}>
                                    <SendIcon />
                                </IconButton>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Sidebar */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card elevation={3} sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Details</Typography>
                            <Stack spacing={2}>
                                {editing ? (
                                    <>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Status</InputLabel>
                                            <Select value={editData.status} label="Status" onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value as IssueStatus }))}>
                                                <MenuItem value="Open">Open</MenuItem>
                                                <MenuItem value="In Progress">In Progress</MenuItem>
                                                <MenuItem value="Resolved">Resolved</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Priority</InputLabel>
                                            <Select value={editData.priority} label="Priority" onChange={(e) => setEditData((p) => ({ ...p, priority: e.target.value as IssuePriority }))}>
                                                <MenuItem value="Critical">Critical</MenuItem>
                                                <MenuItem value="High">High</MenuItem>
                                                <MenuItem value="Medium">Medium</MenuItem>
                                                <MenuItem value="Low">Low</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Department</InputLabel>
                                            <Select value={editData.department} label="Department" onChange={(e) => setEditData((p) => ({ ...p, department: e.target.value }))}>
                                                {departments.filter((d) => d.active).map((d) => <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </>
                                ) : (
                                    <>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="textSecondary">Status</Typography>
                                            <Chip label={issue.status} color={getStatusColor(issue.status)} size="small" />
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="textSecondary">Priority</Typography>
                                            <Chip label={issue.priority} color={getPriorityColor(issue.priority)} size="small" />
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Business fontSize="small" color="action" />
                                            <Typography>{issue.assignedDepartment || 'Unassigned'}</Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Person fontSize="small" color="action" />
                                            <Typography>{issue.reportedBy}</Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <AccessTime fontSize="small" color="action" />
                                            <Typography variant="body2">{formatDate(issue.reportedAt)}</Typography>
                                        </Box>
                                        {issue.location?.address && (
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <LocationOn fontSize="small" color="action" />
                                                <Typography variant="body2">{issue.location.address}</Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                            <Stack spacing={1}>
                                <Button fullWidth variant="outlined" color="warning" onClick={() => handleQuickStatusChange('In Progress')} disabled={issue.status === 'In Progress'}>
                                    Mark In Progress
                                </Button>
                                <Button fullWidth variant="outlined" color="success" onClick={() => handleQuickStatusChange('Resolved')} disabled={issue.status === 'Resolved'}>
                                    Mark Resolved
                                </Button>
                                <Button fullWidth variant="outlined" color="error" onClick={() => handleQuickStatusChange('Open')} disabled={issue.status === 'Open'}>
                                    Re-open Issue
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default IssueDetail;
