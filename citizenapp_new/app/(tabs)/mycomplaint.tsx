import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    StatusBar,
    FlatList,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
// FIXED: Correct i18n import
import { useTranslation } from 'react-i18next';

// UPDATED: Match admin portal data structure
type Complaint = { 
    id: string; 
    title: string;
    category: string; 
    description: string; 
    imageUri: string; 
    coordinates?: number[];
    address?: string;
    location?: { latitude: number; longitude: number; }; 
    status: 'Open' | 'In Progress' | 'Resolved'; 
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    assignedDepartment?: string;
    adminNotes?: string;
    reportedAt: Timestamp; // CHANGED: reportedAt instead of submittedAt
    reportedById: string; // CHANGED: reportedById instead of userId
    lastUpdated?: Timestamp;
    updatedBy?: string;
    resolvedAt?: Timestamp;
};

type Status = 'All' | 'Open' | 'In Progress' | 'Resolved';
type StatusStyle = { container: object; text: object; };

const MyComplaintsScreen = () => {
    const { auth, db } = useFirebase();
    // FIXED: Use correct react-i18next hook
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<Status>('All');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setIsLoading(false);
            return;
        }
        
        // CRITICAL: Changed to civicIssues collection (same as admin portal)
        const complaintsRef = collection(db, "civicIssues");
        const q = query(
            complaintsRef, 
            where("reportedById", "==", currentUser.uid), // CHANGED: reportedById
            orderBy("reportedAt", "desc") // CHANGED: reportedAt
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userComplaints: Complaint[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                userComplaints.push({ 
                    id: doc.id, 
                    ...data,
                    // Ensure dates are properly converted
                    reportedAt: data.reportedAt || Timestamp.now(),
                    lastUpdated: data.lastUpdated || data.reportedAt || Timestamp.now(),
                } as Complaint);
            });
            setComplaints(userComplaints);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching complaints: ", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [auth.currentUser]);

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
            case 'Open': // CHANGED: Open instead of Pending
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

    const formatDate = (timestamp: Timestamp) => {
        try {
            const date = timestamp.toDate();
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Unknown';
        }
    };

    const filteredComplaints = complaints.filter(c => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Open') return c.status === 'Open'; // CHANGED: Open instead of Pending
        return c.status === activeTab;
    });

    const renderComplaint = ({ item }: { item: Complaint }) => {
        const statusStyle = getStatusStyle(item.status);
        const priorityColor = getPriorityColor(item.priority);
        
        return (
            <TouchableOpacity style={styles.complaintCard}>
                {/* Image */}
                <Image 
                    source={{ uri: item.imageUri || 'https://placehold.co/80x80' }} 
                    style={styles.complaintImage} 
                />
                
                <View style={styles.complaintDetails}>
                    {/* Header with title and status */}
                    <View style={styles.complaintHeader}>
                        <Text style={styles.complaintTitle} numberOfLines={1}>
                            {item.title || item.category}
                        </Text>
                        <View style={[styles.statusBadge, statusStyle.container]}>
                            <Text style={[styles.statusText, statusStyle.text]}>
                                {item.status}
                            </Text>
                        </View>
                    </View>

                    {/* Category and Priority */}
                    <View style={styles.metaRow}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                        <View style={[styles.priorityBadge, { borderColor: priorityColor }]}>
                            <Text style={[styles.priorityText, { color: priorityColor }]}>
                                {item.priority}
                            </Text>
                        </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.complaintDescription} numberOfLines={2}>
                        {item.description}
                    </Text>

                    {/* Department Assignment */}
                    {item.assignedDepartment && (
                        <Text style={styles.departmentText}>
                            📋 {item.assignedDepartment}
                        </Text>
                    )}

                    {/* Location */}
                    {item.address && (
                        <Text style={styles.locationText} numberOfLines={1}>
                            📍 {item.address}
                        </Text>
                    )}

                    {/* Admin Notes */}
                    {item.adminNotes && (
                        <View style={styles.adminNotesContainer}>
                            <Text style={styles.adminNotesLabel}>Admin Update:</Text>
                            <Text style={styles.adminNotesText} numberOfLines={2}>
                                {item.adminNotes}
                            </Text>
                        </View>
                    )}

                    {/* Timestamps */}
                    <View style={styles.timestampContainer}>
                        <Text style={styles.timestampText}>
                            Reported: {formatDate(item.reportedAt)}
                        </Text>
                        {item.lastUpdated && item.lastUpdated.seconds !== item.reportedAt.seconds && (
                            <Text style={[styles.timestampText, styles.updatedText]}>
                                Updated: {formatDate(item.lastUpdated)}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // UPDATED: Changed 'Pending' to 'Open' to match admin portal
    const TABS: { key: Status; label: string }[] = [
        { key: 'All', label: t('myComplaints.tabs.all') },
        { key: 'Open', label: t('myComplaints.tabs.pending') }, // Still use 'pending' translation
        { key: 'In Progress', label: t('myComplaints.tabs.inProgress') },
        { key: 'Resolved', label: t('myComplaints.tabs.resolved') },
    ];

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('myComplaints.title')}</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading your issues...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header with stats */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('myComplaints.title')}</Text>
                <Text style={styles.headerSubtitle}>
                    {complaints.length} total issues
                </Text>
            </View>

            {/* Tabs */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.tabScrollView}
                contentContainerStyle={styles.tabContainer}
            >
                {TABS.map(tab => {
                    const count = tab.key === 'All' ? complaints.length : 
                                  tab.key === 'Open' ? complaints.filter(c => c.status === 'Open').length :
                                  complaints.filter(c => c.status === tab.key).length;
                    
                    return (
                        <TouchableOpacity 
                            key={tab.key} 
                            style={[styles.tab, activeTab === tab.key && styles.activeTab]} 
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.countBadge, activeTab === tab.key && styles.activeCountBadge]}>
                                    <Text style={[styles.countText, activeTab === tab.key && styles.activeCountText]}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Issues List */}
            <FlatList
                data={filteredComplaints}
                renderItem={renderComplaint}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contentPadding}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateIcon}>📋</Text>
                        <Text style={styles.emptyStateTitle}>No Issues Found</Text>
                        <Text style={styles.emptyStateText}>
                            {activeTab === 'All' 
                                ? "You haven't submitted any issues yet." 
                                : `No ${activeTab.toLowerCase()} issues found.`
                            }
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({ 
    container: { flex: 1, backgroundColor: '#F9FAFB' }, 
    header: { 
        padding: 16, 
        backgroundColor: 'white', 
        borderBottomWidth: 1, 
        borderBottomColor: '#E5E7EB', 
        alignItems: 'center', 
    }, 
    headerTitle: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#1F2937', 
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    tabScrollView: {
        backgroundColor: 'white',
    },
    tabContainer: { 
        flexDirection: 'row', 
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    }, 
    tab: { 
        paddingVertical: 8, 
        paddingHorizontal: 16, 
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    }, 
    activeTab: { 
        backgroundColor: '#DBEAFE', 
    }, 
    tabText: { 
        color: '#4B5563', 
        fontWeight: '500', 
        fontSize: 14,
    }, 
    activeTabText: { 
        color: '#2563EB', 
        fontWeight: 'bold', 
    },
    countBadge: {
        backgroundColor: '#9CA3AF',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeCountBadge: {
        backgroundColor: '#2563EB',
    },
    countText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    activeCountText: {
        color: 'white',
    },
    contentPadding: { 
        padding: 16, 
        paddingBottom: 32, 
    }, 
    complaintCard: { 
        backgroundColor: 'white', 
        padding: 16, 
        borderRadius: 12, 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        gap: 16, 
        borderWidth: 1, 
        borderColor: '#E5E7EB', 
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.08,
        shadowRadius: 2.84,
        elevation: 2,
    }, 
    complaintImage: { 
        width: 80, 
        height: 80, 
        borderRadius: 8, 
        backgroundColor: '#F3F4F6', 
    }, 
    complaintDetails: { 
        flex: 1, 
        gap: 6, 
    }, 
    complaintHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 4,
    }, 
    complaintTitle: { 
        fontWeight: 'bold', 
        fontSize: 16, 
        color: '#1F2937', 
        flex: 1,
        marginRight: 8,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 14,
        color: '#2563EB',
        fontWeight: '500',
    },
    priorityBadge: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: 'transparent',
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
    },
    complaintDescription: { 
        fontSize: 14, 
        color: '#4B5563',
        lineHeight: 18,
    },
    departmentText: {
        fontSize: 13,
        color: '#059669',
        fontWeight: '500',
    },
    locationText: { 
        fontSize: 13, 
        color: '#6B7280',
    },
    adminNotesContainer: {
        backgroundColor: '#F0FDF4',
        padding: 8,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#10B981',
        marginTop: 4,
    },
    adminNotesLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#059669',
        marginBottom: 2,
    },
    adminNotesText: {
        fontSize: 13,
        color: '#065F46',
        lineHeight: 16,
    },
    timestampContainer: {
        marginTop: 8,
        gap: 2,
    },
    timestampText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    updatedText: {
        color: '#10B981',
        fontWeight: '500',
    },
    statusBadge: { 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 12,
    }, 
    statusText: { 
        fontSize: 12, 
        fontWeight: '600', 
    }, 
    statusInProgress: { backgroundColor: '#FEF3C7' }, 
    statusInProgressText: { color: '#92400E' }, 
    statusResolved: { backgroundColor: '#D1FAE5' }, 
    statusResolvedText: { color: '#065F46' }, 
    statusPending: { backgroundColor: '#FEE2E2' }, 
    statusPendingText: { color: '#991B1B' }, 
    emptyStateContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 80,
        paddingHorizontal: 40,
    },
    emptyStateIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    }, 
    emptyStateText: { 
        fontSize: 16, 
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    }, 
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
    },
});

export default MyComplaintsScreen;
