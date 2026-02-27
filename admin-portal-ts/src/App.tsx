import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase/firebase';
import { startAutoAssignListener } from './services/autoAssignService';
import { startAutomationEngine } from './services/automationEngine';

// Layout
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import IssuesTable from './pages/IssuesTable';
import IssueDetail from './pages/IssueDetail';
import DepartmentsPage from './pages/DepartmentsPage';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CommunicationPage from './pages/CommunicationPage';
import MapPage from './pages/MapPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';

const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
    },
});

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const toggleSidebar = () => setSidebarOpen((prev) => !prev);

    // Auto-assign + automation listeners — start when admin is logged in
    const autoAssignUnsub = useRef<(() => void) | null>(null);
    const automationUnsub = useRef<(() => void) | null>(null);
    useEffect(() => {
        if (user) {
            autoAssignUnsub.current = startAutoAssignListener();
            automationUnsub.current = startAutomationEngine();
        }
        return () => {
            autoAssignUnsub.current?.();
            autoAssignUnsub.current = null;
            automationUnsub.current?.();
            automationUnsub.current = null;
        };
    }, [user]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                {user ? (
                    <Box sx={{ display: 'flex' }}>
                        <Sidebar open={sidebarOpen} />
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <Navbar toggleSidebar={toggleSidebar} />
                            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                                <ErrorBoundary>
                                    <Routes>
                                        <Route path="/" element={<Dashboard />} />
                                        <Route path="/issues" element={<IssuesTable />} />
                                        <Route path="/issue/:id" element={<IssueDetail />} />
                                        <Route path="/map" element={<MapPage />} />
                                        <Route path="/departments" element={<DepartmentsPage />} />
                                        <Route path="/notifications" element={<NotificationsPage />} />
                                        <Route path="/analytics" element={<AnalyticsPage />} />
                                        <Route path="/communication" element={<CommunicationPage />} />
                                        <Route path="/users" element={<UsersPage />} />
                                        <Route path="/settings" element={<SettingsPage />} />
                                        <Route path="*" element={<Navigate to="/" />} />
                                    </Routes>
                                </ErrorBoundary>
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    <Routes>
                        <Route path="*" element={<LoginPage />} />
                    </Routes>
                )}
            </Router>
        </ThemeProvider>
    );
};

export default App;
