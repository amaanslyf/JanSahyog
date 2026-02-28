import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Linking,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, query, onSnapshot, orderBy, Timestamp, limit, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import {
    IconShield,
    IconBell,
    IconSearch,
    IconCamera,
    IconActivity,
    IconMapPin,
    IconPhone,
    IconTrophy,
    IconTrendingUp
} from '../../src/components/Icons';
import { typography } from '../../src/styles/typography';
import { moderateScale } from '../../src/utils/responsive';
import { useTheme } from '../../src/context/ThemeContext';

type Issue = {
    id: string;
    title: string;
    category: string;
    description: string;
    status: 'Open' | 'In Progress' | 'Resolved';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    imageUri: string;
    reportedAt: Timestamp;
    reportedById: string;
    assignedDepartment?: string;
    adminNotes?: string;
    lastUpdated?: Timestamp;
};

type HomeStatusStyle = { container: object; text: object; };
type Category = { name: string; icon: string; key: string; };
type DashboardStats = {
    totalIssues: number;
    myIssues: number;
    resolvedToday: number;
    inProgress: number;
    hasUpdates: boolean;
};

const HomeScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { db, auth } = useFirebase();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        totalIssues: 0,
        myIssues: 0,
        resolvedToday: 0,
        inProgress: 0,
        hasUpdates: false
    });
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const categories: Category[] = [
        { name: t('categories.garbage'), icon: '🗑️', key: 'Garbage' },
        { name: t('categories.waterLeak'), icon: '💧', key: 'Water Leak' },
        { name: t('categories.roads'), icon: '🚧', key: 'Roads' },
        { name: t('categories.streetlight'), icon: '💡', key: 'Streetlight' },
        { name: t('categories.pollution'), icon: '💨', key: 'Pollution' },
        { name: t('categories.other'), icon: '📝', key: 'Other' },
    ];


    const filteredIssues = useMemo(() => {
        if (!searchQuery.trim()) return recentIssues;
        const queryStr = searchQuery.toLowerCase();
        return recentIssues.filter(issue =>
            issue.title?.toLowerCase().includes(queryStr) ||
            issue.description?.toLowerCase().includes(queryStr) ||
            issue.category?.toLowerCase().includes(queryStr)
        );
    }, [searchQuery, recentIssues]);

    const loadDashboardData = useCallback(async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setIsLoading(false);
                return;
            }

            const issuesRef = collection(db, "civicIssues");

            // Get recent issues
            const recentQuery = query(
                issuesRef,
                where("publicVisible", "==", true),
                orderBy("reportedAt", "desc"),
                limit(5)
            );

            const unsubscribe = onSnapshot(recentQuery, (querySnapshot) => {
                const issuesData: Issue[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    issuesData.push({
                        id: doc.id,
                        ...data,
                        reportedAt: data.reportedAt || Timestamp.now(),
                        lastUpdated: data.lastUpdated || data.reportedAt || Timestamp.now(),
                    } as Issue);
                });
                setRecentIssues(issuesData);
            });

            // Get dashboard stats
            const allIssuesSnapshot = await getDocs(query(issuesRef, where("publicVisible", "==", true)));
            const myIssuesSnapshot = await getDocs(query(issuesRef, where("reportedById", "==", currentUser.uid)));

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTimestamp = Timestamp.fromDate(today);

            const resolvedTodaySnapshot = await getDocs(
                query(
                    issuesRef,
                    where("status", "==", "Resolved"),
                    where("lastUpdated", ">=", todayTimestamp)
                )
            );

            const inProgressSnapshot = await getDocs(
                query(issuesRef, where("status", "==", "In Progress"))
            );

            // Check for user's issue updates
            let hasUpdates = false;
            if (myIssuesSnapshot.docs.length > 0) {
                const userIssues = myIssuesSnapshot.docs.map(doc => doc.data());
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayTimestamp = Timestamp.fromDate(yesterday);

                hasUpdates = userIssues.some(issue =>
                    issue.lastUpdated &&
                    issue.lastUpdated.seconds > yesterdayTimestamp.seconds &&
                    issue.updatedBy !== 'Citizen App'
                );
            }

            setStats({
                totalIssues: allIssuesSnapshot.size,
                myIssues: myIssuesSnapshot.size,
                resolvedToday: resolvedTodaySnapshot.size,
                inProgress: inProgressSnapshot.size,
                hasUpdates
            });


            setIsLoading(false);
            setRefreshing(false);

            // Subscribe to unread notifications count
            const notificationsQuery = query(
                collection(db, "users", currentUser.uid, "notifications"),
                where("isRead", "==", false)
            );

            const unsubNotifs = onSnapshot(notificationsQuery, (snapshot) => {
                setUnreadNotifications(snapshot.size);
            });

            return () => {
                unsubscribe();
                unsubNotifs();
            };
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [auth, db, t]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        loadDashboardData().then(unsub => {
            if (typeof unsub === 'function') {
                unsubscribe = unsub;
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [loadDashboardData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadDashboardData();
    }, [loadDashboardData]);

    const getStatusStyle = (status: string): HomeStatusStyle => {
        switch (status) {
            case 'In Progress':
                return {
                    container: { backgroundColor: isDark ? '#3B2A0A' : '#FEF3C7' },
                    text: { color: colors.warning }
                };
            case 'Resolved':
                return {
                    container: { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
                    text: { color: colors.success }
                };
            case 'Open':
                return {
                    container: { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' },
                    text: { color: colors.error }
                };
            default:
                return { container: {}, text: {} };
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return colors.error;
            case 'High': return '#F97316';
            case 'Medium': return colors.primary;
            case 'Low': return colors.success;
            default: return colors.textMuted;
        }
    };

    const handleHelplineCall = async () => {
        const phoneNumber = 'tel:+910000000000';
        const canOpen = await Linking.canOpenURL(phoneNumber);
        if (canOpen) {
            Linking.openURL(phoneNumber);
        } else {
            Alert.alert(t('home.error'), t('home.helplineError'));
        }
    };

    const formatTimeAgo = (timestamp: Timestamp) => {
        try {
            const now = new Date();
            const date = timestamp.toDate();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHours < 1) return t('home.timeAgo.justNow');
            if (diffHours < 24) return t('home.timeAgo.hours', { count: diffHours });
            const diffDays = Math.floor(diffHours / 24);
            return t('home.timeAgo.days', { count: diffDays });
        } catch {
            return t('home.timeAgo.recently');
        }
    };

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.logoBg}>
                        <IconShield color={colors.white} />
                    </View>
                    <Text style={styles.appName}>{t('home.appName')}</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => router.push('/notifications')}
                    >
                        <IconBell color={colors.textPrimary} hasNotifications={unreadNotifications > 0} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                        <Image
                            source={{ uri: auth.currentUser?.photoURL || 'https://placehold.co/40x40/E2E8F0/4A5568?text=P' }}
                            style={styles.profileImage}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.mainContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                <View style={styles.contentPadding}>
                    {/* Search Bar */}
                    <TouchableOpacity
                        style={styles.searchContainer}
                        onPress={() => router.push('/search')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.searchIcon}>
                            <IconSearch color={colors.textMuted} />
                        </View>
                        <Text style={[styles.searchInputText, { color: colors.textMuted }]}>
                            {t('home.searchPlaceholder')}
                        </Text>
                    </TouchableOpacity>

                    {/* Stats Cards */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalIssues}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.totalIssues')}</Text>
                            <IconTrendingUp color={colors.primary} />
                        </View>
                        <View style={[styles.statCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4' }]}>
                            <Text style={[styles.statNumber, { color: colors.success }]}>{stats.myIssues}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.myReports')}</Text>
                            <TouchableOpacity onPress={() => router.push('/mycomplaint')}>
                                <Text style={[styles.statLink, { color: colors.success }]}>{t('home.stats.viewAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
                            <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.resolvedToday}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.resolvedToday')}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
                            <Text style={[styles.statNumber, { color: colors.error }]}>{stats.inProgress}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.inProgress')}</Text>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}
                            onPress={() => router.push('/report')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: colors.primary }]}>
                                <IconCamera color={colors.white} />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.report')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4' }]}
                            onPress={() => router.push('/mycomplaint')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: colors.success }]}>
                                <IconActivity color={colors.white} />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.track')}</Text>
                            {stats.hasUpdates && (
                                <View style={styles.updateBadge}>
                                    <Text style={styles.updateBadgeText}>{t('home.newBadge')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: isDark ? '#2E1065' : '#F5F3FF' }]}
                            onPress={() => router.push('/NearbyIssues')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: colors.accent }]}>
                                <IconMapPin color={colors.white} />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.nearby')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2' }]}
                            onPress={handleHelplineCall}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: colors.error }]}>
                                <IconPhone color={colors.white} />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.helpline')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: isDark ? '#451A03' : '#FFFBEB' }]}
                            onPress={() => router.push('/leaderBoard')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: colors.warning }]}>
                                <IconTrophy color={colors.white} />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.leaderboard')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Categories */}
                    <View>
                        <Text style={styles.sectionTitle}>{t('home.categoriesTitle')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {categories.map((category, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.categoryCard}
                                    onPress={() => router.push({
                                        pathname: '/report',
                                        params: { category: category.key }
                                    })}
                                >
                                    <View style={styles.categoryIconBg}>
                                        <Text style={styles.categoryIconText}>{category.icon}</Text>
                                    </View>
                                    <Text style={styles.categoryText}>{category.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Info Banner */}
                    <View style={[styles.banner, { backgroundColor: colors.primary }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bannerTitle}>{t('home.bannerTitle')}</Text>
                            <Text style={styles.bannerText}>{t('home.bannerText')}</Text>
                        </View>
                        <Text style={styles.bannerEmoji}>✨</Text>
                    </View>

                    {/* Recent Updates */}
                    <View>
                        <Text style={styles.sectionTitle}>{t('home.recentUpdates')}</Text>
                        {isLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                            <View style={styles.issuesList}>
                                {filteredIssues.map((issue) => {
                                    const statusStyle = getStatusStyle(issue.status);
                                    const priorityColor = getPriorityColor(issue.priority);

                                    return (
                                        <TouchableOpacity
                                            key={issue.id}
                                            style={styles.issueCard}
                                            onPress={() => router.push(`/IssueDetail/${issue.id}` as any)}
                                        >
                                            <Image
                                                source={{ uri: issue.imageUri || 'https://placehold.co/80x80' }}
                                                style={styles.issueImage}
                                            />
                                            <View style={styles.issueDetails}>
                                                <View style={styles.issueHeader}>
                                                    <Text style={styles.issueTitle} numberOfLines={1}>
                                                        {issue.title || t(`categories.${issue.category.toLowerCase().replace(' ', '')}`)}
                                                    </Text>
                                                    <View style={[styles.statusBadge, statusStyle.container]}>
                                                        <Text style={[styles.statusText, statusStyle.text]}>
                                                            {t(`status.${issue.status.toLowerCase().replace(' ', '')}`)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={[styles.issueDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                                                    {issue.description}
                                                </Text>

                                                <View style={styles.issueFooter}>
                                                    <Text style={[styles.issueTime, { color: colors.textMuted }]}>
                                                        {formatTimeAgo(issue.reportedAt)}
                                                    </Text>
                                                    <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                                                    <Text style={[styles.priorityText, { color: priorityColor }]}>
                                                        {t(`priorities.${issue.priority.toLowerCase()}`)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: moderateScale(16),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(10) },
    logoBg: { backgroundColor: colors.primary, padding: moderateScale(8), borderRadius: moderateScale(8) },
    appName: { ...typography.h3, fontSize: moderateScale(20), color: colors.textPrimary },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(16) },
    notificationButton: { position: 'relative' },
    profileImage: { width: moderateScale(34), height: moderateScale(34), borderRadius: moderateScale(17) },
    mainContent: { flex: 1 },
    contentPadding: { padding: moderateScale(16), paddingBottom: moderateScale(40) },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: moderateScale(12),
        paddingHorizontal: moderateScale(12),
        marginBottom: moderateScale(24),
        height: moderateScale(48),
    },
    searchIcon: { marginRight: moderateScale(10) },
    searchInputText: { ...typography.body, fontSize: moderateScale(14) },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: moderateScale(24),
        gap: moderateScale(12),
    },
    statCard: {
        width: '48%',
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        gap: moderateScale(4),
    },
    statNumber: { ...typography.h2, fontSize: moderateScale(22) },
    statLabel: { ...typography.caption, fontSize: moderateScale(12) },
    statLink: { ...typography.caption, fontSize: moderateScale(12), fontWeight: '600', marginTop: moderateScale(4) },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: moderateScale(24),
        gap: moderateScale(12),
    },
    quickActionCard: {
        width: '30.5%',
        padding: moderateScale(12),
        borderRadius: moderateScale(12),
        alignItems: 'center',
        gap: moderateScale(8),
    },
    quickActionIconBg: { padding: moderateScale(10), borderRadius: moderateScale(10) },
    quickActionText: {
        ...typography.caption,
        fontWeight: '600',
        textAlign: 'center',
        color: colors.textPrimary,
        fontSize: moderateScale(11),
    },
    updateBadge: {
        position: 'absolute',
        top: moderateScale(6),
        right: moderateScale(6),
        backgroundColor: colors.error,
        paddingHorizontal: moderateScale(4),
        paddingVertical: moderateScale(1),
        borderRadius: moderateScale(4),
    },
    updateBadgeText: { color: colors.white, fontSize: moderateScale(8), fontWeight: 'bold' },
    sectionTitle: { ...typography.h3, fontSize: moderateScale(18), marginBottom: moderateScale(16), color: colors.textPrimary },
    categoryCard: { alignItems: 'center', gap: moderateScale(8), marginRight: moderateScale(16), width: moderateScale(70) },
    categoryIconBg: { backgroundColor: colors.surface, padding: moderateScale(12), borderRadius: moderateScale(12), borderWidth: 1, borderColor: colors.border },
    categoryIconText: { fontSize: moderateScale(22) },
    categoryText: { ...typography.caption, fontWeight: '500', color: colors.textSecondary, fontSize: moderateScale(11) },
    banner: {
        padding: moderateScale(20),
        borderRadius: moderateScale(16),
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: moderateScale(24),
    },
    bannerTitle: { ...typography.h3, color: colors.white, fontSize: moderateScale(18), marginBottom: moderateScale(4) },
    bannerText: { ...typography.body, color: colors.white, opacity: 0.9, fontSize: moderateScale(13) },
    bannerEmoji: { fontSize: moderateScale(32), marginLeft: moderateScale(10) },
    issuesList: { gap: moderateScale(12) },
    issueCard: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(12),
        padding: moderateScale(12),
        flexDirection: 'row',
        gap: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.border,
    },
    issueImage: { width: moderateScale(80), height: moderateScale(80), borderRadius: moderateScale(8) },
    issueDetails: { flex: 1, gap: moderateScale(4) },
    issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    issueTitle: { ...typography.h4, fontSize: moderateScale(15), color: colors.textPrimary, flex: 1 },
    issueDescription: { ...typography.body, fontSize: moderateScale(13) },
    issueFooter: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), marginTop: moderateScale(4) },
    issueTime: { ...typography.caption, fontSize: moderateScale(11) },
    priorityDot: { width: moderateScale(8), height: moderateScale(8), borderRadius: moderateScale(4) },
    priorityText: { ...typography.caption, fontSize: moderateScale(11), fontWeight: '600' },
    statusBadge: { paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(2), borderRadius: moderateScale(6) },
    statusText: { fontSize: moderateScale(10), fontWeight: '700' },
});

export default HomeScreen;
