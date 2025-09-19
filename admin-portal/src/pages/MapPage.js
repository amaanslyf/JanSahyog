// src/pages/MapPage.js - INTERACTIVE MAP WITH ISSUE MARKERS
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
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  Drawer,
} from '@mui/material';
import {
  MyLocation as LocationIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Navigation as NavigationIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
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

// Custom marker icons for different issue statuses
const createCustomIcon = (status, priority) => {
  let color = '#f44336'; // Red for Open
  if (status === 'In Progress') color = '#ff9800'; // Orange
  if (status === 'Resolved') color = '#4caf50'; // Green
  
  let size = 25; // Default size
  if (priority === 'Critical') size = 35;
  if (priority === 'High') size = 30;
  if (priority === 'Low') size = 20;

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
        🚨
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

  // Initialize sample issues with coordinates
  useEffect(() => {
    // Enhanced sample issues with realistic Delhi coordinates
    const sampleIssues = [
      {
        id: '1',
        title: 'Pothole on Ring Road',
        description: 'Large pothole causing traffic issues',
        status: 'Open',
        priority: 'High',
        department: 'Roads & Infrastructure',
        reportedBy: 'citizen1@gmail.com',
        reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        address: 'Ring Road, Near AIIMS, New Delhi',
        coordinates: [28.5672, 77.2100], // Near AIIMS
        imageUri: null
      },
      {
        id: '2',
        title: 'Broken Street Light',
        description: 'Street light not working for 3 days',
        status: 'In Progress',
        priority: 'Medium',
        department: 'Electrical & Street Lighting',
        reportedBy: 'citizen2@gmail.com',
        reportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        address: 'Connaught Place, Central Delhi',
        coordinates: [28.6315, 77.2167], // Connaught Place
        imageUri: null
      },
      {
        id: '3',
        title: 'Garbage Collection Delay',
        description: 'Garbage not collected for 5 days',
        status: 'Resolved',
        priority: 'Low',
        department: 'Sanitation & Waste Management',
        reportedBy: 'citizen3@gmail.com',
        reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        address: 'Lajpat Nagar, South Delhi',
        coordinates: [28.5677, 77.2431], // Lajpat Nagar
        imageUri: null
      },
      {
        id: '4',
        title: 'Water Leakage',
        description: 'Major water pipeline leak',
        status: 'Open',
        priority: 'Critical',
        department: 'Water & Drainage',
        reportedBy: 'citizen4@gmail.com',
        reportedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        address: 'Karol Bagh, Central Delhi',
        coordinates: [28.6506, 77.1905], // Karol Bagh
        imageUri: null
      },
      {
        id: '5',
        title: 'Tree Fallen on Road',
        description: 'Large tree blocking road after storm',
        status: 'In Progress',
        priority: 'High',
        department: 'Parks & Environment',
        reportedBy: 'citizen5@gmail.com',
        reportedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        address: 'India Gate, Central Delhi',
        coordinates: [28.6129, 77.2295], // India Gate
        imageUri: null
      },
      {
        id: '6',
        title: 'Road Construction Debris',
        description: 'Construction material blocking footpath',
        status: 'Open',
        priority: 'Medium',
        department: 'Roads & Infrastructure',
        reportedBy: 'citizen6@gmail.com',
        reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        address: 'Janpath, New Delhi',
        coordinates: [28.6222, 77.2273], // Janpath
        imageUri: null
      }
    ];

    setIssues(sampleIssues);
    setFilteredIssues(sampleIssues);
    setLoading(false);
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

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(issue => issue.department === departmentFilter);
    }

    setFilteredIssues(filtered);
  }, [issues, statusFilter, priorityFilter, departmentFilter]);

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

        {/* Quick Filters */}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
              <MenuItem value="all">All Priority</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Department</InputLabel>
            <Select value={departmentFilter} label="Department" onChange={(e) => setDepartmentFilter(e.target.value)}>
              <MenuItem value="all">All Departments</MenuItem>
              <MenuItem value="Roads & Infrastructure">Roads & Infrastructure</MenuItem>
              <MenuItem value="Electrical & Street Lighting">Electrical & Lighting</MenuItem>
              <MenuItem value="Sanitation & Waste Management">Sanitation</MenuItem>
              <MenuItem value="Water & Drainage">Water & Drainage</MenuItem>
              <MenuItem value="Parks & Environment">Parks & Environment</MenuItem>
            </Select>
          </FormControl>

          {/* Active Filters Display */}
          {(statusFilter !== 'all' || priorityFilter !== 'all' || departmentFilter !== 'all') && (
            <Box display="flex" alignItems="center" gap={1}>
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
              {departmentFilter !== 'all' && (
                <Chip 
                  label={`Dept: ${departmentFilter.split('&')[0].trim()}`} 
                  size="small" 
                  onDelete={() => setDepartmentFilter('all')}
                  color="success"
                />
              )}
            </Box>
          )}
        </Stack>
      </Box>

      {/* Map Container */}
      <Box sx={{ flex: 1, position: 'relative' }}>
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

          {/* Issue Markers */}
          {filteredIssues.map((issue) => {
            if (!issue.coordinates || issue.coordinates.length !== 2) return null;
            
            return (
              <Marker
                key={issue.id}
                position={issue.coordinates}
                icon={createCustomIcon(issue.status, issue.priority)}
                eventHandlers={{
                  click: () => handleMarkerClick(issue),
                }}
              >
                <Popup>
                  <Box sx={{ minWidth: 250 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {issue.title}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Chip 
                        label={issue.status} 
                        size="small" 
                        sx={{ 
                          bgcolor: getStatusColor(issue.status),
                          color: 'white',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Chip 
                        label={issue.priority} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: getPriorityColor(issue.priority),
                          color: getPriorityColor(issue.priority)
                        }} 
                      />
                    </Stack>
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {issue.description}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Location:</strong> {issue.address}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      <strong>Department:</strong> {issue.department}
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
      </Box>

      {/* Sidebar with Issue List */}
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
              Issues List ({filteredIssues.length})
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
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {issue.title}
                      </Typography>
                      <Chip 
                        label={issue.status} 
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
                        {issue.description}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        📍 {issue.address}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        🏢 {issue.department}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        📅 {formatDate(issue.reportedAt)}
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
