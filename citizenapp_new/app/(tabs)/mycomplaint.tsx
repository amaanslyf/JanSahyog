import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Platform,
    ScrollView,
    StatusBar,
    Alert,
} from 'react-native';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { IconClock, IconMapPin, IconMessageSquare } from '../../src/components/Icons';
import { colors } from '../../src/styles/colors';
import { typography } from '../../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../../src/utils/responsive';

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
    const router = useRouter();

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
                return { container: { backgroundColor: '#FEE2E2' }, text: { color: colors.error } };
            case 'In Progress':
                return { container: { backgroundColor: '#FEF3C7' }, text: { color: colors.warning } };
            case 'Resolved':
                return { container: { backgroundColor: '#D1FAE5' }, text: { color: colors.success } };
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

    const formatDate = (timestamp: Timestamp) => {
        try {
            return timestamp.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
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
        // The real-time listener will automatically refresh the data
    };

    const renderIssue = ({ item }: { item: UserIssue }) => {
        const statusStyle = getStatusStyle(item.status);
        const priorityColor = getPriorityColor(item.priority);

        return (
            <TouchableOpacity style={styles.issueCard} onPress={() => handleIssuePress(item)}>
                {/* Issue Image */}
                {item.imageBase64 || item.imageUri ? (
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
                        <Text style={styles.imagePlaceholderText}>{t('myComplaints.noImage')}</Text>
                    </View>
                )}

                <View style={styles.issueDetails}>
                    {/* Header */}
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

                    {/* Category and Priority */}
                    <View style={styles.issueMetadata}>
                        <Text style={styles.categoryText}>
                            {t(`categories.${item.category.toLowerCase().replace(' ', '')}`)}
                        </Text>
                        <View style={styles.priorityContainer}>
                            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                            <Text style={[styles.priorityText, { color: priorityColor }]}>
                                {t(`priorities.${item.priority.toLowerCase()}`)}
                            </Text>
                        </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.issueDescription} numberOfLines={2}>
                        {item.description}
                    </Text>

                    {/* Admin Notes */}
                    {item.adminNotes && (
                        <View style={styles.adminNotesContainer}>
                            <IconMessageSquare />
                            <Text style={styles.adminNotesText} numberOfLines={1}>
                                {t('myComplaints.adminLabel')}{item.adminNotes}
                            </Text>
                        </View>
                    )}

                    {/* Footer */}
                    <View style={styles.issueFooter}>
                        <View style={styles.dateContainer}>
                            <IconClock />
                            <Text style={styles.dateText}>
                                {formatDate(item.reportedAt)}
                            </Text>
                        </View>

                        {item.location && (
                            <View style={styles.locationContainer}>
                                <IconMapPin />
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {item.location.address}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Department */}
                    {item.assignedDepartment && (
                        <Text style={styles.departmentText}>
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
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>{t('myComplaints.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const filteredIssues = getFilteredIssues();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('myComplaints.title')}</Text>
                <Text style={styles.headerSubtitle}>
                    {t('myComplaints.subtitle')}
                </Text>
            </View>

            {/* Filter Tabs */}
            <View style={{ backgroundColor: colors.surface }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    {[
                        { key: 'all', label: 'All', count: issues.length },
                        { key: 'open', label: 'Open', count: issues.filter(i => i.status === 'Open').length },
                        { key: 'in-progress', label: 'In Progress', count: issues.filter(i => i.status === 'In Progress').length },
                        { key: 'resolved', label: 'Resolved', count: issues.filter(i => i.status === 'Resolved').length },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.filterTab,
                                filter === tab.key && styles.filterTabActive
                            ]}
                            onPress={() => setFilter(tab.key as any)}
                        >
                            <Text style={[
                                styles.filterTabText,
                                filter === tab.key && styles.filterTabTextActive
                            ]}>
                                {tab.label} ({tab.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Issues List */}
            {filteredIssues.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>
                        {filter === 'all'
                            ? t('myComplaints.empty.title')
                            : t('myComplaints.empty.titleWithFilter', { filter: filter.replace('-', ' ') })}
                    </Text>
                    <Text style={styles.emptyText}>
                        {filter === 'all'
                            ? t('myComplaints.empty.subtitle')
                            : t('myComplaints.empty.subtitleWithFilter', { filter: filter.replace('-', ' ') })
                        }
                    </Text>
                    {filter === 'all' && (
                        <TouchableOpacity
                            style={styles.reportButton}
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
        color: colors.textMuted,
        fontSize: moderateScale(16),
    },
    header: {
        backgroundColor: colors.primary,
        padding: moderateScale(24),
        paddingBottom: moderateScale(20),
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
    filterTabActive: {
        backgroundColor: '#EFF6FF',
        borderColor: colors.primary,
    },
    filterTabText: {
        ...typography.caption,
        fontSize: moderateScale(13),
        textAlign: 'center',
        color: colors.textMuted,
    },
    filterTabTextActive: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    listContainer: {
        padding: moderateScale(16),
        gap: moderateScale(12),
    },
    issueCard: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        flexDirection: 'row',
        gap: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
        backgroundColor: '#F3F4F6',
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
        gap: moderateScale(6),
    },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    issueTitle: {
        ...typography.body,
        fontWeight: 'bold',
        fontSize: moderateScale(16),
        color: colors.textPrimary,
        flex: 1,
        marginRight: moderateScale(8),
    },
    statusBadge: {
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: moderateScale(12),
    },
    statusText: {
        fontSize: moderateScale(10),
        fontWeight: '600',
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
        fontWeight: '500',
    },
    issueDescription: {
        ...typography.bodySmall,
        lineHeight: moderateScale(18),
        fontSize: moderateScale(13),
    },
    adminNotesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(6),
        backgroundColor: '#F0FDF4',
        padding: moderateScale(8),
        borderRadius: moderateScale(6),
    },
    adminNotesText: {
        ...typography.caption,
        color: '#166534',
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
    },
    departmentText: {
        ...typography.caption,
        color: colors.primary,
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
        lineHeight: moderateScale(22),
        marginBottom: moderateScale(24),
    },
    reportButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: moderateScale(24),
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(8),
    },
    reportButtonText: {
        ...typography.button,
    },
});

export default MyComplaintScreen;
