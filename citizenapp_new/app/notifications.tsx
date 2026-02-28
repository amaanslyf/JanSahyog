import React, { useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { IconBell, IconChevronLeft, IconCheckCircle, IconX } from '../src/components/Icons';
import { typography } from '../src/styles/typography';
import { moderateScale } from '../src/utils/responsive';
import { useTheme } from '../src/context/ThemeContext';
import { Timestamp } from 'firebase/firestore';

const NotificationsScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const { notifications, unreadNotifications, notificationService, isLoading } = useAuth();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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
            <View style={[styles.iconContainer, { backgroundColor: item.read ? (isDark ? '#1E293B' : '#F3F4F6') : (isDark ? '#1E293B' : '#EFF6FF') }]}>
                <IconBell hasNotifications={!item.read} color={item.read ? colors.textMuted : colors.primary} size={20} />
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
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconChevronLeft color={colors.textPrimary} size={24} />
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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(16),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: moderateScale(4),
    },
    headerTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    markReadText: {
        fontSize: moderateScale(12),
        color: colors.primary,
        fontWeight: '600',
    },
    listContent: {
        paddingVertical: moderateScale(8),
    },
    notificationItem: {
        flexDirection: 'row',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(16),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: isDark ? '#1E293B' : '#F0F7FF',
    },
    iconContainer: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(12),
    },
    textContainer: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: moderateScale(4),
    },
    notificationTitle: {
        fontSize: moderateScale(15),
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
        marginRight: moderateScale(8),
    },
    unreadTitle: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    timeText: {
        fontSize: moderateScale(11),
        color: colors.textMuted,
    },
    notificationBody: {
        fontSize: moderateScale(13),
        color: colors.textSecondary,
        lineHeight: moderateScale(18),
    },
    unreadDot: {
        width: moderateScale(8),
        height: moderateScale(8),
        borderRadius: moderateScale(4),
        backgroundColor: colors.primary,
        marginLeft: moderateScale(8),
    },
    emptyContainer: {
        marginTop: moderateScale(100),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: moderateScale(40),
    },
    emptyIconBg: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(16),
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyText: {
        fontSize: moderateScale(16),
        color: colors.textMuted,
        textAlign: 'center',
    },
});

export default NotificationsScreen;
