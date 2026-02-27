import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    StatusBar,
    Linking,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
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
import { colors } from '../../src/styles/colors';
import { typography } from '../../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../../src/utils/responsive';


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

type StatusStyle = { container: object; text: object; };
type Category = { name: string; icon: string; key: string; };
type Worker = { id: string; name: string; role: string; avatar: string; };
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
    const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        totalIssues: 0,
        myIssues: 0,
        resolvedToday: 0,
        inProgress: 0,
        hasUpdates: false
    });
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

    const [workers, setWorkers] = useState<Worker[]>([]);

    const filteredIssues = React.useMemo(() => {
        if (!searchQuery.trim()) return recentIssues;
        const query = searchQuery.toLowerCase();
        return recentIssues.filter(issue =>
            issue.title.toLowerCase().includes(query) ||
            issue.description.toLowerCase().includes(query) ||
            issue.category.toLowerCase().includes(query)
        );
    }, [searchQuery, recentIssues]);

    // Fixed: Load dashboard data function
    const loadDashboardData = React.useCallback(async () => {
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

            return unsubscribe;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [auth, db]); // Fixed: Proper dependencies

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

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadDashboardData();
    }, [loadDashboardData]);

    const getStatusStyle = (status: string): StatusStyle => {
        switch (status) {
            case 'In Progress':
                return {
                    container: { backgroundColor: '#FEF3C7' }, // Keeping soft background
                    text: { color: colors.warning }
                };
            case 'Resolved':
                return {
                    container: { backgroundColor: '#D1FAE5' },
                    text: { color: colors.success }
                };
            case 'Open':
                return {
                    container: { backgroundColor: '#FEE2E2' },
                    text: { color: colors.error }
                };
            default:
                return { container: {}, text: {} };
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return '#DC2626';
            case 'High': return '#EA580C';
            case 'Medium': return '#2563EB';
            case 'Low': return '#059669';
            default: return '#6B7280';
        }
    };

    const handleHelplineCall = async () => {
        const phoneNumber = 'tel:+910000000000'; // Real helpline number should be configured
        const canOpen = await Linking.canOpenURL(phoneNumber);
        if (canOpen) {
            Linking.openURL(phoneNumber);
        } else {
            Alert.alert('Error', 'Unable to make phone call');
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header with notifications */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.logoBg}>
                        <IconShield />
                    </View>
                    <Text style={styles.appName}>{t('home.appName')}</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => router.push('/notifications')}
                    >
                        <IconBell hasNotifications={unreadNotifications > 0} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/profile')}>
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
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
                            <IconSearch />
                        </View>
                        <Text style={[styles.searchInput, { color: '#9CA3AF', paddingVertical: moderateScale(10) }]}>
                            {t('home.searchPlaceholder')}
                        </Text>
                    </TouchableOpacity>

                    {/* Stats Cards */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                            <Text style={styles.statNumber}>{stats.totalIssues}</Text>
                            <Text style={styles.statLabel}>{t('home.stats.totalIssues')}</Text>
                            <IconTrendingUp />
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                            <Text style={styles.statNumber}>{stats.myIssues}</Text>
                            <Text style={styles.statLabel}>{t('home.stats.myReports')}</Text>
                            <TouchableOpacity onPress={() => router.push('/mycomplaint')}>
                                <Text style={styles.statLink}>{t('home.stats.viewAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                            <Text style={styles.statNumber}>{stats.resolvedToday}</Text>
                            <Text style={styles.statLabel}>{t('home.stats.resolvedToday')}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={styles.statNumber}>{stats.inProgress}</Text>
                            <Text style={styles.statLabel}>{t('home.stats.inProgress')}</Text>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#EFF6FF' }]}
                            onPress={() => router.push('/report')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: '#3B82F6' }]}>
                                <IconCamera />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.report')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#F0FDF4' }]}
                            onPress={() => router.push('/mycomplaint')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: '#22C55E' }]}>
                                <IconActivity />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.track')}</Text>
                            {stats.hasUpdates && (
                                <View style={styles.updateBadge}>
                                    <Text style={styles.updateBadgeText}>{t('home.newBadge')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#F5F3FF' }]}
                            onPress={() => router.push('/NearbyIssues')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: '#8B5CF6' }]}>
                                <IconMapPin />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.nearby')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#FEF2F2' }]}
                            onPress={handleHelplineCall}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: '#EF4444' }]}>
                                <IconPhone />
                            </View>
                            <Text style={styles.quickActionText}>{t('home.quickActions.helpline')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#FFFBEB' }]}
                            onPress={() => router.push('/leaderBoard')}
                        >
                            <View style={[styles.quickActionIconBg, { backgroundColor: '#F59E0B' }]}>
                                <IconTrophy />
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
                    <View style={styles.banner}>
                        <View>
                            <Text style={styles.bannerTitle}>{t('home.bannerTitle')}</Text>
                            <Text style={styles.bannerText}>{t('home.bannerText')}</Text>
                        </View>
                        <Text style={styles.bannerEmoji}>✨</Text>
                    </View>

                    {/* Recent Updates */}
                    <View>
                        <Text style={styles.sectionTitle}>{t('home.recentUpdates')}</Text>
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
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

                                                <Text style={styles.issueDescription} numberOfLines={1}>
                                                    {issue.description}
                                                </Text>

                                                <View style={styles.issueFooter}>
                                                    <Text style={styles.issueTime}>
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

                    {/* Top Responders */}
                    <View>
                        <Text style={styles.sectionTitle}>{t('home.topResponders')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {workers.map((worker) => (
                                <View key={worker.id} style={styles.workerCard}>
                                    <Image source={{ uri: worker.avatar }} style={styles.workerAvatar} />
                                    <Text style={styles.workerName}>{worker.name}</Text>
                                    <Text style={styles.workerRole}>{worker.role}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: moderateScale(16),
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },
    logoBg: { backgroundColor: colors.primary, padding: moderateScale(8), borderRadius: moderateScale(8) },
    appName: { ...typography.h3, fontSize: moderateScale(20) },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(16) },
    notificationButton: { position: 'relative' },
    profileImage: { width: moderateScale(32), height: moderateScale(32), borderRadius: moderateScale(16) },
    mainContent: { flex: 1 },
    contentPadding: { padding: moderateScale(16), paddingBottom: moderateScale(24), gap: moderateScale(24) },
    searchContainer: { position: 'relative' },
    searchIcon: { position: 'absolute', top: moderateScale(14), left: moderateScale(16), zIndex: 1 },
    searchInput: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: moderateScale(24),
        paddingVertical: moderateScale(12),
        paddingLeft: moderateScale(48),
        paddingRight: moderateScale(16),
        fontSize: moderateScale(14),
        color: colors.textPrimary
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: moderateScale(8),
    },
    statCard: {
        width: '48%',
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        position: 'relative',
        minHeight: moderateScale(80),
    },
    statNumber: {
        ...typography.h2,
        fontSize: moderateScale(24),
    },
    statLabel: {
        ...typography.caption,
        fontSize: moderateScale(12),
        marginTop: moderateScale(4),
    },
    statLink: {
        ...typography.caption,
        fontSize: moderateScale(12),
        color: colors.primary,
        fontWeight: '600',
        marginTop: moderateScale(4),
    },
    sectionTitle: { ...typography.h3, fontSize: moderateScale(18), marginBottom: moderateScale(12) },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: moderateScale(16)
    },
    quickActionCard: {
        width: '48%',
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        gap: moderateScale(8),
        position: 'relative',
    },
    quickActionIconBg: { padding: moderateScale(8), borderRadius: moderateScale(8), alignSelf: 'flex-start' },
    quickActionText: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, fontSize: moderateScale(14) },
    updateBadge: {
        position: 'absolute',
        top: moderateScale(8),
        right: moderateScale(8),
        backgroundColor: colors.error,
        borderRadius: moderateScale(10),
        paddingHorizontal: moderateScale(6),
        paddingVertical: moderateScale(2),
    },
    updateBadgeText: {
        color: colors.white,
        fontSize: moderateScale(10),
        fontWeight: 'bold',
    },
    categoryCard: { alignItems: 'center', gap: moderateScale(8), width: moderateScale(80), marginRight: moderateScale(8) },
    categoryIconBg: { backgroundColor: '#F3F4F6', padding: moderateScale(16), borderRadius: moderateScale(12) },
    categoryIconText: { fontSize: moderateScale(24) },
    categoryText: { ...typography.bodySmall, fontWeight: '500', textAlign: 'center', fontSize: moderateScale(12) },
    banner: {
        backgroundColor: colors.accent,
        padding: moderateScale(20),
        borderRadius: moderateScale(16),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    bannerTitle: { ...typography.h3, color: colors.white, fontSize: moderateScale(18) },
    bannerText: { ...typography.bodySmall, color: colors.white, opacity: 0.9, marginTop: moderateScale(4), maxWidth: '90%', fontSize: moderateScale(13) },
    bannerEmoji: { fontSize: moderateScale(32) },
    issuesList: { gap: moderateScale(12) },
    issueCard: {
        backgroundColor: colors.surface,
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: moderateScale(16),
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    issueImage: { width: moderateScale(64), height: moderateScale(64), borderRadius: moderateScale(8), backgroundColor: '#F3F4F6' },
    issueDetails: { flex: 1, gap: moderateScale(6) },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    issueTitle: { ...typography.body, fontWeight: 'bold', fontSize: moderateScale(15), color: colors.textPrimary, flex: 1, marginRight: moderateScale(8) },
    issueDescription: { ...typography.bodySmall, lineHeight: moderateScale(18), fontSize: moderateScale(13) },
    issueFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
        marginTop: moderateScale(4),
    },
    issueTime: {
        ...typography.caption,
        fontSize: moderateScale(11),
    },
    priorityDot: {
        width: moderateScale(6),
        height: moderateScale(6),
        borderRadius: moderateScale(3),
    },
    priorityText: {
        ...typography.caption,
        fontSize: moderateScale(11),
        fontWeight: '500',
    },
    statusBadge: { paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(4), borderRadius: moderateScale(12) },
    statusText: { fontSize: moderateScale(12), fontWeight: '600' },
    workerCard: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        alignItems: 'center',
        marginRight: moderateScale(12),
        width: moderateScale(120),
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    workerAvatar: { width: moderateScale(60), height: moderateScale(60), borderRadius: moderateScale(30), marginBottom: moderateScale(8) },
    workerName: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', fontSize: moderateScale(13) },
    workerRole: { ...typography.caption, textAlign: 'center', fontSize: moderateScale(11) },
});

export default HomeScreen;
