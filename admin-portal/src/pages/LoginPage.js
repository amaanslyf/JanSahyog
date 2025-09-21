// src/pages/LoginPage.js - ENHANCED ADMIN LOGIN
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Alert,
  InputAdornment,
  IconButton,
  Link,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc , updateDoc} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Verify admin status
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          if (userData?.role === 'admin' || userData?.isAdmin) {
            navigate('/dashboard');
          } else {
            // Not an admin, sign out
            await auth.signOut();
            setError('Access denied. Admin privileges required.');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setError('Error verifying admin access');
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user has admin role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) {
        throw new Error('User profile not found. Please contact system administrator.');
      }

      if (userData.role !== 'admin' && !userData.isAdmin) {
        await auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }

      if (userData.status === 'blocked') {
        await auth.signOut();
        throw new Error('Account has been blocked. Please contact system administrator.');
      }

      // Update last login time
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date(),
        lastActive: new Date()
      });

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No admin account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Demo credentials for testing
  const demoCredentials = [
    { email: 'admin@jansahyog.gov.in', role: 'Super Admin' },
    { email: 'manager@jansahyog.gov.in', role: 'Department Manager' },
  ];

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4
        }}
      >
        <Paper elevation={12} sx={{ p: 0, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              color: 'white',
              p: 4,
              textAlign: 'center'
            }}
          >
            <AdminIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              JanSahyog
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Admin Portal Access
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
              <SecurityIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2">
                Secure Government Access
              </Typography>
            </Box>
          </Box>

          {/* Login Form */}
          <Box p={4}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Admin Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AdminIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SecurityIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                size="large"
                startIcon={<LoginIcon />}
                sx={{ 
                  mb: 3,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                  }
                }}
              >
                {loading ? 'Authenticating...' : 'Access Admin Portal'}
              </Button>
            </form>

            <Divider sx={{ my: 3 }}>
              <Chip label="Demo Access" color="primary" variant="outlined" />
            </Divider>

            {/* Demo Credentials */}
            <Card variant="outlined" sx={{ bgcolor: '#f8f9fa' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  🧪 Demo Credentials (Development Only):
                </Typography>
                {demoCredentials.map((cred, index) => (
                  <Box key={index} mb={1}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      <strong>{cred.role}:</strong> {cred.email}
                    </Typography>
                  </Box>
                ))}
                <Typography variant="caption" color="textSecondary">
                  Password: Contact system administrator
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              bgcolor: '#f5f5f5',
              p: 3,
              textAlign: 'center',
              borderTop: '1px solid #e0e0e0'
            }}
          >
            <Typography variant="body2" color="textSecondary">
              🔒 Secure Admin Access Only • Government of India Initiative
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              © 2024 JanSahyog Digital Platform. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
