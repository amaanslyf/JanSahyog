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
import { IconShield, IconMail, IconLock, IconEye, IconEyeOff } from '../src/components/Icons';
import { colors } from '../src/styles/colors';
import { typography } from '../src/styles/typography';

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
        backgroundColor: colors.backgroundDark,
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
        ...typography.h2,
        fontSize: 28,
        color: colors.white,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    errorText: {
        ...typography.bodySmall,
        color: colors.error,
        textAlign: 'center',
    },
    form: {
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceDark,
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.borderDark,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: colors.white,
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
        ...typography.bodySmall,
        color: colors.primary,
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
        ...typography.body,
        color: colors.textMuted,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    primaryButtonText: {
        ...typography.button,
    },
    switchModeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    switchModeText: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    switchModeLink: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: '600',
    },
});

export default LoginScreen;
