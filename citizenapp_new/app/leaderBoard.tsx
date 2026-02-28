import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    FlatList,
    Image,
    Alert,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore';
import { useFirebase } from '../src/hooks/useFirebase';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { IconTrophyAlt as IconTrophy, IconStar, IconMedal, IconHelp, IconGift, IconArrowUp, IconArrowDown } from '../src/components/Icons';
import { useTheme } from '../src/context/ThemeContext';
import { typography } from '../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../src/utils/responsive';



type UserProfile = {
    id: string;
    email: string;
    displayName?: string;
    points: number;
    photoURL?: string;
    totalIssues: number;
    resolvedIssues: number;
    lastActive?: Date;
    rank: number;
    rankChange?: 'up' | 'down' | 'same';
};

const LeaderBoardScreen = () => {
    const router = useRouter();
    const { db } = useFirebase();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserRank, setCurrentUserRank] = useState<UserProfile | null>(null);

    // Fixed: Load leaderboard data function
    const loadLeaderboard = React.useCallback(async () => {
        try {
            // Get all users with their points
            const usersQuery = query(
                collection(db, 'users'),
                orderBy('points', 'desc'),
                limit(50)
            );

            const unsubscribe = onSnapshot(usersQuery, async (usersSnapshot) => {
                const userData: UserProfile[] = [];

                for (const userDoc of usersSnapshot.docs) {
                    const data = userDoc.data();
                    if (data.points && data.points > 0) {
                        // Get user's issue statistics
                        const userIssuesQuery = query(
                            collection(db, 'civicIssues'),
                            where('reportedById', '==', userDoc.id)
                        );
                        const issuesSnapshot = await getDocs(userIssuesQuery);
                        const issues = issuesSnapshot.docs.map(doc => doc.data());
                        const resolvedCount = issues.filter(issue => issue.status === 'Resolved').length;

                        userData.push({
                            id: userDoc.id,
                            email: data.email || t('leaderboard.unknown'),
                            displayName: data.displayName || data.email?.split('@')[0] || t('leaderboard.anonymous'),
                            points: data.points,
                            photoURL: data.photoURL,
                            totalIssues: issues.length,
                            resolvedIssues: resolvedCount,
                            lastActive: data.lastActive?.toDate(),
                            rank: 0, // Will be set below
                        });
                    }
                }

                // Sort by points and assign ranks
                userData.sort((a, b) => b.points - a.points);
                userData.forEach((userProfile, index) => {
                    userProfile.rank = index + 1;
                });


                setLeaderboard(userData);

                // Find current user's position
                if (user) {
                    const currentUser = userData.find(u => u.id === user.uid);
                    setCurrentUserRank(currentUser || null);
                }

                setLoading(false);
                setRefreshing(false);
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            setLoading(false);
            setRefreshing(false);
        }
    }, [db, user]); // Fixed: Proper dependencies

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        loadLeaderboard().then(unsub => {
            if (typeof unsub === 'function') {
                unsubscribe = unsub;
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [loadLeaderboard]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadLeaderboard();
    }, [loadLeaderboard]);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <IconTrophy color="#FFD700" size={20} />;
            case 2:
                return <IconMedal color="#C0C0C0" />;
            case 3:
                return <IconMedal color="#CD7F32" />;
            default:
                return <Text style={styles.rank}>#{rank}</Text>;
        }
    };

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return styles.firstPlace;
            case 2:
                return styles.secondPlace;
            case 3:
                return styles.thirdPlace;
            default:
                return styles.regularPlace;
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleUserPress = (selectedUser: UserProfile) => {
        if (selectedUser.id === user?.uid) {
            router.push('/profile');
        } else {
            Alert.alert(
                `${selectedUser.displayName}`,
                `${t('leaderboard.details.rank', { rank: selectedUser.rank })}\n${t('leaderboard.details.points', { points: selectedUser.points })}\n${t('leaderboard.details.reported', { count: selectedUser.totalIssues })}\n${t('leaderboard.details.resolved', { count: selectedUser.resolvedIssues })}`,
                [{ text: t('common.ok') }]
            );
        }
    };

    const renderUser = ({ item, index }: { item: UserProfile; index: number }) => (
        <TouchableOpacity
            style={[styles.userRow, getRankStyle(item.rank)]}
            onPress={() => handleUserPress(item)}
        >
            <View style={styles.rankContainer}>
                {getRankIcon(item.rank)}
            </View>

            <View style={styles.avatarContainer}>
                {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {getInitials(item.displayName || item.email)}
                        </Text>
                    </View>
                )}
                {item.id === user?.uid && (
                    <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>{t('leaderboard.you')}</Text>
                    </View>
                )}
            </View>

            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                    {item.displayName || item.email.split('@')[0]}
                </Text>
                <Text style={styles.userStats}>
                    {item.totalIssues} {t('profile.issuesReported')} • {item.resolvedIssues} {t('profile.resolved')}
                </Text>
                {item.lastActive && (
                    <Text style={styles.lastActive}>
                        {item.lastActive.toLocaleDateString()}
                    </Text>
                )}
            </View>

            <View style={styles.pointsContainer}>
                <Text style={styles.points}>{item.points}</Text>
                <View style={styles.starsContainer}>
                    <IconStar filled />
                </View>
                {item.rankChange && (
                    <View style={styles.rankChange}>
                        {item.rankChange === 'up' && <IconArrowUp />}
                        {item.rankChange === 'down' && <IconArrowDown />}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: t('leaderboard.title'), headerShown: true }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>{t('leaderboard.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: t('leaderboard.title'), headerShown: true }} />
            <StatusBar style={isDark ? "light" : "dark"} />

            <FlatList
                data={leaderboard}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    <>
                        <View style={styles.headerContainer}>
                            <IconTrophy color="white" size={32} />
                            <Text style={styles.headerTitle}>{t('leaderboard.topCitizens')}</Text>
                            <Text style={styles.headerSubtitle}>
                                {t('leaderboard.subtitle')}
                            </Text>
                            {currentUserRank && currentUserRank.rank > 10 && (
                                <TouchableOpacity
                                    style={styles.yourRankCard}
                                    onPress={() => router.push('/profile')}
                                >
                                    <Text style={styles.yourRankText}>
                                        {t('leaderboard.yourRank', { rank: currentUserRank.rank })}
                                    </Text>
                                    <Text style={styles.yourPointsText}>
                                        {t('leaderboard.points', { count: currentUserRank.points })}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Top 3 Podium */}
                        {leaderboard.length >= 3 && (
                            <View style={styles.podiumContainer}>
                                {/* Second Place */}
                                <TouchableOpacity
                                    style={[styles.podiumItem, styles.secondPlacePodium]}
                                    onPress={() => handleUserPress(leaderboard[1])}
                                >
                                    <Image
                                        source={{ uri: leaderboard[1].photoURL || 'https://i.pravatar.cc/150?img=2' }}
                                        style={styles.podiumAvatar}
                                    />
                                    <IconMedal color="#C0C0C0" />
                                    <Text style={styles.podiumName} numberOfLines={1}>
                                        {leaderboard[1].displayName}
                                    </Text>
                                    <Text style={styles.podiumPoints}>{leaderboard[1].points}</Text>
                                </TouchableOpacity>

                                {/* First Place */}
                                <TouchableOpacity
                                    style={[styles.podiumItem, styles.firstPlacePodium]}
                                    onPress={() => handleUserPress(leaderboard[0])}
                                >
                                    <Image
                                        source={{ uri: leaderboard[0].photoURL || 'https://i.pravatar.cc/150?img=1' }}
                                        style={[styles.podiumAvatar, styles.winnerAvatar]}
                                    />
                                    <IconTrophy color="#FFD700" size={24} />
                                    <Text style={[styles.podiumName, styles.winnerName]} numberOfLines={1}>
                                        {leaderboard[0].displayName}
                                    </Text>
                                    <Text style={[styles.podiumPoints, styles.winnerPoints]}>
                                        {leaderboard[0].points}
                                    </Text>
                                </TouchableOpacity>

                                {/* Third Place */}
                                <TouchableOpacity
                                    style={[styles.podiumItem, styles.thirdPlacePodium]}
                                    onPress={() => handleUserPress(leaderboard[2])}
                                >
                                    <Image
                                        source={{ uri: leaderboard[2].photoURL || 'https://i.pravatar.cc/150?img=3' }}
                                        style={styles.podiumAvatar}
                                    />
                                    <IconMedal color="#CD7F32" />
                                    <Text style={styles.podiumName} numberOfLines={1}>
                                        {leaderboard[2].displayName}
                                    </Text>
                                    <Text style={styles.podiumPoints}>{leaderboard[2].points}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.listHeaderContainer}>
                            <Text style={styles.listHeaderTitle}>{t('leaderboard.allRankings')}</Text>
                        </View>
                    </>
                }
                ListFooterComponent={
                    <View style={styles.footerContainer}>
                        <View style={styles.infoBox}>
                            <IconHelp />
                            <Text style={styles.infoTitle}>{t('leaderboard.howItWorks')}</Text>
                            <Text style={styles.infoText}>{t('leaderboard.pointsPerComplaint')}</Text>
                            <Text style={styles.infoText}>{t('leaderboard.bonusPointsPhoto')}</Text>
                            <Text style={styles.infoText}>{t('leaderboard.realtimeUpdates')}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <IconGift />
                            <Text style={styles.infoTitle}>{t('leaderboard.monthlyPrizes')}</Text>
                            <Text style={styles.infoText}>
                                {t('leaderboard.prizesDescription')}
                            </Text>
                        </View>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
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
        color: colors.textSecondary,
    },
    headerContainer: {
        backgroundColor: colors.primary,
        padding: moderateScale(24),
        alignItems: 'center',
        gap: moderateScale(8)
    },
    headerTitle: {
        ...typography.h2,
        fontSize: moderateScale(28),
        color: colors.white
    },
    headerSubtitle: {
        ...typography.body,
        fontSize: moderateScale(15),
        color: colors.white,
        opacity: 0.9,
        textAlign: 'center'
    },
    yourRankCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        marginTop: moderateScale(12),
        alignItems: 'center',
    },
    yourRankText: {
        color: colors.white,
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    yourPointsText: {
        color: colors.white,
        fontSize: moderateScale(14),
        opacity: 0.9,
    },
    podiumContainer: {
        backgroundColor: colors.primary,
        paddingHorizontal: moderateScale(20),
        paddingBottom: moderateScale(20),
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: moderateScale(16),
    },
    podiumItem: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        minWidth: moderateScale(100),
        flex: 1,
    },
    firstPlacePodium: {
        marginBottom: 0,
        borderWidth: 3,
        borderColor: colors.gold,
    },
    secondPlacePodium: {
        marginBottom: moderateScale(10),
    },
    thirdPlacePodium: {
        marginBottom: moderateScale(20),
    },
    podiumAvatar: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        marginBottom: moderateScale(8),
    },
    winnerAvatar: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        borderWidth: 3,
        borderColor: colors.gold,
    },
    podiumName: {
        ...typography.caption,
        fontWeight: '600',
        fontSize: moderateScale(12),
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: moderateScale(4),
    },
    winnerName: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
    },
    podiumPoints: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        color: colors.gold,
        marginTop: moderateScale(2),
    },
    winnerPoints: {
        fontSize: moderateScale(16),
    },
    listHeaderContainer: {
        backgroundColor: colors.surface,
        padding: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    listHeaderTitle: {
        ...typography.h3,
        fontSize: moderateScale(18),
        color: colors.textPrimary,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(12),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: moderateScale(12)
    },
    firstPlace: {
        backgroundColor: isDark ? '#1E1B4B' : '#FFFBEB',
        borderLeftWidth: 4,
        borderLeftColor: colors.gold,
    },
    secondPlace: {
        backgroundColor: isDark ? '#1E293B' : colors.background,
        borderLeftWidth: 4,
        borderLeftColor: '#C0C0C0',
    },
    thirdPlace: {
        backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
        borderLeftWidth: 4,
        borderLeftColor: '#CD7F32',
    },
    regularPlace: {},
    rankContainer: {
        width: moderateScale(40),
        alignItems: 'center',
    },
    rank: {
        ...typography.body,
        fontWeight: 'bold',
        fontSize: moderateScale(16),
        color: colors.textSecondary,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20)
    },
    avatarPlaceholder: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: colors.white,
        fontSize: moderateScale(14),
        fontWeight: 'bold',
    },
    youBadge: {
        position: 'absolute',
        bottom: moderateScale(-4),
        right: moderateScale(-4),
        backgroundColor: colors.success,
        borderRadius: moderateScale(8),
        paddingHorizontal: moderateScale(4),
        paddingVertical: moderateScale(1),
    },
    youBadgeText: {
        color: colors.white,
        fontSize: moderateScale(8),
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        ...typography.body,
        fontWeight: '600',
        fontSize: moderateScale(15),
        color: colors.textPrimary,
    },
    userStats: {
        ...typography.caption,
        fontSize: moderateScale(11),
        marginTop: moderateScale(2),
        color: colors.textSecondary,
    },
    lastActive: {
        ...typography.caption,
        fontSize: moderateScale(10),
        marginTop: moderateScale(1),
        color: colors.textMuted,
    },
    pointsContainer: {
        alignItems: 'center',
        position: 'relative',
    },
    points: {
        ...typography.body,
        fontWeight: 'bold',
        fontSize: moderateScale(16),
        color: colors.gold
    },
    starsContainer: {
        marginTop: moderateScale(2),
    },
    rankChange: {
        position: 'absolute',
        top: moderateScale(-8),
        right: moderateScale(-8),
        backgroundColor: colors.surface,
        borderRadius: moderateScale(8),
        padding: moderateScale(2),
    },
    footerContainer: {
        padding: moderateScale(16),
        gap: moderateScale(16),
        paddingBottom: moderateScale(40)
    },
    infoBox: {
        padding: moderateScale(16),
        backgroundColor: colors.surface,
        borderRadius: moderateScale(12),
        alignItems: 'center',
        gap: moderateScale(8),
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoTitle: {
        ...typography.body,
        fontWeight: 'bold',
        fontSize: moderateScale(15),
        color: colors.textPrimary,
    },
    infoText: {
        ...typography.caption,
        fontSize: moderateScale(12),
        textAlign: 'center',
        color: colors.textSecondary,
    },
});

export default LeaderBoardScreen;
