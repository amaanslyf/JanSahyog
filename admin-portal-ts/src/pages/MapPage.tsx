import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Card, Button, FormControl, InputLabel, Select,
    MenuItem, Chip, Stack, Alert, List, ListItem, ListItemText, Paper,
    IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
    FilterList as FilterIcon, MyLocation as LocateIcon,
    ZoomIn, ZoomOut, OpenInNew as DetailIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/useAlert';
import { formatDate } from '../utils/dateUtils';
import { getStatusColor, getPriorityColor } from '../utils/colorUtils';
import type { CivicIssue, Department, IssueStatus, IssuePriority } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon factory
function createCustomIcon(status: string, priority: string): L.DivIcon {
    const color = status === 'Resolved' ? '#4caf50' : status === 'In Progress' ? '#ff9800' : '#f44336';
    const size = priority === 'Critical' ? 20 : priority === 'High' ? 16 : 12;
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

// Map controller sub-component
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();

    return (
        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <IconButton size="small" sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#eee' } }} onClick={() => map.zoomIn()}><ZoomIn /></IconButton>
            <IconButton size="small" sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#eee' } }} onClick={() => map.zoomOut()}><ZoomOut /></IconButton>
            <IconButton size="small" sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#eee' } }} onClick={() => map.locate({ setView: true, maxZoom: 15 })}><LocateIcon /></IconButton>
        </Box>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MapPage: React.FC = () => {
    const [issues, setIssues] = useState<CivicIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const { alert, showAlert, dismissAlert } = useAlert();
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'civicIssues'), (snapshot) => {
            const list: CivicIssue[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.location?.latitude && data.location?.longitude) {
                    list.push({ id: docSnap.id, ...data } as CivicIssue);
                }
            });
            setIssues(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredIssues = useMemo(() =>
        issues.filter((i) => {
            if (statusFilter !== 'all' && i.status !== statusFilter) return false;
            if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
            if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
            return true;
        }),
        [issues, statusFilter, priorityFilter, categoryFilter]);

    const categories = useMemo(() => [...new Set(issues.map((i) => i.category))], [issues]);

    // Default center (India)
    const mapCenter: [number, number] = useMemo(() => {
        if (filteredIssues.length > 0) {
            const avgLat = filteredIssues.reduce((s, i) => s + (i.location?.latitude ?? 0), 0) / filteredIssues.length;
            const avgLng = filteredIssues.reduce((s, i) => s + (i.location?.longitude ?? 0), 0) / filteredIssues.length;
            return [avgLat, avgLng];
        }
        return [28.6139, 77.2090]; // Delhi
    }, [filteredIssues]);

    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>🗺️ Map View</Typography>
                <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="Open">Open</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Resolved">Resolved</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Priority</InputLabel>
                        <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="Critical">Critical</MenuItem>
                            <MenuItem value="High">High</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Category</InputLabel>
                        <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            {alert.show && <Alert severity={alert.severity} onClose={dismissAlert} sx={{ mb: 2 }}>{alert.message}</Alert>}

            <Chip label={`${filteredIssues.length} issues on map`} sx={{ mb: 1 }} />

            <Box sx={{ height: 'calc(100vh - 250px)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={mapCenter} zoom={12} />
                    {filteredIssues.map((issue) => (
                        <Marker
                            key={issue.id}
                            position={[issue.location!.latitude, issue.location!.longitude]}
                            icon={createCustomIcon(issue.status, issue.priority)}
                            eventHandlers={{ click: () => setSelectedIssue(issue) }}
                        >
                            <Popup>
                                <Box sx={{ minWidth: 200 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">{issue.title}</Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{issue.category}</Typography>
                                    <Box display="flex" gap={0.5} mb={1}>
                                        <Chip label={issue.status} color={getStatusColor(issue.status)} size="small" />
                                        <Chip label={issue.priority} color={getPriorityColor(issue.priority)} size="small" />
                                    </Box>
                                    <Typography variant="caption">{formatDate(issue.reportedAt)}</Typography>
                                    <br />
                                    <Button size="small" startIcon={<DetailIcon />} onClick={() => navigate(`/issue/${issue.id}`)} sx={{ mt: 1 }}>
                                        View Details
                                    </Button>
                                </Box>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </Box>

            {/* Status Legend */}
            <Paper sx={{ p: 1, mt: 1, display: 'flex', gap: 2, justifyContent: 'center' }}>
                {[
                    { color: '#f44336', label: 'Open' },
                    { color: '#ff9800', label: 'In Progress' },
                    { color: '#4caf50', label: 'Resolved' },
                ].map((item) => (
                    <Box key={item.label} display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color }} />
                        <Typography variant="caption">{item.label}</Typography>
                    </Box>
                ))}
            </Paper>
        </Box>
    );
};

export default MapPage;
