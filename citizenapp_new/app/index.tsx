import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFirebase } from '../src/hooks/useFirebase';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';

import { IconShield, IconCamera, IconUsers, IconTrendingUp } from '../src/components/Icons';
import { colors } from '../src/styles/colors';
import { typography } from '../src/styles/typography';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { db } = useFirebase();
    const [currentFeature, setCurrentFeature] = useState(0);
    const [stats, setStats] = useState({
        issues: 0,
        citizens: 0,
        cities: 1 // Starting with 1 city :)
    });

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const featureAnims = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    const features = [
        {
            icon: <IconCamera />,
            title: "Report Issues",
            description: "Take photos and report civic problems in your area instantly.",
            color: colors.success
        },
        {
            icon: <IconUsers />,
            title: "Track Progress",
            description: "Monitor the status of your reports and see real-time updates.",
            color: colors.accent
        },
        {
            icon: <IconTrendingUp />,
            title: "Make Impact",
            description: "Earn points, climb the leaderboard, and make your city better.",
            color: colors.gold
        }
    ];

    useEffect(() => {
        // Start entrance animations
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
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        // Animate features sequentially
        const animateFeatures = () => {
            featureAnims.forEach((anim, index) => {
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 600,
                    delay: index * 200,
                    useNativeDriver: true,
                }).start();
            });
        };

        const timer = setTimeout(animateFeatures, 500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-rotate features
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentFeature((prev) => (prev + 1) % features.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // Fetch real stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const issuesCol = collection(db, 'civicIssues');
                const usersCol = collection(db, 'users');

                const [issuesSnap, usersSnap] = await Promise.all([
                    getCountFromServer(issuesCol),
                    getCountFromServer(usersCol)
                ]);

                setStats({
                    issues: issuesSnap.data().count,
                    citizens: usersSnap.data().count,
                    cities: 1 // For now
                });
            } catch (error) {
                console.error('Error fetching welcome stats:', error);
            }
        };
        fetchStats();
    }, [db]);

    const handlePress = () => {
        router.replace('/login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideAnim },
                                { scale: scaleAnim }
                            ]
                        }
                    ]}
                >
                    <View style={styles.iconContainer}>
                        <IconShield />
                        <View style={styles.iconGlow} />
                    </View>

                    <Text style={styles.title}>JanSahyog</Text>
                    <Text style={styles.subtitle}>
                        Your Voice, Your City, Your Impact
                    </Text>
                    <Text style={styles.description}>
                        Join thousands of citizens making their communities better through civic engagement and real-time issue reporting.
                    </Text>
                </Animated.View>

                {/* Features Section */}
                <View style={styles.featuresContainer}>
                    {features.map((feature, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.featureCard,
                                {
                                    opacity: featureAnims[index],
                                    transform: [
                                        {
                                            translateY: featureAnims[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [30, 0],
                                            }),
                                        },
                                    ],
                                },
                                currentFeature === index && styles.activeFeatureCard
                            ]}
                        >
                            <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                                {feature.icon}
                            </View>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDescription}>{feature.description}</Text>
                        </Animated.View>
                    ))}
                </View>

                {/* Stats Section */}
                <Animated.View
                    style={[styles.statsContainer, { opacity: fadeAnim }]}
                >
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.issues > 0 ? `${stats.issues}+` : '---'}</Text>
                        <Text style={styles.statLabel}>Issues Managed</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.citizens > 0 ? `${stats.citizens}+` : '---'}</Text>
                        <Text style={styles.statLabel}>Active Citizens</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.cities}</Text>
                        <Text style={styles.statLabel}>City</Text>
                    </View>
                </Animated.View>

                {/* CTA Section */}
                <Animated.View
                    style={[
                        styles.ctaContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity style={styles.primaryButton} onPress={handlePress}>
                        <Text style={styles.primaryButtonText}>Get Started</Text>
                        <View style={styles.buttonArrow}>
                            <Text style={styles.arrowText}>→</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.ctaSubtext}>
                        Join the movement • Free forever • Make a difference
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* Background decorations */}
            <View style={styles.backgroundDecorations}>
                <View style={[styles.decoration, styles.decoration1]} />
                <View style={[styles.decoration, styles.decoration2]} />
                <View style={[styles.decoration, styles.decoration3]} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    iconContainer: {
        position: 'relative',
        marginBottom: 24,
    },
    iconGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        backgroundColor: colors.primary,
        opacity: 0.1,
        borderRadius: 50,
        transform: [{ scale: 1.2 }],
    },
    title: {
        ...typography.h1,
        fontSize: 36,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.h3,
        color: colors.primary,
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        ...typography.body,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    featuresContainer: {
        gap: 16,
        marginBottom: 40,
    },
    featureCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: colors.textPrimary,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeFeatureCard: {
        borderColor: colors.primary,
        borderWidth: 2,
        transform: [{ scale: 1.02 }],
    },
    featureIcon: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    featureTitle: {
        ...typography.h3,
        marginBottom: 8,
        textAlign: 'center',
    },
    featureDescription: {
        ...typography.bodySmall,
        textAlign: 'center',
        lineHeight: 22,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        marginBottom: 40,
        alignItems: 'center',
        justifyContent: 'space-around',
        shadowColor: colors.textPrimary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        ...typography.h2,
        color: colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        ...typography.caption,
        fontSize: 14,
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    ctaContainer: {
        alignItems: 'center',
        paddingTop: 20,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: colors.primary,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        minWidth: width * 0.6,
    },
    primaryButtonText: {
        ...typography.button,
        fontSize: 18,
    },
    buttonArrow: {
        marginLeft: 8,
    },
    arrowText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    ctaSubtext: {
        ...typography.caption,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 16,
        fontStyle: 'italic',
    },
    backgroundDecorations: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
    },
    decoration: {
        position: 'absolute',
        borderRadius: 9999,
        opacity: 0.05,
    },
    decoration1: {
        width: 200,
        height: 200,
        backgroundColor: colors.primary,
        top: -100,
        right: -100,
    },
    decoration2: {
        width: 150,
        height: 150,
        backgroundColor: colors.success,
        bottom: 100,
        left: -75,
    },
    decoration3: {
        width: 100,
        height: 100,
        backgroundColor: colors.gold,
        top: height * 0.4,
        right: -50,
    },
});

export default WelcomeScreen;
