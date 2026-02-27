import React, { useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { IconBell, IconChevronLeft, IconCheckCircle, IconX } from '../src/components/Icons';
import { colors } from '../src/styles/colors';
import { typography } from '../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../src/utils/responsive';
import { Timestamp } from 'firebase/firestore';

const NotificationsScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { notifications, unreadNotifications, notificationService, isLoading } = useAuth();

    const handleMarkAllRead = async () => {
        if (notificationService) {
            await notificationService.markAllAsRead();
        }
    };

    const handleNotificationPress = async (notification: any) => {
        if (!notification.read && notificationService) {
            await notificationService.markNotificationAsRead(notification.id);
        }

        // Handle navigation based on notification data
        if (notification.data?.issueId) {
            router.push(`/IssueDetail/${notification.data.issueId}`);
        }
    };

    const formatDate = (timestamp: Timestamp) => {
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHrs / 24);

        if (diffHrs < 24) {
            if (diffHrs === 0) return t('home.timeAgo.justNow');
            return t('home.timeAgo.hours', { count: diffHrs });
        } else if (diffDays < 7) {
            return t('home.timeAgo.days', { count: diffDays });
        } else {
            return date.toLocaleDateString();
        }
    };

    const renderNotification = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.notificationItem, !item.read && styles.unreadItem]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.read ? '#F3F4F6' : '#EFF6FF' }]}>
                <IconBell hasNotifications={!item.read} color={item.read ? '#6B7280' : colors.primary} size={20} />
            </View>
            <View style={styles.textContainer as any}>
                <View style={styles.notificationHeader}>
                    <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
                        {item.title}
                    </Text>
                    <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.notificationBody} numberOfLines={2}>
                    {item.body}
                </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconChevronLeft color="#1F2937" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
                {unreadNotifications > 0 ? (
                    <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text style={styles.markReadText}>{t('notifications.markAllRead')}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBg}>
                            <IconBell color="#9CA3AF" size={48} />
                        </View>
                        <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(16),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: scale(4),
    },
    headerTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: '#1F2937',
        fontFamily: typography.semiBold,
    },
    markReadText: {
        fontSize: moderateScale(12),
        color: colors.primary,
        fontWeight: '600',
    },
    listContent: {
        paddingVertical: verticalScale(8),
    },
    notificationItem: {
        flexDirection: 'row',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(16),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: '#F0F7FF',
    },
    iconContainer: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(12),
    },
    textContainer: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(4),
    },
    notificationTitle: {
        fontSize: moderateScale(15),
        fontWeight: '600',
        color: '#374151',
        flex: 1,
        marginRight: scale(8),
    },
    unreadTitle: {
        color: '#111827',
        fontWeight: '700',
    },
    timeText: {
        fontSize: moderateScale(11),
        color: '#9CA3AF',
    },
    notificationBody: {
        fontSize: moderateScale(13),
        color: '#6B7280',
        lineHeight: moderateScale(18),
    },
    unreadDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: colors.primary,
        marginLeft: scale(8),
    },
    emptyContainer: {
        marginTop: verticalScale(100),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(40),
    },
    emptyIconBg: {
        width: scale(100),
        height: scale(100),
        borderRadius: scale(50),
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    emptyText: {
        fontSize: moderateScale(16),
        color: '#6B7280',
        textAlign: 'center',
    },
});

export default NotificationsScreen;
