// src/App.js - ADD MAP ROUTE
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebase';

// Import components
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import IssuesTable from './pages/IssuesTable';
import IssueDetail from './pages/IssueDetail';
import DepartmentsPage from './pages/DepartmentsPage';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CommunicationPage from './pages/CommunicationPage';
import MapPage from './pages/MapPage'; // NEW
import UsersPage from './pages/UsersPage';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import { Box } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/issues" element={<IssuesTable />} />
                  <Route path="/issue/:id" element={<IssueDetail />} />
                  <Route path="/map" element={<MapPage />} /> {/* NEW */}
                  <Route path="/departments" element={<DepartmentsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/communication" element={<CommunicationPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
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
}

export default App;
