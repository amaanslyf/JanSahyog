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
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, query, onSnapshot, orderBy, Timestamp, limit, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const IconShield = () => <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>;

const IconBell = ({ hasNotifications = false }: { hasNotifications?: boolean }) => (
    <View style={{ position: 'relative' }}>
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
        {hasNotifications && (
            <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#EF4444'
            }} />
        )}
    </View>
);

const IconSearch = () => <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Circle cx="11" cy="11" r="8" /><Line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>;

const IconCamera = () => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0-2-2h-3l-2.5-3z" /><Circle cx="12" cy="13" r="3" /></Svg>;

const IconActivity = () => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>;

const IconMapPin = () => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><Circle cx="12" cy="10" r="3" /></Svg>;

const IconPhone = () => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81 .7A2 2 0 0 1 22 16.92z" /></Svg>;

const IconTrophy = () => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2L9 6l-4 1 2 5-2 5 4 1 3 4 3-4 4-1-2-5 2-5-4-1z" /></Svg>;

const IconTrendingUp = () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><Polyline points="17 6 23 6 23 12" /></Svg>;

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

    const categories: Category[] = [
        { name: t('categories.garbage'), icon: '🗑️', key: 'Garbage' },
        { name: t('categories.waterLeak'), icon: '💧', key: 'Water Leak' },
        { name: t('categories.roads'), icon: '🚧', key: 'Roads' },
        { name: t('categories.streetlight'), icon: '💡', key: 'Streetlight' },
        { name: t('categories.pollution'), icon: '💨', key: 'Pollution' },
        { name: t('categories.other'), icon: '📝', key: 'Other' },
    ];

    const dummyWorkers: Worker[] = [
        { id: '1', name: 'Ravi Kumar', role: 'Sanitation Dept.', avatar: 'https://i.pravatar.cc/150?img=8' },
        { id: '2', name: 'Sita Patil', role: 'Water Works', avatar: 'https://i.pravatar.cc/150?img=9' },
        { id: '3', name: 'Arjun Desai', role: 'Road Maintenance', avatar: 'https://i.pravatar.cc/150?img=10' },
        { id: '4', name: 'Priya Mehta', role: 'Electrical Dept.', avatar: 'https://i.pravatar.cc/150?img=11' },
    ];

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
        const unsubscribe: any = loadDashboardData();
        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [loadDashboardData]); // Fixed: Added loadDashboardData to dependencies

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadDashboardData();
    }, [loadDashboardData]);

    const getStatusStyle = (status: string): StatusStyle => {
        switch (status) {
            case 'In Progress': 
                return { 
                    container: styles.statusInProgress, 
                    text: styles.statusInProgressText 
                };
            case 'Resolved': 
                return { 
                    container: styles.statusResolved, 
                    text: styles.statusResolvedText 
                };
            case 'Open':
                return { 
                    container: styles.statusPending, 
                    text: styles.statusPendingText 
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
        const phoneNumber = 'tel:+911234567890';
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
            
            if (diffHours < 1) return 'Just now';
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        } catch {
            return 'Recently';
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
                        onPress={() => router.push('/mycomplaint')}
                    >
                        <IconBell hasNotifications={stats.hasUpdates} />
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
                    <View style={styles.searchContainer}>
                        <View style={styles.searchIcon}>
                            <IconSearch />
                        </View>
                        <TextInput 
                            placeholder={t('home.searchPlaceholder')} 
                            style={styles.searchInput} 
                            placeholderTextColor="#9CA3AF"
                            onFocus={() => {
                                Alert.alert('Search', 'Search functionality coming soon!');
                            }}
                        />
                    </View>

                    {/* Stats Cards */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                            <Text style={styles.statNumber}>{stats.totalIssues}</Text>
                            <Text style={styles.statLabel}>Total Issues</Text>
                            <IconTrendingUp />
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                            <Text style={styles.statNumber}>{stats.myIssues}</Text>
                            <Text style={styles.statLabel}>My Reports</Text>
                            <TouchableOpacity onPress={() => router.push('/mycomplaint')}>
                                <Text style={styles.statLink}>View →</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                            <Text style={styles.statNumber}>{stats.resolvedToday}</Text>
                            <Text style={styles.statLabel}>Resolved Today</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={styles.statNumber}>{stats.inProgress}</Text>
                            <Text style={styles.statLabel}>In Progress</Text>
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
                                    <Text style={styles.updateBadgeText}>New!</Text>
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
                                {recentIssues.map((issue) => {
                                    const statusStyle = getStatusStyle(issue.status);
                                    const priorityColor = getPriorityColor(issue.priority);
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={issue.id} 
                                            style={styles.issueCard}
                                            onPress={() => {
                                                Alert.alert(
                                                    issue.title,
                                                    `${issue.description}\n\nDepartment: ${issue.assignedDepartment || 'Not assigned'}\nStatus: ${issue.status}`
                                                );
                                            }}
                                        >
                                            <Image 
                                                source={{ uri: issue.imageUri || 'https://placehold.co/80x80' }} 
                                                style={styles.issueImage} 
                                            />
                                            <View style={styles.issueDetails}>
                                                <View style={styles.issueHeader}>
                                                    <Text style={styles.issueTitle} numberOfLines={1}>
                                                        {issue.title || issue.category}
                                                    </Text>
                                                    <View style={[styles.statusBadge, statusStyle.container]}>
                                                        <Text style={[styles.statusText, statusStyle.text]}>
                                                            {issue.status}
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
                                                        {issue.priority}
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
                            {dummyWorkers.map((worker) => (
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
    container: { flex: 1, backgroundColor: '#F9FAFB' }, 
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16, 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        borderBottomWidth: 1, 
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    }, 
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 }, 
    logoBg: { backgroundColor: '#2563EB', padding: 8, borderRadius: 8 }, 
    appName: { fontWeight: 'bold', fontSize: 20, color: '#1F2937' }, 
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 }, 
    notificationButton: { position: 'relative' }, 
    profileImage: { width: 32, height: 32, borderRadius: 16 }, 
    mainContent: { flex: 1 }, 
    contentPadding: { padding: 16, paddingBottom: 24, gap: 24 }, 
    searchContainer: { position: 'relative' }, 
    searchIcon: { position: 'absolute', top: 14, left: 16, zIndex: 1 }, 
    searchInput: { 
        backgroundColor: '#F3F4F6', 
        borderWidth: 1, 
        borderColor: '#E5E7EB', 
        borderRadius: 24, 
        paddingVertical: 12, 
        paddingLeft: 48, 
        paddingRight: 16, 
        fontSize: 14, 
        color: '#1F2937' 
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    statCard: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        position: 'relative',
        minHeight: 80,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    statLink: {
        fontSize: 12,
        color: '#2563EB',
        fontWeight: '600',
        marginTop: 4,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }, 
    quickActionsGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        rowGap: 16 
    }, 
    quickActionCard: { 
        width: '48%', 
        padding: 16, 
        borderRadius: 12, 
        gap: 8,
        position: 'relative',
    }, 
    quickActionIconBg: { padding: 8, borderRadius: 8, alignSelf: 'flex-start' }, 
    quickActionText: { fontWeight: '600', color: '#1F2937' },
    updateBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    updateBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    categoryCard: { alignItems: 'center', gap: 8, width: 80, marginRight: 8 }, 
    categoryIconBg: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12 }, 
    categoryIconText: { fontSize: 24 }, 
    categoryText: { fontSize: 12, fontWeight: '500', color: '#4B5563', textAlign: 'center' }, 
    banner: { 
        backgroundColor: '#4F46E5', 
        padding: 20, 
        borderRadius: 16, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    }, 
    bannerTitle: { fontWeight: 'bold', fontSize: 18, color: 'white' }, 
    bannerText: { fontSize: 14, color: 'white', opacity: 0.9, marginTop: 4, maxWidth: '90%' }, 
    bannerEmoji: { fontSize: 32 }, 
    issuesList: { gap: 12 }, 
    issueCard: { 
        backgroundColor: 'white', 
        padding: 16, 
        borderRadius: 12, 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        gap: 16, 
        borderWidth: 1, 
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    }, 
    issueImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F3F4F6' }, 
    issueDetails: { flex: 1, gap: 6 }, 
    issueHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start' 
    }, 
    issueTitle: { fontWeight: 'bold', fontSize: 15, color: '#1F2937', flex: 1, marginRight: 8 },
    issueDescription: { fontSize: 14, color: '#6B7280', lineHeight: 18 },
    issueFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    issueTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '500',
    },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }, 
    statusText: { fontSize: 12, fontWeight: '600' }, 
    statusInProgress: { backgroundColor: '#FEF3C7' }, 
    statusInProgressText: { color: '#92400E' }, 
    statusResolved: { backgroundColor: '#D1FAE5' }, 
    statusResolvedText: { color: '#065F46' }, 
    statusPending: { backgroundColor: '#FEE2E2' }, 
    statusPendingText: { color: '#991B1B' }, 
    workerCard: { 
        backgroundColor: 'white', 
        borderRadius: 12, 
        padding: 16, 
        alignItems: 'center', 
        marginRight: 12, 
        width: 120, 
        borderWidth: 1, 
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    }, 
    workerAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 }, 
    workerName: { fontWeight: '600', color: '#1F2937', fontSize: 14, textAlign: 'center' }, 
    workerRole: { fontSize: 12, color: '#6B7280', textAlign: 'center' }, 
});

export default HomeScreen;
