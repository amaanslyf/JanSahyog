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

const { width, height } = Dimensions.get('window');

// Enhanced SVG Icons
const IconShield = ({ size = 80 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
);

const IconCamera = ({ size = 48 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <Circle cx="12" cy="13" r="3" />
    </Svg>
);

const IconUsers = ({ size = 48 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <Circle cx="9" cy="7" r="4" />
        <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
);

const IconTrendingUp = ({ size = 48 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <Polyline points="17 6 23 6 23 12" />
    </Svg>
);

const WelcomeScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [currentFeature, setCurrentFeature] = useState(0);
    
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
            color: "#10B981"
        },
        {
            icon: <IconUsers />,
            title: "Track Progress", 
            description: "Monitor the status of your reports and see real-time updates.",
            color: "#8B5CF6"
        },
        {
            icon: <IconTrendingUp />,
            title: "Make Impact",
            description: "Earn points, climb the leaderboard, and make your city better.",
            color: "#F59E0B"
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
                        <Text style={styles.statNumber}>10K+</Text>
                        <Text style={styles.statLabel}>Issues Resolved</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>50K+</Text>
                        <Text style={styles.statLabel}>Active Citizens</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>100+</Text>
                        <Text style={styles.statLabel}>Cities</Text>
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
        backgroundColor: '#F8FAFC',
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
        backgroundColor: '#2563EB',
        opacity: 0.1,
        borderRadius: 50,
        transform: [{ scale: 1.2 }],
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#2563EB',
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    featuresContainer: {
        gap: 16,
        marginBottom: 40,
    },
    featureCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#0F172A',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeFeatureCard: {
        borderColor: '#2563EB',
        borderWidth: 2,
        transform: [{ scale: 1.02 }],
    },
    featureIcon: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    featureTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    featureDescription: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 40,
        alignItems: 'center',
        justifyContent: 'space-around',
        shadowColor: '#0F172A',
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2563EB',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 16,
    },
    ctaContainer: {
        alignItems: 'center',
        paddingTop: 20,
    },
    primaryButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#2563EB',
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
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonArrow: {
        marginLeft: 8,
    },
    arrowText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    ctaSubtext: {
        fontSize: 14,
        color: '#94A3B8',
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
        backgroundColor: '#2563EB',
        top: -100,
        right: -100,
    },
    decoration2: {
        width: 150,
        height: 150,
        backgroundColor: '#10B981',
        bottom: 100,
        left: -75,
    },
    decoration3: {
        width: 100,
        height: 100,
        backgroundColor: '#F59E0B',
        top: height * 0.4,
        right: -50,
    },
});

export default WelcomeScreen;
