import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { typography } from '../src/styles/typography';
import { useTheme } from '../src/context/ThemeContext';
import { moderateScale } from '../src/utils/responsive';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
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
            title: t('welcome.features.report.title'),
            description: t('welcome.features.report.description'),
            color: colors.success
        },
        {
            icon: <IconUsers />,
            title: t('welcome.features.track.title'),
            description: t('welcome.features.track.description'),
            color: colors.accent
        },
        {
            icon: <IconTrendingUp />,
            title: t('welcome.features.impact.title'),
            description: t('welcome.features.impact.description'),
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

    // Stats are fetched after login on the home screen.
    // The welcome screen shows placeholder values to avoid
    // unauthenticated Firestore permission errors.

    const handlePress = () => {
        // Ensure Root Layout is ready
        setTimeout(() => {
            router.replace('/login');
        }, 50);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

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

                    <Text style={styles.title}>{t('welcome.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('welcome.subtitle')}
                    </Text>
                    <Text style={styles.description}>
                        {t('welcome.description')}
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
                        <Text style={styles.primaryButtonText}>{t('welcome.getStarted')}</Text>
                        <View style={styles.buttonArrow}>
                            <Text style={styles.arrowText}>→</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.ctaSubtext}>
                        {t('welcome.ctaSubtext')}
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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: moderateScale(24),
        paddingBottom: moderateScale(40),
    },
    header: {
        alignItems: 'center',
        paddingTop: moderateScale(60),
        paddingBottom: moderateScale(40),
    },
    iconContainer: {
        position: 'relative',
        marginBottom: moderateScale(24),
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
        fontSize: moderateScale(36),
        marginBottom: moderateScale(8),
        textAlign: 'center',
        color: colors.textPrimary,
    },
    subtitle: {
        ...typography.h3,
        color: colors.primary,
        marginBottom: moderateScale(16),
        textAlign: 'center',
    },
    description: {
        ...typography.body,
        textAlign: 'center',
        paddingHorizontal: moderateScale(20),
        color: colors.textSecondary,
    },
    featuresContainer: {
        gap: moderateScale(16),
        marginBottom: moderateScale(40),
    },
    featureCard: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(16),
        padding: moderateScale(24),
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
        padding: moderateScale(16),
        borderRadius: moderateScale(16),
        marginBottom: moderateScale(16),
    },
    featureTitle: {
        ...typography.h3,
        marginBottom: moderateScale(8),
        textAlign: 'center',
        color: colors.textPrimary,
    },
    featureDescription: {
        ...typography.bodySmall,
        textAlign: 'center',
        lineHeight: moderateScale(22),
        color: colors.textSecondary,
    },
    ctaContainer: {
        alignItems: 'center',
        paddingTop: moderateScale(20),
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: moderateScale(18),
        paddingHorizontal: moderateScale(32),
        borderRadius: moderateScale(16),
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
        fontSize: moderateScale(18),
    },
    buttonArrow: {
        marginLeft: moderateScale(8),
    },
    arrowText: {
        color: colors.white,
        fontSize: moderateScale(18),
        fontWeight: 'bold',
    },
    ctaSubtext: {
        ...typography.caption,
        fontSize: moderateScale(14),
        textAlign: 'center',
        marginTop: moderateScale(16),
        fontStyle: 'italic',
        color: colors.textMuted,
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

// Icon Components
const IconShield = () => {
    const { colors } = useTheme();
    return (
        <Svg width={moderateScale(40)} height={moderateScale(40)} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
    );
};

const IconCamera = () => {
    const { colors } = useTheme();
    return (
        <Svg width={moderateScale(32)} height={moderateScale(32)} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <Circle cx="12" cy="13" r="4" />
        </Svg>
    );
};

const IconUsers = () => {
    const { colors } = useTheme();
    return (
        <Svg width={moderateScale(32)} height={moderateScale(32)} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <Circle cx="9" cy="7" r="4" />
            <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
    );
};

const IconTrendingUp = () => {
    const { colors } = useTheme();
    return (
        <Svg width={moderateScale(32)} height={moderateScale(32)} viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <Polyline points="17 6 23 6 23 12" />
        </Svg>
    );
};
