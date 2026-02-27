import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Linking,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { useFirebase } from '../../src/hooks/useFirebase';
import { useTranslation } from 'react-i18next';
import {
    IconArrowLeft,
    IconClock,
    IconMapPin,
    IconShield,
    IconActivity,
    IconCheckCircle,
    IconTrendingUp
} from '../../src/components/Icons';
import { colors as staticColors } from '../../src/styles/colors';
import { typography } from '../../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../../src/utils/responsive';
import { useTheme } from '../../src/context/ThemeContext';
import { issueService } from '../../src/services/issueService';
import { useAuth } from '../../src/context/AuthContext';
import { useMemo } from 'react';

type Issue = {
    id: string;
    title: string;
    category: string;
    description: string;
    status: 'Open' | 'In Progress' | 'Resolved';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    imageUri: string;
    imageBase64?: string;
    reportedAt: Timestamp;
    reportedBy?: string;
    assignedDepartment?: string;
    adminNotes?: string;
    upvotes?: number;
    upvotedBy?: string[];
    location: {
        latitude: number;
        longitude: number;
        address: string;
    };
    statusHistory?: Array<{
        status: string;
        timestamp: Timestamp;
        note?: string;
    }>;
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
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    backButton: {
        padding: moderateScale(8),
    },
    headerTitle: {
        ...typography.h3,
        fontSize: moderateScale(18),
        color: colors.textPrimary,
    },
    mainImage: {
        width: '100%',
        height: moderateScale(250),
        backgroundColor: colors.border,
    },
    content: {
        padding: moderateScale(20),
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: moderateScale(12),
    },
    leftBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
    },
    statusBadge: {
        paddingHorizontal: moderateScale(10),
        paddingVertical: moderateScale(4),
        borderRadius: moderateScale(6),
    },
    statusText: {
        fontSize: moderateScale(12),
        fontWeight: 'bold',
    },
    categoryText: {
        ...typography.caption,
        fontSize: moderateScale(13),
        fontWeight: '500',
        color: colors.primary,
    },
    title: {
        ...typography.h2,
        fontSize: moderateScale(24),
        marginBottom: moderateScale(12),
        color: colors.textPrimary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: moderateScale(24),
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(6),
    },
    metaText: {
        ...typography.caption,
        fontSize: moderateScale(13),
        color: colors.textSecondary,
    },
    priorityBadge: {
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(2),
        borderRadius: moderateScale(4),
        borderWidth: 1,
    },
    priorityText: {
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    section: {
        marginBottom: moderateScale(24),
    },
    sectionTitle: {
        ...typography.body,
        fontSize: moderateScale(16),
        fontWeight: 'bold',
        marginBottom: moderateScale(8),
        color: colors.textPrimary,
    },
    description: {
        ...typography.body,
        fontSize: moderateScale(15),
        lineHeight: moderateScale(24),
        color: colors.textSecondary,
    },
    adminSection: {
        backgroundColor: colors.isDark ? '#1E293B' : '#EFF6FF',
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        marginBottom: moderateScale(24),
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    adminHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
        marginBottom: moderateScale(8),
    },
    adminTitle: {
        ...typography.body,
        fontWeight: 'bold',
        color: colors.isDark ? '#3B82F6' : '#1E40AF',
    },
    adminNotes: {
        ...typography.body,
        fontSize: moderateScale(15),
        lineHeight: moderateScale(22),
        color: colors.isDark ? '#94A3B8' : '#1E3A8A',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
        marginBottom: moderateScale(12),
    },
    locationText: {
        flex: 1,
        ...typography.caption,
        fontSize: moderateScale(15),
        color: colors.textSecondary,
    },
    directionButton: {
        backgroundColor: colors.primary,
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(8),
        alignItems: 'center',
    },
    directionButtonText: {
        ...typography.button,
        fontSize: moderateScale(16),
    },
    departmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(12),
        backgroundColor: colors.surface,
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        borderWidth: 1,
        borderColor: colors.border,
    },
    departmentName: {
        ...typography.body,
        fontSize: moderateScale(15),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    timelineContainer: {
        marginTop: moderateScale(12),
        paddingLeft: moderateScale(8),
    },
    timelineStep: {
        flexDirection: 'row',
        minHeight: moderateScale(50),
    },
    timelineLeft: {
        alignItems: 'center',
        width: moderateScale(30),
    },
    timelineDot: {
        width: moderateScale(20),
        height: moderateScale(20),
        borderRadius: moderateScale(10),
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    completedDot: {
        backgroundColor: colors.success,
    },
    pendingDot: {
        backgroundColor: colors.border,
    },
    activeDot: {
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.isDark ? '#1E40AF' : '#DBEAFE',
    },
    innerDot: {
        width: moderateScale(6),
        height: moderateScale(6),
        borderRadius: moderateScale(3),
        backgroundColor: colors.textMuted,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.border,
        marginVertical: moderateScale(2),
    },
    completedLine: {
        backgroundColor: colors.success,
    },
    timelineRight: {
        flex: 1,
        paddingLeft: moderateScale(12),
        paddingBottom: moderateScale(20),
    },
    timelineLabel: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        color: colors.textMuted,
    },
    completedLabel: {
        color: colors.textPrimary,
    },
    activeLabel: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    activeStatusText: {
        fontSize: moderateScale(12),
        color: colors.primary,
        marginTop: 2,
    },
    upvoteSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        marginTop: moderateScale(8),
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'space-between',
    },
    upvoteLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(12),
    },
    upvoteTitle: {
        ...typography.body,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    upvoteCount: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    upvoteButton: {
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(8),
        borderRadius: moderateScale(20),
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    upvoteButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    upvoteButtonText: {
        fontSize: moderateScale(13),
        fontWeight: 'bold',
        color: colors.primary,
    },
    upvoteButtonTextActive: {
        color: '#FFFFFF',
    },
});

const IssueDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { db } = useFirebase();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles({ ...colors, isDark }), [colors, isDark]);

    const [issue, setIssue] = useState<Issue | null>(null);
    const [loading, setLoading] = useState(true);
    const [upvoting, setUpvoting] = useState(false);

    const isUpvoted = useMemo(() => {
        if (!user || !issue?.upvotedBy) return false;
        return issue.upvotedBy.includes(user.uid);
    }, [user, issue]);

    const handleUpvote = async () => {
        if (!user || !id) {
            Alert.alert(t('common.error'), t('report.loginRequired'));
            return;
        }

        setUpvoting(true);
        const result = await issueService.toggleUpvote(id as string, user.uid);
        if (result.success) {
            // Update local state for immediate feedback
            setIssue(prev => {
                if (!prev) return null;
                const upvotedBy = prev.upvotedBy || [];
                const upvotes = prev.upvotes || 0;

                if (result.upvoted) {
                    return { ...prev, upvotes: upvotes + 1, upvotedBy: [...upvotedBy, user.uid] };
                } else {
                    return { ...prev, upvotes: Math.max(0, upvotes - 1), upvotedBy: upvotedBy.filter(uid => uid !== user.uid) };
                }
            });
        } else {
            Alert.alert(t('common.error'), result.error || "Failed to update upvote");
        }
        setUpvoting(false);
    };

    useEffect(() => {
        const fetchIssue = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'civicIssues', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setIssue({ id: docSnap.id, ...docSnap.data() } as Issue);
                } else {
                    Alert.alert(t('common.error'), t('issueDetail.notFound'));
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching issue:', error);
                Alert.alert(t('common.error'), t('issueDetail.loadError'));
            } finally {
                setLoading(false);
            }
        };

        fetchIssue();
    }, [id, db]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Resolved': return { bg: '#DCFCE7', text: colors.success };
            case 'In Progress': return { bg: '#FEF9C3', text: colors.warning };
            default: return { bg: '#FEE2E2', text: colors.error };
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return colors.error;
            case 'High': return colors.warning;
            case 'Medium': return colors.primary;
            default: return colors.success;
        }
    };

    const handleGetDirections = async () => {
        if (!issue) return;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${issue.location.latitude},${issue.location.longitude}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            Linking.openURL(url);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!issue) return null;

    const statusStyle = getStatusStyle(issue.status);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('issueDetail.headerTitle') || "Issue Details"}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Section */}
                {(issue.imageUri || issue.imageBase64) && (
                    <Image
                        source={{ uri: issue.imageBase64 ? `data:image/jpeg;base64,${issue.imageBase64}` : issue.imageUri }}
                        style={styles.mainImage}
                    />
                )}

                <View style={styles.content}>
                    {/* Status & Category */}
                    <View style={styles.badgeRow}>
                        <View style={styles.leftBadges}>
                            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                                    {t(`status.${issue.status.toLowerCase().replace(' ', '')}`)}
                                </Text>
                            </View>
                            <Text style={styles.categoryText}>
                                {t(`categories.${issue.category.toLowerCase().replace(' ', '')}`)}
                            </Text>
                        </View>

                        {/* Upvote Button in Badge Row for compact view, but the user asked for a section, so let's add the section below */}
                    </View>

                    <Text style={styles.title}>{issue.title}</Text>

                    {/* Upvoting Section */}
                    <View style={styles.upvoteSection}>
                        <View style={styles.upvoteLeft}>
                            <IconTrendingUp size={24} color={isUpvoted ? colors.primary : colors.textSecondary} />
                            <View>
                                <Text style={styles.upvoteTitle}>{t('issueDetail.supportTitle') || "Support this Issue"}</Text>
                                <Text style={styles.upvoteCount}>
                                    {(issue.upvotes || 0)} {t('issueDetail.upvotesCount') || "citizens supported this"}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.upvoteButton, isUpvoted && styles.upvoteButtonActive]}
                            onPress={handleUpvote}
                            disabled={upvoting}
                        >
                            {upvoting ? (
                                <ActivityIndicator size="small" color={isUpvoted ? "#FFF" : colors.primary} />
                            ) : (
                                <Text style={[styles.upvoteButtonText, isUpvoted && styles.upvoteButtonTextActive]}>
                                    {isUpvoted ? t('issueDetail.supported') || "Supported" : t('issueDetail.support') || "Support"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Status Timeline */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('issueDetail.statusTimeline')}</Text>
                        <View style={styles.timelineContainer}>
                            {[
                                { key: 'Open', label: t('issueDetail.timeline.reported'), icon: <IconClock size={16} color={colors.textMuted} /> },
                                { key: 'Acknowledged', label: t('issueDetail.timeline.acknowledged'), icon: <IconShield size={16} color={colors.textMuted} /> },
                                { key: 'In Progress', label: t('issueDetail.timeline.inProgress'), icon: <IconActivity size={16} color={colors.textMuted} /> },
                                { key: 'Resolved', label: t('issueDetail.timeline.resolved'), icon: <IconCheckCircle size={16} color={colors.textMuted} /> }
                            ].map((step, index, array) => {
                                const isCompleted = ['Resolved', 'In Progress', 'Acknowledged', 'Open'].indexOf(issue.status) >= ['Resolved', 'In Progress', 'Acknowledged', 'Open'].indexOf(step.key as any);
                                const isActive = issue.status === step.key;

                                return (
                                    <View key={step.key} style={styles.timelineStep}>
                                        <View style={styles.timelineLeft}>
                                            <View style={[
                                                styles.timelineDot,
                                                isCompleted ? styles.completedDot : styles.pendingDot,
                                                isActive && styles.activeDot
                                            ]}>
                                                {isCompleted ? <IconCheckCircle size={12} color="#FFFFFF" /> : <View style={styles.innerDot} />}
                                            </View>
                                            {index < array.length - 1 && (
                                                <View style={[
                                                    styles.timelineLine,
                                                    isCompleted && styles.completedLine
                                                ]} />
                                            )}
                                        </View>
                                        <View style={styles.timelineRight}>
                                            <Text style={[
                                                styles.timelineLabel,
                                                isCompleted && styles.completedLabel,
                                                isActive && styles.activeLabel
                                            ]}>
                                                {step.label}
                                            </Text>
                                            {isActive && (
                                                <Text style={styles.activeStatusText}>
                                                    {t('home.timeAgo.justNow')}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <IconClock size={16} color={colors.textMuted} />
                            <Text style={styles.metaText}>
                                {issue.reportedAt?.toDate().toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={[styles.priorityBadge, { borderColor: getPriorityColor(issue.priority) }]}>
                            <Text style={[styles.priorityText, { color: getPriorityColor(issue.priority) }]}>
                                {t('nearbyIssues.priorityLabel', { priority: t(`priorities.${issue.priority.toLowerCase()}`) })}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('issueDetail.description')}</Text>
                        <Text style={styles.description}>{issue.description}</Text>
                    </View>

                    {issue.adminNotes && (
                        <View style={styles.adminSection}>
                            <View style={styles.adminHeader}>
                                <IconShield size={18} color={colors.primary} />
                                <Text style={styles.adminTitle}>{t('issueDetail.adminResponse')}</Text>
                            </View>
                            <Text style={styles.adminNotes}>{issue.adminNotes}</Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('issueDetail.location')}</Text>
                        <View style={styles.locationContainer}>
                            <IconMapPin size={20} color="#6B7280" />
                            <Text style={styles.locationText}>{issue.location.address}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.directionButton}
                            onPress={handleGetDirections}
                        >
                            <Text style={styles.directionButtonText}>{t('issueDetail.getDirections')}</Text>
                        </TouchableOpacity>
                    </View>

                    {issue.assignedDepartment && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('issueDetail.assignedDepartment')}</Text>
                            <View style={styles.departmentCard}>
                                <IconActivity size={20} color="#2563EB" />
                                <Text style={styles.departmentName}>{issue.assignedDepartment}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default IssueDetailScreen;
