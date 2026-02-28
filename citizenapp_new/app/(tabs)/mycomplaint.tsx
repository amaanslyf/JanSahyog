import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { IconClock, IconMapPin, IconMessageSquare } from '../../src/components/Icons';
import { typography } from '../../src/styles/typography';
import { moderateScale } from '../../src/utils/responsive';
import { useTheme } from '../../src/context/ThemeContext';

type UserIssue = {
    id: string;
    title: string;
    description: string;
    category: string;
    status: 'Open' | 'In Progress' | 'Resolved';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    imageBase64?: string;
    imageUri?: string;
    reportedAt: Timestamp;
    lastUpdated: Timestamp;
    assignedDepartment?: string;
    adminNotes?: string;
    location?: {
        latitude: number;
        longitude: number;
        address: string;
    };
};

const MyComplaintScreen = () => {
    const { db } = useFirebase();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [issues, setIssues] = useState<UserIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved'>('all');

    useEffect(() => {
        if (!user) return;

        const issuesRef = collection(db, 'civicIssues');
        const userIssuesQuery = query(
            issuesRef,
            where('reportedById', '==', user.uid),
            orderBy('reportedAt', 'desc')
        );

        const unsubscribe = onSnapshot(userIssuesQuery, (snapshot) => {
            const userIssues: UserIssue[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                userIssues.push({
                    id: doc.id,
                    ...data,
                    reportedAt: data.reportedAt || Timestamp.now(),
                    lastUpdated: data.lastUpdated || data.reportedAt || Timestamp.now(),
                } as UserIssue);
            });

            setIssues(userIssues);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsubscribe();
    }, [user, db]);

    const getFilteredIssues = () => {
        switch (filter) {
            case 'open':
                return issues.filter(issue => issue.status === 'Open');
            case 'in-progress':
                return issues.filter(issue => issue.status === 'In Progress');
            case 'resolved':
                return issues.filter(issue => issue.status === 'Resolved');
            default:
                return issues;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Open':
                return { container: { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }, text: { color: colors.error } };
            case 'In Progress':
                return { container: { backgroundColor: isDark ? '#3B2A0A' : '#FEF3C7' }, text: { color: colors.warning } };
            case 'Resolved':
                return { container: { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }, text: { color: colors.success } };
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

    const formatDate = (timestamp: Timestamp) => {
        try {
            return timestamp.toDate().toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return t('myComplaints.unknownDate');
        }
    };

    const handleIssuePress = (issue: UserIssue) => {
        router.push(`/IssueDetail/${issue.id}` as any);
    };

    const onRefresh = () => {
        setRefreshing(true);
    };

    const renderIssue = ({ item }: { item: UserIssue }) => {
        const statusStyle = getStatusStyle(item.status);
        const priorityColor = getPriorityColor(item.priority);

        return (
            <TouchableOpacity style={styles.issueCard} onPress={() => handleIssuePress(item)}>
                {(item.imageBase64 || item.imageUri) ? (
                    <Image
                        source={{
                            uri: item.imageBase64 ?
                                `data:image/jpeg;base64,${item.imageBase64}` :
                                item.imageUri
                        }}
                        style={styles.issueImage}
                    />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>{t('myComplaints.noImage')}</Text>
                    </View>
                )}

                <View style={styles.issueDetails}>
                    <View style={styles.issueHeader}>
                        <Text style={styles.issueTitle} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <View style={[styles.statusBadge, statusStyle.container]}>
                            <Text style={[styles.statusText, statusStyle.text]}>
                                {t(`status.${item.status.toLowerCase().replace(' ', '')}`)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.issueMetadata}>
                        <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                            {t(`categories.${item.category.toLowerCase().replace(' ', '')}`)}
                        </Text>
                        <View style={styles.priorityContainer}>
                            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                            <Text style={[styles.priorityText, { color: priorityColor }]}>
                                {t(`priorities.${item.priority.toLowerCase()}`)}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.issueDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.description}
                    </Text>

                    {item.adminNotes && (
                        <View style={[styles.adminNotesContainer, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
                            <IconMessageSquare color={isDark ? colors.success : '#166534'} />
                            <Text style={[styles.adminNotesText, { color: isDark ? colors.success : '#166534' }]} numberOfLines={1}>
                                {t('myComplaints.adminLabel')}{item.adminNotes}
                            </Text>
                        </View>
                    )}

                    <View style={styles.issueFooter}>
                        <View style={styles.dateContainer}>
                            <IconClock color={colors.textMuted} />
                            <Text style={[styles.dateText, { color: colors.textMuted }]}>
                                {formatDate(item.reportedAt)}
                            </Text>
                        </View>

                        {item.location && (
                            <View style={styles.locationContainer}>
                                <IconMapPin color={colors.textMuted} />
                                <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>
                                    {item.location.address}
                                </Text>
                            </View>
                        )}
                    </View>

                    {item.assignedDepartment && (
                        <Text style={[styles.departmentText, { color: colors.primary }]}>
                            {t('myComplaints.assignedTo')}{item.assignedDepartment}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('myComplaints.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const filteredIssues = getFilteredIssues();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('myComplaints.title')}</Text>
                <Text style={styles.headerSubtitle}>
                    {t('myComplaints.subtitle')}
                </Text>
            </View>

            <View style={{ backgroundColor: colors.surface }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    {[
                        { key: 'all' as const, label: t('myComplaints.tabs.all'), count: issues.length },
                        { key: 'open' as const, label: t('myComplaints.tabs.open'), count: issues.filter(i => i.status === 'Open').length },
                        { key: 'in-progress' as const, label: t('myComplaints.tabs.inProgress'), count: issues.filter(i => i.status === 'In Progress').length },
                        { key: 'resolved' as const, label: t('myComplaints.tabs.resolved'), count: issues.filter(i => i.status === 'Resolved').length },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.filterTab,
                                filter === tab.key && { borderColor: colors.primary, backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }
                            ]}
                            onPress={() => setFilter(tab.key)}
                        >
                            <Text style={[
                                styles.filterTabText,
                                filter === tab.key && { color: colors.primary, fontWeight: 'bold' }
                            ]}>
                                {tab.label} ({tab.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {filteredIssues.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                        {filter === 'all'
                            ? t('myComplaints.empty.title')
                            : t('myComplaints.empty.titleWithFilter', { filter: t(`myComplaints.tabs.${filter === 'in-progress' ? 'inProgress' : filter}`) })}
                    </Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {filter === 'all'
                            ? t('myComplaints.empty.subtitle')
                            : t('myComplaints.empty.subtitleWithFilter', { filter: t(`myComplaints.tabs.${filter === 'in-progress' ? 'inProgress' : filter}`) })
                        }
                    </Text>
                    {filter === 'all' && (
                        <TouchableOpacity
                            style={[styles.reportButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/report')}
                        >
                            <Text style={styles.reportButtonText}>{t('myComplaints.empty.button')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filteredIssues}
                    renderItem={renderIssue}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </SafeAreaView>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: moderateScale(12),
    },
    loadingText: {
        ...typography.body,
        fontSize: moderateScale(16),
    },
    header: {
        backgroundColor: colors.primary,
        padding: moderateScale(24),
    },
    headerTitle: {
        ...typography.h2,
        color: colors.white,
        fontSize: moderateScale(24),
        marginBottom: moderateScale(4),
    },
    headerSubtitle: {
        ...typography.body,
        color: colors.white,
        opacity: 0.9,
    },
    filterScrollContent: {
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(12),
        backgroundColor: colors.surface,
    },
    filterTab: {
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(16),
        alignItems: 'center',
        borderRadius: moderateScale(20),
        marginRight: moderateScale(8),
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterTabText: {
        ...typography.caption,
        fontSize: moderateScale(13),
        textAlign: 'center',
        color: colors.textMuted,
    },
    listContainer: {
        padding: moderateScale(16),
        gap: moderateScale(12),
    },
    issueCard: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(12),
        padding: moderateScale(12),
        flexDirection: 'row',
        gap: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.border,
    },
    issueImage: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(8),
    },
    imagePlaceholder: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(8),
        backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        ...typography.caption,
        fontSize: moderateScale(10),
        textAlign: 'center',
    },
    issueDetails: {
        flex: 1,
        gap: moderateScale(4),
    },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    issueTitle: {
        ...typography.body,
        fontWeight: 'bold',
        fontSize: moderateScale(15),
        color: colors.textPrimary,
        flex: 1,
        marginRight: moderateScale(8),
    },
    statusBadge: {
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(2),
        borderRadius: moderateScale(6),
    },
    statusText: {
        fontSize: moderateScale(10),
        fontWeight: '700',
    },
    issueMetadata: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryText: {
        ...typography.caption,
        fontWeight: '500',
    },
    priorityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(4),
    },
    priorityDot: {
        width: moderateScale(6),
        height: moderateScale(6),
        borderRadius: moderateScale(3),
    },
    priorityText: {
        ...typography.caption,
        fontWeight: '600',
    },
    issueDescription: {
        ...typography.bodySmall,
        fontSize: moderateScale(13),
    },
    adminNotesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(6),
        padding: moderateScale(8),
        borderRadius: moderateScale(6),
    },
    adminNotesText: {
        ...typography.caption,
        flex: 1,
        fontStyle: 'italic',
    },
    issueFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: moderateScale(4),
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(4),
    },
    dateText: {
        ...typography.caption,
        fontSize: moderateScale(11),
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(4),
        flex: 1,
        marginLeft: moderateScale(8),
    },
    locationText: {
        ...typography.caption,
        flex: 1,
        fontSize: moderateScale(11),
    },
    departmentText: {
        ...typography.caption,
        fontWeight: '500',
        marginTop: moderateScale(4),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: moderateScale(32),
    },
    emptyTitle: {
        ...typography.h3,
        marginBottom: moderateScale(8),
        textAlign: 'center',
    },
    emptyText: {
        ...typography.body,
        textAlign: 'center',
        marginBottom: moderateScale(24),
    },
    reportButton: {
        paddingHorizontal: moderateScale(24),
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(8),
    },
    reportButtonText: {
        ...typography.button,
        color: '#FFFFFF',
    },
});

export default MyComplaintScreen;
