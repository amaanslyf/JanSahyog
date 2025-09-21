// src/pages/IssueDetail.js - FIXED VERSION (NO ERRORS)
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Avatar,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  CalendarToday as DateIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ZoomIn as ZoomIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Business as DepartmentIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { useParams, useNavigate } from 'react-router-dom';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [reporter, setReporter] = useState(null);
  const [assignedDept, setAssignedDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // Enhanced edit form states
  const [editData, setEditData] = useState({
    status: '',
    priority: '',
    adminNotes: '',
    assignedDepartment: '',
    category: ''
  });

  // Safe date formatter
  const formatDate = (timestamp) => {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date)) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      return 'Unknown Date';
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Show alert
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  // Load all related data
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        // Load departments
        const deptSnapshot = await getDocs(collection(db, 'departments'));
        const departmentsList = [];
        deptSnapshot.forEach((doc) => {
          departmentsList.push({ id: doc.id, ...doc.data() });
        });
        setDepartments(departmentsList);

        // Load users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = [];
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          usersList.push({
            id: doc.id,
            displayName: userData.displayName || userData.email?.split('@')[0] || 'Anonymous',
            email: userData.email,
            source: userData.source,
            points: userData.points || 0,
            issuesReported: userData.issuesReported || 0
          });
        });
        setUsers(usersList);

        // Set up issue listener
        const unsubscribeIssue = onSnapshot(
          doc(db, 'civicIssues', id), 
          (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              const issueData = { id: doc.id, ...data };
              setIssue(issueData);
              
              // Set edit form data
              setEditData({
                status: data.status || 'Open',
                priority: data.priority || 'Medium',
                adminNotes: data.adminNotes || '',
                assignedDepartment: data.assignedDepartment || '',
                category: data.category || 'Other'
              });

              // Find reporter info - FIXED: use usersList instead of users
              const reporterInfo = usersList.find(u => u.id === data.reportedById);
              setReporter(reporterInfo);

              // Find assigned department info - FIXED: use departmentsList instead of deptList
              const deptInfo = departmentsList.find(d => d.name === data.assignedDepartment);
              setAssignedDept(deptInfo);

            } else {
              showAlert('Issue not found', 'error');
              navigate('/issues');
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching issue:', error);
            showAlert('Failed to load issue', 'error');
            setLoading(false);
          }
        );

        // Set up comments listener
        const unsubscribeComments = onSnapshot(
          query(
            collection(db, 'civicIssues', id, 'comments'),
            orderBy('createdAt', 'desc')
          ),
          (querySnapshot) => {
            const commentsList = [];
            querySnapshot.forEach((doc) => {
              commentsList.push({ 
                id: doc.id, 
                ...doc.data(),
                createdAt: doc.data().createdAt || new Date()
              });
            });
            setComments(commentsList);
          },
          (error) => {
            console.error('Error fetching comments:', error);
          }
        );

        return () => {
          unsubscribeIssue();
          unsubscribeComments();
        };

      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  // Handle issue update with notification
  const handleSaveChanges = async () => {
    try {
      const issueRef = doc(db, 'civicIssues', id);
      const previousStatus = issue.status;
      const previousDepartment = issue.assignedDepartment;
      
      await updateDoc(issueRef, {
        ...editData,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'Admin'
      });
      
      // Create activity log entries for changes
      const changes = [];
      if (previousStatus !== editData.status) {
        changes.push(`Status changed from "${previousStatus}" to "${editData.status}"`);
      }
      if (previousDepartment !== editData.assignedDepartment) {
        if (editData.assignedDepartment && !previousDepartment) {
          changes.push(`Assigned to ${editData.assignedDepartment} department`);
        } else if (!editData.assignedDepartment && previousDepartment) {
          changes.push(`Unassigned from ${previousDepartment} department`);
        } else if (editData.assignedDepartment !== previousDepartment) {
          changes.push(`Reassigned from ${previousDepartment} to ${editData.assignedDepartment}`);
        }
      }

      // Add system comment for changes
      if (changes.length > 0) {
        await addDoc(collection(db, 'civicIssues', id, 'comments'), {
          type: 'system',
          message: changes.join(', '),
          author: auth.currentUser?.email || 'Admin',
          createdAt: serverTimestamp(),
          isSystemComment: true
        });
      }

      // Send notification to user if status changed to resolved
      if (editData.status === 'Resolved' && previousStatus !== 'Resolved') {
        if (issue.reportedById) {
          try {
            await addDoc(collection(db, `users/${issue.reportedById}/notifications`), {
              title: 'Issue Resolved! ✅',
              body: `Your issue "${issue.title}" has been resolved. Thank you for your patience.`,
              type: 'issue_update',
              read: false,
              sentBy: 'admin',
              sentAt: serverTimestamp(),
              data: {
                type: 'issue_resolved',
                issueId: id,
                issueTitle: issue.title
              }
            });
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
          }
        }
      }

      showAlert('Issue updated successfully!', 'success');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating issue:', error);
      showAlert('Failed to update issue', 'error');
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, 'civicIssues', id, 'comments'), {
        type: 'admin',
        message: newComment.trim(),
        author: auth.currentUser?.displayName || auth.currentUser?.email || 'Admin',
        createdAt: serverTimestamp(),
        isSystemComment: false
      });
      
      // Send notification to user about new comment
      if (issue.reportedById) {
        try {
          await addDoc(collection(db, `users/${issue.reportedById}/notifications`), {
            title: 'New Update on Your Issue 💬',
            body: `There's a new comment on your issue "${issue.title}". Check the app for details.`,
            type: 'issue_update',
            read: false,
            sentBy: 'admin',
            sentAt: serverTimestamp(),
            data: {
              type: 'issue_comment',
              issueId: id,
              issueTitle: issue.title
            }
          });
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
        }
      }
      
      setNewComment('');
      showAlert('Comment added successfully!', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showAlert('Failed to add comment', 'error');
    }
  };

  // Quick status actions
  const handleQuickStatusChange = async (newStatus) => {
    try {
      const issueRef = doc(db, 'civicIssues', id);
      await updateDoc(issueRef, {
        status: newStatus,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'Admin'
      });

      // Add system comment
      await addDoc(collection(db, 'civicIssues', id, 'comments'), {
        type: 'system',
        message: `Status changed to "${newStatus}"`,
        author: auth.currentUser?.email || 'Admin',
        createdAt: serverTimestamp(),
        isSystemComment: true
      });

      showAlert(`Issue marked as ${newStatus}!`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert('Failed to update status', 'error');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return '#f44336';
      case 'In Progress': return '#ff9800';
      case 'Resolved': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#d32f2f';
      case 'High': return '#f57c00';
      case 'Medium': return '#1976d2';
      case 'Low': return '#388e3c';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography>Loading issue details...</Typography>
      </Box>
    );
  }

  if (!issue) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6">Issue not found</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/issues')} sx={{ mt: 2 }}>
          Back to Issues
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate('/issues')} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              Issue #{id.slice(-6)}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {issue.category} • Reported {formatDate(issue.reportedAt)}
            </Typography>
          </Box>
        </Box>
        <Box>
          {editMode ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveChanges}
              >
                Save Changes
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => {
                  setEditMode(false);
                  setEditData({
                    status: issue.status || 'Open',
                    priority: issue.priority || 'Medium',
                    adminNotes: issue.adminNotes || '',
                    assignedDepartment: issue.assignedDepartment || '',
                    category: issue.category || 'Other'
                  });
                }}
              >
                Cancel
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1}>
              {issue.status !== 'Resolved' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={() => handleQuickStatusChange('Resolved')}
                    size="small"
                  >
                    Mark Resolved
                  </Button>
                  {issue.status !== 'In Progress' && (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<WarningIcon />}
                      onClick={() => handleQuickStatusChange('In Progress')}
                      size="small"
                    >
                      In Progress
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
              >
                Edit Issue
              </Button>
            </Stack>
          )}
        </Box>
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

      <Grid container spacing={3}>
        {/* Left Column - Issue Details */}
        <Grid item xs={12} md={8}>
          {/* Main Issue Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', flex: 1 }}>
                  {issue.title || 'Untitled Issue'}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {editMode ? (
                    <>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={editData.status}
                          label="Status"
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        >
                          <MenuItem value="Open">Open</MenuItem>
                          <MenuItem value="In Progress">In Progress</MenuItem>
                          <MenuItem value="Resolved">Resolved</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={editData.priority}
                          label="Priority"
                          onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Medium">Medium</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                          <MenuItem value="Critical">Critical</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={editData.category}
                          label="Category"
                          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                        >
                          <MenuItem value="Garbage">Garbage</MenuItem>
                          <MenuItem value="Water Leak">Water Leak</MenuItem>
                          <MenuItem value="Roads">Roads</MenuItem>
                          <MenuItem value="Streetlight">Streetlight</MenuItem>
                          <MenuItem value="Pollution">Pollution</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </>
                  ) : (
                    <>
                      <Chip 
                        label={issue.status || 'Open'} 
                        sx={{ 
                          bgcolor: getStatusColor(issue.status),
                          color: 'white',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Chip 
                        label={issue.priority || 'Medium'} 
                        variant="outlined"
                        sx={{ 
                          borderColor: getPriorityColor(issue.priority),
                          color: getPriorityColor(issue.priority),
                          fontWeight: 'bold'
                        }} 
                      />
                      <Chip 
                        label={issue.category || 'Other'} 
                        color="primary"
                        variant="outlined"
                      />
                    </>
                  )}
                </Box>
              </Box>

              <Typography variant="body1" color="textSecondary" paragraph>
                {issue.description || 'No description provided'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Issue Details Grid */}
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Reported by:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          {(reporter?.displayName || issue.reportedBy || 'A')[0]}
                        </Avatar>
                        <Typography variant="body2">
                          {reporter?.displayName || issue.reportedBy || 'Anonymous'}
                        </Typography>
                        {reporter && (
                          <Chip 
                            label={`${reporter.points || 0} pts`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <DateIcon sx={{ mr: 1, color: 'action.active' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Reported:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(issue.reportedAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <LocationIcon sx={{ mr: 1, color: 'action.active' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Location:
                      </Typography>
                      <Typography variant="body2">
                        {issue.location?.address || issue.address || 'Location not available'}
                      </Typography>
                      {issue.location?.latitude && issue.location?.longitude && (
                        <Typography variant="caption" color="textSecondary">
                          Coordinates: {issue.location.latitude.toFixed(6)}, {issue.location.longitude.toFixed(6)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <HistoryIcon sx={{ mr: 1, color: 'action.active' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Last Updated:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(issue.lastUpdated || issue.reportedAt)}
                        {issue.updatedBy && (
                          <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                            by {issue.updatedBy}
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Department Assignment */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <DepartmentIcon sx={{ mr: 1 }} />
                Department Assignment
              </Typography>
              {editMode ? (
                <FormControl fullWidth>
                  <InputLabel>Assign Department</InputLabel>
                  <Select
                    value={editData.assignedDepartment}
                    label="Assign Department"
                    onChange={(e) => setEditData({ ...editData, assignedDepartment: e.target.value })}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {departments.filter(dept => dept.active).map((dept) => (
                      <MenuItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Box>
                  {assignedDept ? (
                    <Card variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {assignedDept.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {assignedDept.description}
                        </Typography>
                        <Grid container spacing={2}>
                          {assignedDept.head && (
                            <Grid item xs={12} sm={6}>
                              <Box display="flex" alignItems="center">
                                <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                                <Typography variant="body2">
                                  Head: {assignedDept.head}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {assignedDept.email && (
                            <Grid item xs={12} sm={6}>
                              <Box display="flex" alignItems="center">
                                <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
                                <Typography variant="body2">
                                  {assignedDept.email}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {assignedDept.phone && (
                            <Grid item xs={12} sm={6}>
                              <Box display="flex" alignItems="center">
                                <PhoneIcon sx={{ mr: 1, fontSize: 16 }} />
                                <Typography variant="body2">
                                  {assignedDept.phone}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center">
                              <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                              <Typography variant="body2">
                                {assignedDept.workingHours || '9 AM - 5 PM'}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert severity="warning">
                      This issue is not assigned to any department yet.
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Issue Photo */}
          {(issue.imageUri || issue.imageBase64) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Issue Photo
                </Typography>
                <Box
                  component="img"
                  src={issue.imageBase64 ? `data:image/jpeg;base64,${issue.imageBase64}` : issue.imageUri}
                  alt="Issue photo"
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'cover',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.9 }
                  }}
                  onClick={() => setImageDialogOpen(true)}
                />
                <Button
                  startIcon={<ZoomIcon />}
                  onClick={() => setImageDialogOpen(true)}
                  sx={{ mt: 1 }}
                >
                  View Full Size
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Admin Notes */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Internal Admin Notes
              </Typography>
              {editMode ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editData.adminNotes}
                  onChange={(e) => setEditData({ ...editData, adminNotes: e.target.value })}
                  placeholder="Add internal notes about this issue..."
                />
              ) : (
                <Typography variant="body2" color="textSecondary">
                  {issue.adminNotes || 'No admin notes yet.'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Comments & Activity */}
        <Grid item xs={12} md={4}>
          {/* Quick Actions */}
          {!editMode && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Stack spacing={1}>
                  {issue.status !== 'In Progress' && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      startIcon={<WarningIcon />}
                      onClick={() => handleQuickStatusChange('In Progress')}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {issue.status !== 'Resolved' && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => handleQuickStatusChange('Resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<NotificationIcon />}
                    onClick={() => showAlert('Notification sent to user', 'info')}
                  >
                    Notify Reporter
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Add Comment */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CommentIcon sx={{ mr: 1 }} />
                Add Admin Comment
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or update..."
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Add Comment
              </Button>
            </CardContent>
          </Card>

          {/* Comments History */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Badge badgeContent={comments.length} color="primary">
                  <CommentIcon sx={{ mr: 1 }} />
                </Badge>
                Activity & Comments
              </Typography>
              <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <ListItem key={comment.id} alignItems="flex-start" divider>
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: comment.isSystemComment ? '#ff9800' : '#1976d2',
                          width: 32, 
                          height: 32 
                        }}>
                          {comment.isSystemComment ? (
                            <HistoryIcon fontSize="small" />
                          ) : (
                            <CommentIcon fontSize="small" />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ 
                            fontWeight: comment.isSystemComment ? 'normal' : 'bold',
                            color: comment.isSystemComment ? 'text.secondary' : 'text.primary'
                          }}>
                            {comment.author}
                            {comment.isSystemComment && (
                              <Chip 
                                label="System" 
                                size="small" 
                                sx={{ ml: 1, fontSize: 10 }}
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="textPrimary" sx={{ mt: 0.5 }}>
                              {comment.message}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                              {formatDate(comment.createdAt)}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                    No comments yet
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Photo Dialog */}
      <Dialog 
        open={imageDialogOpen} 
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Issue Photo - {issue.title}
            <IconButton onClick={() => setImageDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {(issue.imageUri || issue.imageBase64) && (
            <Box
              component="img"
              src={issue.imageBase64 ? `data:image/jpeg;base64,${issue.imageBase64}` : issue.imageUri}
              alt="Issue photo"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default IssueDetail;
