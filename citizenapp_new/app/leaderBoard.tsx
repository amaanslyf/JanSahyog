import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    SafeAreaView, 
    StyleSheet, 
    StatusBar, 
    FlatList, 
    Image, 
    ActivityIndicator, 
    RefreshControl,
    TouchableOpacity,
    Alert 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore';
import { useFirebase } from '../src/hooks/useFirebase';
import { useAuth } from '../src/context/AuthContext';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';

// Icons
const IconTrophy = ({ color = "#F59E0B", size = 24 }: { color?: string, size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <Path d="M4 22h16" />
        <Path d="M10 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34" />
        <Path d="M2 14a6 6 0 0 0 6-6V6h8v2a6 6 0 0 0 6 6H2Z" />
    </Svg>
);

const IconStar = ({ filled = true }: { filled?: boolean }) => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="1">
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
);

const IconMedal = ({ color = "#F59E0B" }: { color?: string }) => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="8" r="6" />
        <Path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </Svg>
);

const IconHelp = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <Path d="M12 17h.01" />
    </Svg>
);

const IconGift = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="20 12 20 22 4 22 4 12" />
        <Rect x="2" y="7" width="20" height="5" />
        <Line x1="12" y1="22" x2="12" y2="7" />
        <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </Svg>
);

const IconArrowUp = () => (
    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Line x1="12" y1="19" x2="12" y2="5" />
        <Polyline points="5 12 12 5 19 12" />
    </Svg>
);

const IconArrowDown = () => (
    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Line x1="12" y1="5" x2="12" y2="19" />
        <Polyline points="19 12 12 19 5 12" />
    </Svg>
);

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
                            email: data.email || 'Unknown',
                            displayName: data.displayName || data.email?.split('@')[0] || 'Anonymous User',
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

                // Add some dummy users if we don't have enough real users
                if (userData.length < 3) {
                    const dummyUsers = [
                        { 
                            id: 'dummy1', 
                            email: 'priya.sharma@example.com',
                            displayName: 'Priya Sharma', 
                            points: 1250, 
                            photoURL: 'https://i.pravatar.cc/150?img=1',
                            totalIssues: 15,
                            resolvedIssues: 12,
                            rank: userData.length + 1
                        },
                        { 
                            id: 'dummy2', 
                            email: 'rohan.verma@example.com',
                            displayName: 'Rohan Verma', 
                            points: 1120, 
                            photoURL: 'https://i.pravatar.cc/150?img=2',
                            totalIssues: 12,
                            resolvedIssues: 10,
                            rank: userData.length + 2
                        },
                        { 
                            id: 'dummy3', 
                            email: 'aisha.khan@example.com',
                            displayName: 'Aisha Khan', 
                            points: 980, 
                            photoURL: 'https://i.pravatar.cc/150?img=3',
                            totalIssues: 11,
                            resolvedIssues: 8,
                            rank: userData.length + 3
                        }
                    ];

                    userData.push(...dummyUsers);
                    
                    // Re-sort and re-rank
                    userData.sort((a, b) => b.points - a.points);
                    userData.forEach((userProfile, index) => {
                        userProfile.rank = index + 1;
                    });
                }

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
        const unsubscribe: any = loadLeaderboard();
        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [loadLeaderboard]); // Fixed: Added loadLeaderboard to dependencies

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
                `Rank: #${selectedUser.rank}\nPoints: ${selectedUser.points}\nIssues Reported: ${selectedUser.totalIssues}\nResolved: ${selectedUser.resolvedIssues}`,
                [{ text: 'OK' }]
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
                        <Text style={styles.youBadgeText}>You</Text>
                    </View>
                )}
            </View>

            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                    {item.displayName || item.email.split('@')[0]}
                </Text>
                <Text style={styles.userStats}>
                    {item.totalIssues} issues • {item.resolvedIssues} resolved
                </Text>
                {item.lastActive && (
                    <Text style={styles.lastActive}>
                        Active {item.lastActive.toLocaleDateString()}
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
                <Stack.Screen options={{ title: 'Leaderboard', headerShown: true }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading leaderboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Leaderboard', headerShown: true }} />
            <StatusBar barStyle="dark-content" />

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
                            <Text style={styles.headerTitle}>Top Citizens</Text>
                            <Text style={styles.headerSubtitle}>
                                See who&apos;s making the biggest impact in our city!
                            </Text>
                            {currentUserRank && currentUserRank.rank > 10 && (
                                <TouchableOpacity 
                                    style={styles.yourRankCard}
                                    onPress={() => router.push('/profile')}
                                >
                                    <Text style={styles.yourRankText}>
                                        Your Rank: #{currentUserRank.rank}
                                    </Text>
                                    <Text style={styles.yourPointsText}>
                                        {currentUserRank.points} points
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
                            <Text style={styles.listHeaderTitle}>All Rankings</Text>
                        </View>
                    </>
                }
                ListFooterComponent={
                    <View style={styles.footerContainer}>
                        <View style={styles.infoBox}>
                            <IconHelp />
                            <Text style={styles.infoTitle}>How it Works</Text>
                            <Text style={styles.infoText}>+10 points for each valid complaint reported.</Text>
                            <Text style={styles.infoText}>+5 bonus points for adding a photo.</Text>
                            <Text style={styles.infoText}>Rankings update in real-time!</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <IconGift />
                            <Text style={styles.infoTitle}>Monthly Prizes</Text>
                            <Text style={styles.infoText}>
                                Top 3 users every month win exciting prizes and city merchandise!
                            </Text>
                        </View>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F9FAFB' 
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
    headerContainer: { 
        backgroundColor: '#2563EB', 
        padding: 24, 
        alignItems: 'center', 
        gap: 8 
    },
    headerTitle: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: 'white' 
    },
    headerSubtitle: { 
        fontSize: 14, 
        color: 'white', 
        opacity: 0.9, 
        textAlign: 'center' 
    },
    yourRankCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center',
    },
    yourRankText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    yourPointsText: {
        color: 'white',
        fontSize: 14,
        opacity: 0.9,
    },
    podiumContainer: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 16,
    },
    podiumItem: {
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        minWidth: 100,
        flex: 1,
    },
    firstPlacePodium: {
        marginBottom: 0,
        borderWidth: 3,
        borderColor: '#FFD700',
    },
    secondPlacePodium: {
        marginBottom: 10,
    },
    thirdPlacePodium: {
        marginBottom: 20,
    },
    podiumAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 8,
    },
    winnerAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: '#FFD700',
    },
    podiumName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 4,
    },
    winnerName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    podiumPoints: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F59E0B',
        marginTop: 2,
    },
    winnerPoints: {
        fontSize: 16,
    },
    listHeaderContainer: {
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    listHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    userRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: 'white', 
        borderBottomWidth: 1, 
        borderBottomColor: '#F3F4F6', 
        gap: 12 
    },
    firstPlace: {
        backgroundColor: '#FFFBEB',
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    secondPlace: {
        backgroundColor: '#F8FAFC',
        borderLeftWidth: 4,
        borderLeftColor: '#C0C0C0',
    },
    thirdPlace: {
        backgroundColor: '#FEF2F2',
        borderLeftWidth: 4,
        borderLeftColor: '#CD7F32',
    },
    regularPlace: {},
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rank: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#6B7280', 
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: { 
        width: 40, 
        height: 40, 
        borderRadius: 20 
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    youBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#10B981',
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    youBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: { 
        fontSize: 16, 
        fontWeight: '600', 
        color: '#1F2937' 
    },
    userStats: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    lastActive: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 1,
    },
    pointsContainer: { 
        alignItems: 'center',
        position: 'relative',
    },
    points: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#F59E0B' 
    },
    starsContainer: {
        marginTop: 2,
    },
    rankChange: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 2,
    },
    footerContainer: { 
        padding: 16, 
        gap: 16, 
        paddingBottom: 40 
    },
    infoBox: { 
        padding: 16, 
        backgroundColor: 'white', 
        borderRadius: 12, 
        alignItems: 'center', 
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    infoTitle: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#1F2937' 
    },
    infoText: { 
        fontSize: 14, 
        color: '#4B5563', 
        textAlign: 'center' 
    },
});

export default LeaderBoardScreen;
