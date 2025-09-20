import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Animated,
} from 'react-native';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFirebase } from '../src/hooks/useFirebase';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';

// Icons
const IconShield = () => (
    <Svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
);

const IconMail = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <Polyline points="22 6 12 13 2 6" />
    </Svg>
);

const IconLock = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <Circle cx="12" cy="16" r="1" />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
);

const IconEye = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle cx="12" cy="12" r="3" />
    </Svg>
);

const IconEyeOff = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <Line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
);

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();
    const { auth, db } = useFirebase();
    const { t } = useTranslation();
    
    // Animation values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));

    useEffect(() => {
        // Fade in animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    // Create user profile in Firestore
    const createUserProfile = async (user: any, additionalData: any = {}) => {
        if (!user) return;
        
        const userRef = doc(db, 'users', user.uid);
        const snapShot = await getDoc(userRef);
        
        if (!snapShot.exists()) {
            const { displayName, email } = user;
            const createdAt = serverTimestamp();
            
            try {
                await setDoc(userRef, {
                    displayName: displayName || email.split('@')[0],
                    email,
                    createdAt,
                    lastActive: serverTimestamp(),
                    points: 0,
                    issuesReported: 0,
                    issuesResolved: 0,
                    role: 'citizen',
                    ...additionalData
                });
                console.log('User profile created successfully');
            } catch (error) {
                console.error('Error creating user profile:', error);
            }
        }
    };

    // Enhanced sign-up function
    const handleSignUp = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, {
                displayName: email.split('@')[0],
            });
            
            await createUserProfile(user, {
                source: 'mobile_app',
                registrationComplete: true,
                preferences: {
                    language: 'en',
                    notifications: true,
                    emailUpdates: true,
                }
            });
            
            console.log('Account created and profile synced!', user);
            
            Alert.alert(
                'Welcome! 🎉',
                'Your account has been created successfully. You can now start reporting civic issues and make your city better!',
                [{ text: 'Get Started', onPress: () => router.replace('/(tabs)/home') }]
            );
            
        } catch (err: any) {
            console.error('Sign up error:', err);
            let errorMessage = 'An error occurred during sign-up.';
            
            switch (err.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please use a stronger password.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = err.message || errorMessage;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Enhanced login function
    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('Logged in!', user);
            
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                lastActive: serverTimestamp(),
                lastLoginSource: 'mobile_app',
            }, { merge: true });
            
            await createUserProfile(user);
            
            router.replace('/(tabs)/home');
            
        } catch (err: any) {
            console.error('Login error:', err);
            let errorMessage = 'An error occurred during login.';
            
            switch (err.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = err.message || errorMessage;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Password reset function
    const handlePasswordReset = async () => {
        if (!email) {
            Alert.alert('Email Required', 'Please enter your email address to reset password.');
            return;
        }
        
        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert(
                'Password Reset Email Sent',
                'Check your email for password reset instructions.',
                [{ text: 'OK' }]
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to send password reset email.');
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <Animated.View 
                    style={[
                        styles.innerContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <IconShield />
                        </View>
                        <Text style={styles.title}>
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isSignUp 
                                ? 'Join thousands making cities better' 
                                : 'Sign in to continue reporting issues'
                            }
                        </Text>
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <Animated.View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </Animated.View>
                    ) : null}

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIcon}>
                                <IconMail />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIcon}>
                                <IconLock />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                            />
                            <TouchableOpacity 
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <IconEyeOff /> : <IconEye />}
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password (Sign Up Only) */}
                        {isSignUp && (
                            <View style={styles.inputContainer}>
                                <View style={styles.inputIcon}>
                                    <IconLock />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity 
                                    style={styles.eyeIcon}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Forgot Password Link (Login Only) */}
                        {!isSignUp && (
                            <TouchableOpacity 
                                style={styles.forgotPassword}
                                onPress={handlePasswordReset}
                            >
                                <Text style={styles.forgotPasswordText}>
                                    Forgot your password?
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#2563EB" />
                                <Text style={styles.loadingText}>
                                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity 
                                    style={styles.primaryButton} 
                                    onPress={isSignUp ? handleSignUp : handleLogin}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isSignUp ? 'Create Account' : 'Sign In'}
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.switchModeContainer}>
                                    <Text style={styles.switchModeText}>
                                        {isSignUp 
                                            ? 'Already have an account? ' 
                                            : "Don't have an account? "
                                        }
                                    </Text>
                                    <TouchableOpacity onPress={toggleMode}>
                                        <Text style={styles.switchModeLink}>
                                            {isSignUp ? 'Sign In' : 'Sign Up'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    keyboardView: {
        flex: 1,
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8FAFC',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 22,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
    },
    form: {
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#F8FAFC',
        fontSize: 16,
        paddingVertical: 16,
    },
    eyeIcon: {
        padding: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    forgotPasswordText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '500',
    },
    buttonContainer: {
        gap: 16,
    },
    loadingContainer: {
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#94A3B8',
        fontSize: 16,
    },
    primaryButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    switchModeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    switchModeText: {
        color: '#94A3B8',
        fontSize: 14,
    },
    switchModeLink: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LoginScreen;
