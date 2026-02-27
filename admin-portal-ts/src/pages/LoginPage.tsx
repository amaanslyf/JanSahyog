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
    Card,
    CardContent,
    CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) navigate('/');
            setCheckingAuth(false);
        });
        return unsubscribe;
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check if user has admin role
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData?.role;

                if (role !== 'admin' && role !== 'moderator' && role !== 'department_head') {
                    await auth.signOut();
                    setError('Access denied. Only admin users can access this portal.');
                    setLoading(false);
                    return;
                }

                // Update last login
                await updateDoc(doc(db, 'users', user.uid), {
                    lastActive: new Date(),
                    lastLoginDevice: 'web_admin',
                });
            }

            navigate('/');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            if (message.includes('user-not-found')) {
                setError('No account found with this email.');
            } else if (message.includes('wrong-password') || message.includes('invalid-credential')) {
                setError('Invalid email or password.');
            } else if (message.includes('too-many-requests')) {
                setError('Too many login attempts. Please try again later.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="sm">
            <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <Card elevation={6} sx={{ width: '100%', maxWidth: 450 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box textAlign="center" mb={3}>
                            <AdminPanelSettings sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight="bold" color="primary">
                                JanSahyog
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary">
                                Admin Portal Login
                            </Typography>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Paper component="form" onSubmit={handleLogin} elevation={0} sx={{ p: 0 }}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                required
                                autoFocus
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                required
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading}
                                sx={{ mt: 3, mb: 2, py: 1.5 }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                            </Button>
                        </Paper>

                        <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                            Only authorized administrators can access this portal.
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default LoginPage;
