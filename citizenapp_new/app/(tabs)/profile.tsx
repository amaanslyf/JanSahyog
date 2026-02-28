import React, { useState, useEffect, useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Image,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Linking,
    Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFirebase } from '../../src/hooks/useFirebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../src/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import DropDownPicker from 'react-native-dropdown-picker';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n/i18n';
import {
    IconUser,
    IconTrendingUp,
    IconBarChart,
    IconAward,
    IconSettings,
    IconLogOut,
    IconShield
} from '../../src/components/Icons';
import { typography } from '../../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../../src/utils/responsive';
import { useTheme } from '../../src/context/ThemeContext';

type UserStats = {
    totalIssues: number;
    resolvedIssues: number;
    inProgressIssues: number;
    openIssues: number;
    points: number;
    rank: number;
    joinDate: Date;
    lastActivity: Date;
};

const ProfileScreen = () => {
    const { auth, db } = useFirebase();
    const { user, isLoading: authLoading } = useAuth();
    const { t, i18n: i18nInstance } = useTranslation();
    const { colors, isDark, toggleTheme } = useTheme();
    const styles = useMemo(() => getStyles({ ...colors, isDark }), [colors, isDark]);

    const [userStats, setUserStats] = useState<UserStats>({
        totalIssues: 0,
        resolvedIssues: 0,
        inProgressIssues: 0,
        openIssues: 0,
        points: 0,
        rank: 0,
        joinDate: new Date(),
        lastActivity: new Date(),
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Language dropdown - must be before early returns (Rules of Hooks)
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(i18nInstance.language);
    const [items, setItems] = useState([
        { label: 'English', value: 'en' },
        { label: 'हिंदी', value: 'hi' },
        { label: 'বাংলা', value: 'bn' },
        { label: 'தமிழ்', value: 'ta' },
        { label: 'తెలుగు', value: 'te' },
    ]);

    // Load user statistics - Fixed function
    const loadUserStats = React.useCallback(async () => {
        if (!user) return;

        try {
            // Get user's issues from civicIssues collection
            const userIssuesQuery = query(
                collection(db, 'civicIssues'),
                where('reportedById', '==', user.uid)
            );
            const userIssuesSnapshot = await getDocs(userIssuesQuery);

            const issues = userIssuesSnapshot.docs.map(doc => doc.data());

            const resolvedCount = issues.filter(issue => issue.status === 'Resolved').length;
            const inProgressCount = issues.filter(issue => issue.status === 'In Progress').length;
            const openCount = issues.filter(issue => issue.status === 'Open').length;

            // Get user document for points and other data
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();

            // Fixed: Proper date handling
            const creationTime = user.metadata?.creationTime;
            const joinDate = creationTime ? new Date(creationTime) : new Date();

            setUserStats({
                totalIssues: issues.length,
                resolvedIssues: resolvedCount,
                inProgressIssues: inProgressCount,
                openIssues: openCount,
                points: userData?.points || (issues.length * 10),
                rank: userData?.rank || 0, // Rank should be pre-calculated by a backend task/admin
                joinDate: userData?.createdAt?.toDate() || joinDate,
                lastActivity: userData?.lastActive?.toDate() || new Date(),
            });

        } catch (error) {
            console.error('Error loading user stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, db]);

    useEffect(() => {
        loadUserStats();
    }, [loadUserStats]);

    useEffect(() => {
        setValue(i18nInstance.language);
    }, [i18nInstance.language]);

    const onRefresh = () => {
        setRefreshing(true);
        loadUserStats();
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
            Alert.alert(t('profile.logoutFailed'), t('profile.logoutError'));
        }
    };

    const handleLanguageChange = async (item: any) => {
        if (item.value && item.value !== i18nInstance.language) {
            try {
                await i18n.changeLanguage(item.value);
                setOpen(false);
            } catch (error) {
                console.error('Error changing language:', error);
            }
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getInitials = (email: string) => {
        return email.substring(0, 2).toUpperCase();
    };

    // Early returns AFTER all hooks (React Rules of Hooks)
    if (loading || authLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('profile.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {getInitials(user?.displayName || user?.email || 'User')}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.rankBadge}>
                                <Text style={styles.rankText}>#{userStats.rank}</Text>
                            </View>
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                                {user?.displayName || user?.email?.split('@')[0] || 'User'}
                            </Text>
                            <Text style={styles.userEmail}>{user?.email}</Text>
                            <Text style={styles.joinDate}>
                                {t('profile.memberSince', { date: formatDate(userStats.joinDate) })}
                            </Text>
                        </View>
                    </View>

                    {/* Points Section */}
                    <View style={[styles.pointsContainer, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                        <Text style={[styles.pointsNumber, { color: colors.primary }]}>{userStats.points}</Text>
                        <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>{t('profile.civicPoints')}</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>{t('profile.yourImpact')}</Text>

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <IconBarChart />
                            </View>
                            <Text style={styles.statNumber}>{userStats.totalIssues}</Text>
                            <Text style={styles.statLabel}>{t('profile.issuesReported')}</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <IconTrendingUp />
                            </View>
                            <Text style={styles.statNumber}>{userStats.resolvedIssues}</Text>
                            <Text style={styles.statLabel}>{t('profile.resolved')}</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <IconAward />
                            </View>
                            <Text style={styles.statNumber}>#{userStats.rank}</Text>
                            <Text style={styles.statLabel}>{t('profile.cityRank')}</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressTitle}>{t('profile.resolutionRate')}</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${userStats.totalIssues > 0 ? (userStats.resolvedIssues / userStats.totalIssues) * 100 : 0}%`
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {t('profile.resolvedPercent', { percent: userStats.totalIssues > 0 ? Math.round((userStats.resolvedIssues / userStats.totalIssues) * 100) : 0 })}
                        </Text>
                    </View>
                </View>

                {/* Language Settings */}
                <View style={styles.settingsContainer}>
                    <Text style={styles.sectionTitle}>{t('profile.changeLanguage')}</Text>

                    <View style={styles.languageContainer}>
                        <DropDownPicker
                            open={open}
                            value={value}
                            items={items}
                            setOpen={setOpen}
                            setValue={setValue}
                            setItems={setItems}
                            onSelectItem={handleLanguageChange}
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownContainer}
                            placeholder={t('profile.selectLanguagePlaceholder')}
                            zIndex={1000}
                            listMode="SCROLLVIEW"
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {/* Settings Button */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Alert.alert(t('profile.settings'), t('profile.settingsComingSoon'))}
                    >
                        <IconSettings />
                        <Text style={styles.actionButtonText}>{t('profile.settings')}</Text>
                        <Text style={styles.actionButtonArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Privacy Policy */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Linking.openURL('https://jansahyog.example.com/privacy')}
                    >
                        <IconShield size={20} color={colors.textPrimary} />
                        <Text style={styles.actionButtonText}>{t('profile.privacyPolicy')}</Text>
                        <Text style={styles.actionButtonArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Dark Mode Toggle */}
                    <View style={styles.actionButton}>
                        <IconShield size={20} color={colors.primary} />
                        <Text style={styles.actionButtonText}>{t('profile.darkMode')}</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#767577', true: colors.primaryLight }}
                            thumbColor={isDark ? colors.primary : '#f4f3f4'}
                        />
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <IconLogOut />
                        <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfoContainer}>
                    <Text style={styles.appInfoText}>JanSahyog v1.0.0</Text>
                    <Text style={styles.appInfoText}>{t('profile.tagline')}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: moderateScale(12),
        backgroundColor: colors.background,
    },
    loadingText: {
        ...typography.body,
        color: colors.textMuted,
        fontSize: moderateScale(16),
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: colors.surface,
        padding: moderateScale(24),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(16),
        marginBottom: moderateScale(20),
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
    },
    avatarPlaceholder: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: colors.white,
        fontSize: moderateScale(24),
        fontWeight: 'bold',
    },
    rankBadge: {
        position: 'absolute',
        bottom: moderateScale(-5),
        right: moderateScale(-5),
        backgroundColor: colors.gold,
        borderRadius: moderateScale(12),
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderWidth: 2,
        borderColor: colors.white,
    },
    rankText: {
        color: colors.white,
        fontSize: moderateScale(12),
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        ...typography.h2,
        fontSize: moderateScale(22),
        marginBottom: moderateScale(4),
        color: colors.textPrimary,
    },
    userEmail: {
        ...typography.body,
        color: colors.textSecondary,
        fontSize: moderateScale(14),
        marginBottom: moderateScale(4),
    },
    joinDate: {
        ...typography.caption,
        fontSize: moderateScale(11),
        color: colors.textMuted,
    },
    pointsContainer: {
        alignItems: 'center',
        backgroundColor: colors.isDark ? '#1E293B' : '#EFF6FF',
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
    },
    pointsNumber: {
        ...typography.h1,
        color: colors.primary,
        fontSize: moderateScale(32),
    },
    pointsLabel: {
        ...typography.caption,
        fontSize: moderateScale(12),
        marginTop: moderateScale(4),
        color: colors.textSecondary,
    },
    statsContainer: {
        padding: moderateScale(20),
    },
    sectionTitle: {
        ...typography.h3,
        fontSize: moderateScale(18),
        marginBottom: moderateScale(16),
        color: colors.textPrimary,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: moderateScale(12),
        marginBottom: moderateScale(24),
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    statIconContainer: {
        marginBottom: moderateScale(8),
    },
    statNumber: {
        ...typography.h3,
        fontSize: moderateScale(18),
        marginBottom: moderateScale(4),
        color: colors.textPrimary,
    },
    statLabel: {
        ...typography.caption,
        fontSize: moderateScale(11),
        textAlign: 'center',
        color: colors.textSecondary,
    },
    progressContainer: {
        backgroundColor: colors.surface,
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.border,
    },
    progressTitle: {
        ...typography.body,
        fontWeight: '600',
        fontSize: moderateScale(14),
        marginBottom: moderateScale(12),
        color: colors.textPrimary,
    },
    progressBar: {
        height: moderateScale(8),
        backgroundColor: colors.border,
        borderRadius: moderateScale(4),
        marginBottom: moderateScale(8),
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.success,
        borderRadius: moderateScale(4),
    },
    progressText: {
        ...typography.caption,
        fontSize: moderateScale(12),
        color: colors.textSecondary,
    },
    settingsContainer: {
        padding: moderateScale(20),
    },
    languageContainer: {
        zIndex: 1000,
    },
    dropdown: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: moderateScale(12),
    },
    dropdownContainer: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: moderateScale(12),
    },
    actionsContainer: {
        padding: moderateScale(20),
        gap: moderateScale(12),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.border,
        gap: moderateScale(12),
    },
    actionButtonText: {
        flex: 1,
        ...typography.body,
        fontSize: moderateScale(15),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    actionButtonArrow: {
        ...typography.body,
        fontSize: moderateScale(14),
        color: colors.textMuted,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.isDark ? '#450A0A' : '#FEF2F2',
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.isDark ? '#7F1D1D' : '#FECACA',
        gap: moderateScale(12),
    },
    logoutButtonText: {
        ...typography.body,
        fontSize: moderateScale(15),
        fontWeight: '600',
        color: colors.error,
    },
    appInfoContainer: {
        paddingVertical: moderateScale(30),
        alignItems: 'center',
    },
    appInfoText: {
        ...typography.caption,
        color: colors.textMuted,
        fontSize: moderateScale(12),
        marginBottom: moderateScale(4),
    },
});

export default ProfileScreen;
