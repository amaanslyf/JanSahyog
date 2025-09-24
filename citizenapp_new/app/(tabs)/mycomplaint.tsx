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
    StatusBar,
    Alert,
} from 'react-native';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

// Icons
const IconClock = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Polyline points="12 6 12 12 16 14" />
    </Svg>
);

const IconMapPin = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle cx="12" cy="10" r="3" />
    </Svg>
);

const IconMessageSquare = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
);

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
                return { container: styles.statusOpen, text: styles.statusOpenText };
            case 'In Progress':
                return { container: styles.statusProgress, text: styles.statusProgressText };
            case 'Resolved':
                return { container: styles.statusResolved, text: styles.statusResolvedText };
            default:
                return { container: {}, text: {} };
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
            return 'Unknown date';
        }
    };

    const handleIssuePress = (issue: UserIssue) => {
        Alert.alert(
            issue.title,
            `Status: ${issue.status}\nDepartment: ${issue.assignedDepartment || 'Not assigned'}\n\n${issue.description}${issue.adminNotes ? `\n\nAdmin Notes: ${issue.adminNotes}` : ''}`,
            [
                { text: 'OK' },
                ...(issue.location ? [{
                    text: 'View Location',
                    onPress: () => {
                        // Open in maps app
                        const url = `https://maps.google.com/?q=${issue.location!.latitude},${issue.location!.longitude}`;
                        // You can use Linking.openURL(url) here
                    }
                }] : [])
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        // The real-time listener will automatically refresh the data
    };

    const renderIssue = ({ item }: { item: UserIssue }) => {
        const statusStyle = getStatusStyle(item.status);

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
                        <Text style={styles.imagePlaceholderText}>No Image</Text>
                    </View>
                )}

                <View style={styles.issueDetails}>
                    {/* Header */}
                    <View style={styles.issueHeader}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                        <View style={[styles.statusBadge, statusStyle.container]}>
                            <Text style={[styles.statusText, statusStyle.text]}>
                                {item.status}
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
                                Admin: {item.adminNotes}
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
                            Assigned to: {item.assignedDepartment}
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
                    <Text style={styles.loadingText}>Loading your complaints...</Text>
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
                <Text style={styles.headerTitle}>My Reports</Text>
                <Text style={styles.headerSubtitle}>
                    Track your submitted civic issues
                </Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
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
            </View>

            {/* Issues List */}
            {filteredIssues.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>
                        {filter === 'all' ? 'No Reports Yet' : `No ${filter.replace('-', ' ')} reports`}
                    </Text>
                    <Text style={styles.emptyText}>
                        {filter === 'all'
                            ? 'Start by reporting a civic issue in your area'
                            : `You don't have any ${filter.replace('-', ' ')} reports`
                        }
                    </Text>
                    {filter === 'all' && (
                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={() => router.push('/report')}
                        >
                            <Text style={styles.reportButtonText}>Report an Issue</Text>
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
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    header: {
        backgroundColor: '#2563EB',
        padding: 24,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'white',
        opacity: 0.9,
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB', // Use a lighter background for a subtle effect
        paddingHorizontal: 8, // Reduced horizontal padding
        paddingVertical: 12, // Increased vertical padding
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderRadius: 20,
        marginHorizontal: 4,
        backgroundColor: '#E5E7EB', // Default tab background
    },
    filterTabActive: {
        backgroundColor: '#2563EB',
    },
    filterTabText: {
        fontSize: 14,
        color: '#4B5563', // A slightly darker gray for better contrast
        fontWeight: '500',
        textAlign: 'center',
    },
    filterTabTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    issueCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    issueImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    issueDetails: {
        flex: 1,
        gap: 6,
    },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    categoryText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    statusOpen: {
        backgroundColor: '#FEE2E2',
    },
    statusOpenText: {
        color: '#991B1B',
    },
    statusProgress: {
        backgroundColor: '#FEF3C7',
    },
    statusProgressText: {
        color: '#92400E',
    },
    statusResolved: {
        backgroundColor: '#D1FAE5',
    },
    statusResolvedText: {
        color: '#065F46',
    },
    issueDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 18,
    },
    adminNotesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        padding: 8,
        borderRadius: 6,
    },
    adminNotesText: {
        fontSize: 12,
        color: '#166534',
        flex: 1,
        fontStyle: 'italic',
    },
    issueFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        marginLeft: 8,
    },
    locationText: {
        fontSize: 12,
        color: '#9CA3AF',
        flex: 1,
    },
    departmentText: {
        fontSize: 12,
        color: '#2563EB',
        fontWeight: '500',
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    reportButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    reportButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MyComplaintScreen;