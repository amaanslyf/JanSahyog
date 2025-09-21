// src/pages/MapPage.js - FIXED IMPORTS
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Drawer,
  CircularProgress,
  Grid,
} from '@mui/material';  // ✅ FIXED: FROM @mui/material

import {
  MyLocation as LocationIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Navigation as NavigationIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Business as DepartmentIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material';  // ✅ CORRECT: Icons from @mui/icons-material

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Enhanced custom marker icons for different issue statuses and priorities
const createCustomIcon = (status, priority, category) => {
  let color = '#f44336'; // Red for Open
  if (status === 'In Progress') color = '#ff9800'; // Orange
  if (status === 'Resolved') color = '#4caf50'; // Green
  
  let size = 25; // Default size
  if (priority === 'Critical') size = 35;
  if (priority === 'High') size = 30;
  if (priority === 'Low') size = 20;

  // Get emoji based on category
  let emoji = '🚨';
  switch (category) {
    case 'Garbage': emoji = '🗑️'; break;
    case 'Water Leak': emoji = '💧'; break;
    case 'Roads': emoji = '🛣️'; break;
    case 'Streetlight': emoji = '💡'; break;
    case 'Pollution': emoji = '🌫️'; break;
    default: emoji = '🚨';
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 25 ? '14px' : '12px'};
      ">
        ${emoji}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

// Component to handle map events and controls
const MapController = ({ center, zoom, onLocationFound }) => {
  const map = useMap();

  useMapEvents({
    locationfound: onLocationFound,
  });

  const handleLocateUser = () => {
    map.locate();
  };

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
      <Stack spacing={1}>
        <Tooltip title="Find My Location">
          <IconButton 
            onClick={handleLocateUser}
            sx={{ 
              bgcolor: 'white', 
              boxShadow: 1,
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            <LocationIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom In">
          <IconButton 
            onClick={handleZoomIn}
            sx={{ 
              bgcolor: 'white', 
              boxShadow: 1,
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton 
            onClick={handleZoomOut}
            sx={{ 
              bgcolor: 'white', 
              boxShadow: 1,
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
};

const MapPage = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default to Delhi
  const [mapZoom, setMapZoom] = useState(11);
  const [userLocation, setUserLocation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  // Safe date formatter
  const formatDate = (timestamp) => {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      if (timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date)) return date.toLocaleDateString();
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

  // Load real issues from Firebase
  useEffect(() => {
    const issuesQuery = query(
      collection(db, 'civicIssues'),
      orderBy('reportedAt', 'desc')
    );

    const unsubscribe = onSnapshot(issuesQuery, (querySnapshot) => {
      const issuesList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include issues that have valid coordinates
        if (data.location && data.location.latitude && data.location.longitude) {
          issuesList.push({ 
            id: doc.id, 
            ...data,
            coordinates: [data.location.latitude, data.location.longitude],
            reportedAt: data.reportedAt || new Date(),
            formattedDate: formatDate(data.reportedAt)
          });
        }
      });
      setIssues(issuesList);
      setLoading(false);
      
      if (issuesList.length === 0) {
        showAlert('No issues with location data found on the map', 'info');
      }
    }, (error) => {
      console.error('Error fetching issues:', error);
      setLoading(false);
      showAlert('Failed to load issues', 'error');
    });

    return () => unsubscribe();
  }, []);

  // Filter issues based on selected criteria
  useEffect(() => {
    let filtered = issues;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(issue => issue.priority === priorityFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(issue => issue.category === categoryFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(issue => issue.assignedDepartment === departmentFilter);
    }

    setFilteredIssues(filtered);
  }, [issues, statusFilter, priorityFilter, categoryFilter, departmentFilter]);

  // Handle marker click
  const handleMarkerClick = (issue) => {
    setSelectedIssue(issue);
    setMapCenter(issue.coordinates);
    setMapZoom(15);
    setSidebarOpen(true);
  };

  // Handle navigation to issue detail
  const handleViewIssueDetail = (issueId) => {
    navigate(`/issue/${issueId}`);
  };

  // Handle user location found
  const handleLocationFound = (e) => {
    setUserLocation(e.latlng);
    setMapCenter([e.latlng.lat, e.latlng.lng]);
    setMapZoom(13);
    showAlert('Your location has been found!', 'success');
  };

  // Get unique values for filters
  const getUniqueValues = (field) => {
    return [...new Set(issues.map(issue => issue[field]).filter(Boolean))].sort();
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

  // Calculate map statistics
  const mapStats = {
    total: filteredIssues.length,
    open: filteredIssues.filter(i => i.status === 'Open').length,
    inProgress: filteredIssues.filter(i => i.status === 'In Progress').length,
    resolved: filteredIssues.filter(i => i.status === 'Resolved').length,
    critical: filteredIssues.filter(i => i.priority === 'Critical').length,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography ml={2}>Loading map data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            🗺️ Issues Map View
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            Filters & List ({filteredIssues.length})
          </Button>
        </Box>

        {/* Alert */}
        {alert.show && (
          <Alert 
            severity={alert.severity} 
            onClose={() => setAlert({ show: false, message: '', severity: 'info' })} 
            sx={{ mt: 2 }}
          >
            {alert.message}
          </Alert>
        )}

        {/* Map Statistics */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6} sm={3} md={2}>
            <Card sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="primary">{mapStats.total}</Typography>
              <Typography variant="caption" color="textSecondary">Total</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Card sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="error">{mapStats.open}</Typography>
              <Typography variant="caption" color="textSecondary">Open</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Card sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="warning.main">{mapStats.inProgress}</Typography>
              <Typography variant="caption" color="textSecondary">In Progress</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Card sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="success.main">{mapStats.resolved}</Typography>
              <Typography variant="caption" color="textSecondary">Resolved</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Card sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="error.dark">{mapStats.critical}</Typography>
              <Typography variant="caption" color="textSecondary">Critical</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Dynamic Filters */}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All Status</MenuItem>
              {getUniqueValues('status').map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
              <MenuItem value="all">All Priority</MenuItem>
              {getUniqueValues('priority').map(priority => (
                <MenuItem key={priority} value={priority}>{priority}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
              <MenuItem value="all">All Categories</MenuItem>
              {getUniqueValues('category').map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Department</InputLabel>
            <Select value={departmentFilter} label="Department" onChange={(e) => setDepartmentFilter(e.target.value)}>
              <MenuItem value="all">All Departments</MenuItem>
              {getUniqueValues('assignedDepartment').map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear Filters Button */}
          {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || departmentFilter !== 'all') && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setDepartmentFilter('all');
              }}
            >
              Clear All Filters
            </Button>
          )}
        </Stack>

        {/* Active Filters Display */}
        {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || departmentFilter !== 'all') && (
          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
            <Typography variant="body2" color="textSecondary">Active filters:</Typography>
            {statusFilter !== 'all' && (
              <Chip 
                label={`Status: ${statusFilter}`} 
                size="small" 
                onDelete={() => setStatusFilter('all')}
                color="primary"
              />
            )}
            {priorityFilter !== 'all' && (
              <Chip 
                label={`Priority: ${priorityFilter}`} 
                size="small" 
                onDelete={() => setPriorityFilter('all')}
                color="secondary"
              />
            )}
            {categoryFilter !== 'all' && (
              <Chip 
                label={`Category: ${categoryFilter}`} 
                size="small" 
                onDelete={() => setCategoryFilter('all')}
                color="success"
              />
            )}
            {departmentFilter !== 'all' && (
              <Chip 
                label={`Dept: ${departmentFilter}`} 
                size="small" 
                onDelete={() => setDepartmentFilter('all')}
                color="warning"
              />
            )}
          </Box>
        )}
      </Box>

      {/* Map Container */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {filteredIssues.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%" bgcolor="grey.100">
            <Typography variant="h6" color="textSecondary">
              No issues with location data found for the selected filters
            </Typography>
          </Box>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Map Controls */}
            <MapController 
              center={mapCenter} 
              zoom={mapZoom}
              onLocationFound={handleLocationFound}
            />

            {/* User Location Marker */}
            {userLocation && (
              <Marker 
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: `
                    <div style="
                      background-color: #2196f3;
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      border: 3px solid white;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    "></div>
                  `,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              >
                <Popup>
                  <strong>Your Location</strong>
                </Popup>
              </Marker>
            )}

            {/* Real Issue Markers */}
            {filteredIssues.map((issue) => {
              if (!issue.coordinates || issue.coordinates.length !== 2) return null;
              
              return (
                <Marker
                  key={issue.id}
                  position={issue.coordinates}
                  icon={createCustomIcon(issue.status, issue.priority, issue.category)}
                  eventHandlers={{
                    click: () => handleMarkerClick(issue),
                  }}
                >
                  <Popup>
                    <Box sx={{ minWidth: 280 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {issue.title || 'Untitled Issue'}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
                        <Chip 
                          label={issue.status || 'Open'} 
                          size="small" 
                          sx={{ 
                            bgcolor: getStatusColor(issue.status),
                            color: 'white',
                            fontWeight: 'bold'
                          }} 
                        />
                        <Chip 
                          label={issue.priority || 'Medium'} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            borderColor: getPriorityColor(issue.priority),
                            color: getPriorityColor(issue.priority)
                          }} 
                        />
                        <Chip 
                          label={issue.category || 'Other'} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                      
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {issue.description || 'No description available'}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>📍 Location:</strong> {issue.location?.address || 'Address not available'}
                      </Typography>
                      
                      {issue.assignedDepartment && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>🏢 Department:</strong> {issue.assignedDepartment}
                        </Typography>
                      )}
                      
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>📅 Reported:</strong> {issue.formattedDate}
                      </Typography>
                      
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewIssueDetail(issue.id)}
                        fullWidth
                      >
                        View Details
                      </Button>
                    </Box>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </Box>

      {/* Enhanced Sidebar with Issue List */}
      <Drawer
        anchor="right"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant="temporary"
        sx={{
          '& .MuiDrawer-paper': {
            width: 400,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Issues on Map ({filteredIssues.length})
            </Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List sx={{ maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
            {filteredIssues.map((issue) => (
              <ListItem 
                key={issue.id} 
                divider
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.50' }
                }}
                onClick={() => handleMarkerClick(issue)}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {issue.title || 'Untitled Issue'}
                      </Typography>
                      <Chip 
                        label={issue.status || 'Open'} 
                        size="small" 
                        sx={{ 
                          bgcolor: getStatusColor(issue.status),
                          color: 'white',
                          fontWeight: 'bold'
                        }} 
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {issue.description || 'No description'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        📍 {issue.location?.address || 'Address not available'}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        🏷️ {issue.category || 'Other'}
                      </Typography>
                      {issue.assignedDepartment && (
                        <>
                          <br />
                          <Typography variant="caption" color="textSecondary">
                            🏢 {issue.assignedDepartment}
                          </Typography>
                        </>
                      )}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        📅 {issue.formattedDate}
                      </Typography>
                    </Box>
                  }
                />
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewIssueDetail(issue.id);
                  }}
                >
                  <ViewIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>

          {filteredIssues.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="textSecondary">
                No issues match the current filters
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default MapPage;
