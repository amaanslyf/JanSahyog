// src/pages/IssueDetail.js - COMPLETE ISSUE MANAGEMENT SCREEN
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
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Avatar,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  CalendarToday as DateIcon,
  Priority as PriorityIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ZoomIn as ZoomIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { useParams, useNavigate } from 'react-router-dom';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // Edit form states
  const [editData, setEditData] = useState({
    status: '',
    priority: '',
    adminNotes: '',
    assignedTo: ''
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

  // Fetch issue and comments
  useEffect(() => {
    if (!id) return;

    // Fetch issue details
    const unsubscribeIssue = onSnapshot(
      doc(db, 'civicIssues', id), 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setIssue({ id: doc.id, ...data });
          setEditData({
            status: data.status || 'Open',
            priority: data.priority || 'Medium',
            adminNotes: data.adminNotes || '',
            assignedTo: data.assignedTo || ''
          });
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

    // Fetch comments
    const unsubscribeComments = onSnapshot(
      query(
        collection(db, 'civicIssues', id, 'comments'),
        orderBy('createdAt', 'desc')
      ),
      (querySnapshot) => {
        const commentsList = [];
        querySnapshot.forEach((doc) => {
          commentsList.push({ id: doc.id, ...doc.data() });
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
  }, [id, navigate]);

  // Handle issue update
  const handleSaveChanges = async () => {
    try {
      const issueRef = doc(db, 'civicIssues', id);
      await updateDoc(issueRef, {
        ...editData,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'Admin'
      });
      
      // Add activity log comment
      await addDoc(collection(db, 'civicIssues', id, 'comments'), {
        type: 'system',
        message: `Issue updated: Status changed to "${editData.status}", Priority set to "${editData.priority}"`,
        author: auth.currentUser?.email || 'Admin',
        createdAt: serverTimestamp(),
        isSystemComment: true
      });

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
        author: auth.currentUser?.email || 'Admin',
        createdAt: serverTimestamp(),
        isSystemComment: false
      });
      
      setNewComment('');
      showAlert('Comment added successfully!', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showAlert('Failed to add comment', 'error');
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
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            Issue Details
          </Typography>
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
                    assignedTo: issue.assignedTo || ''
                  });
                }}
              >
                Cancel
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
            >
              Edit Issue
            </Button>
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
                  {issue.title}
                </Typography>
                <Box display="flex" gap={1}>
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
                    </>
                  ) : (
                    <>
                      <Chip 
                        label={issue.status} 
                        sx={{ 
                          bgcolor: getStatusColor(issue.status),
                          color: 'white',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Chip 
                        label={issue.priority} 
                        variant="outlined"
                        sx={{ 
                          borderColor: getPriorityColor(issue.priority),
                          color: getPriorityColor(issue.priority),
                          fontWeight: 'bold'
                        }} 
                      />
                    </>
                  )}
                </Box>
              </Box>

              <Typography variant="body1" color="textSecondary" paragraph>
                {issue.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                    <Typography variant="body2">
                      <strong>Reported by:</strong> {issue.reportedBy}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <DateIcon sx={{ mr: 1, color: 'action.active' }} />
                    <Typography variant="body2">
                      <strong>Reported:</strong> {formatDate(issue.reportedAt)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationIcon sx={{ mr: 1, color: 'action.active' }} />
                    <Typography variant="body2">
                      <strong>Location:</strong> {issue.address}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Issue Photo */}
          {issue.imageUri && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Issue Photo
                </Typography>
                <Box
                  component="img"
                  src={issue.imageUri}
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
                Admin Notes
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
                Activity & Comments ({comments.length})
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
                          {comment.isSystemComment ? <WarningIcon fontSize="small" /> : <CommentIcon fontSize="small" />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: comment.isSystemComment ? 'normal' : 'bold' }}>
                            {comment.author}
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
            Issue Photo
            <IconButton onClick={() => setImageDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {issue.imageUri && (
            <Box
              component="img"
              src={issue.imageUri}
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
