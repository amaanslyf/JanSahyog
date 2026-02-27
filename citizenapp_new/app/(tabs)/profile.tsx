import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Image,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useFirebase } from '../../src/hooks/useFirebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../src/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import DropDownPicker from 'react-native-dropdown-picker';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n/i18n';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

// Icons - Fixed SVG imports
const IconUser = () => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" /></Svg>;

const IconTrendingUp = () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><Polyline points="17 6 23 6 23 12" /></Svg>;

const IconBarChart = () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 20V10" /><Path d="M18 20V4" /><Path d="M6 20v-6" /></Svg>;

const IconAward = () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Circle cx="12" cy="8" r="6" /><Path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></Svg>;

const IconSettings = () => <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M12.22 2h-.44a2 2 0 0 0-2 2.18l.04.38a2 2 0 0 1-1.16 1.96l-.35.17a2 2 0 0 1-2.3-.27l-.27-.27a2 2 0 0 0-2.83 0l-.31.31a2 2 0 0 0 0 2.83l.27.27a2 2 0 0 1 .27 2.3l-.17.35a2 2 0 0 1-1.96 1.16l-.38.04A2 2 0 0 0 2 13.78v.44a2 2 0 0 0 2.18 2l.38-.04a2 2 0 0 1 1.96 1.16l.17.35a2 2 0 0 1-.27 2.3l-.27.27a2 2 0 0 0 0 2.83l.31.31a2 2 0 0 0 2.83 0l.27-.27a2 2 0 0 1 2.3-.27l.35.17a2 2 0 0 1 1.16 1.96l.04.38A2 2 0 0 0 13.78 22h.44a2 2 0 0 0 2-2.18l-.04-.38a2 2 0 0 1 1.16-1.96l.35-.17a2 2 0 0 1 2.3.27l.27.27a2 2 0 0 0 2.83 0l.31-.31a2 2 0 0 0 0-2.83l-.27-.27a2 2 0 0 1-.27-2.3l.17-.35a2 2 0 0 1 1.96-1.16l.38-.04A2 2 0 0 0 22 10.22v-.44a2 2 0 0 0-2.18-2l-.38.04a2 2 0 0 1-1.96-1.16l-.17-.35a2 2 0 0 1 .27-2.3l.27-.27a2 2 0 0 0 0-2.83l-.31-.31a2 2 0 0 0-2.83 0l-.27.27a2 2 0 0 1-2.3.27l-.35-.17a2 2 0 0 1-1.16-1.96L10.22 2A2 2 0 0 0 10.22 2z" /><Circle cx="12" cy="12" r="3" /></Svg>;

const IconLogOut = () => <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline points="16 17 21 12 16 7" /><Path d="M21 12H9" /></Svg>;

type UserStats = {
    totalIssues: number;
    resolvedIssues: number;
    inProgressIssues: number;
    openIssues: number;
    points: number;
    rank: number;
    joinDate: Date;
    lastActivity: Date;
};

const ProfileScreen = () => {
    const { auth, db } = useFirebase();
    const { user } = useAuth();
    const { t, i18n: i18nInstance } = useTranslation();

    const [userStats, setUserStats] = useState<UserStats>({
        totalIssues: 0,
        resolvedIssues: 0,
        inProgressIssues: 0,
        openIssues: 0,
        points: 0,
        rank: 0,
        joinDate: new Date(),
        lastActivity: new Date(),
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Language dropdown
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(i18nInstance.language);
    const [items, setItems] = useState([
        { label: 'English', value: 'en' },
        { label: 'हिंदी', value: 'hi' },
        { label: 'বাংলা', value: 'bn' },
        { label: 'தமிழ்', value: 'ta' },
        { label: 'తెలుగు', value: 'te' },
    ]);

    // Load user statistics - Fixed function
    const loadUserStats = React.useCallback(async () => {
        if (!user) return;

        try {
            // Get user's issues from civicIssues collection
            const userIssuesQuery = query(
                collection(db, 'civicIssues'),
                where('reportedById', '==', user.uid)
            );
            const userIssuesSnapshot = await getDocs(userIssuesQuery);

            const issues = userIssuesSnapshot.docs.map(doc => doc.data());

            const resolvedCount = issues.filter(issue => issue.status === 'Resolved').length;
            const inProgressCount = issues.filter(issue => issue.status === 'In Progress').length;
            const openCount = issues.filter(issue => issue.status === 'Open').length;

            // Get user document for points and other data
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();

            // Fixed: Proper date handling
            const creationTime = user.metadata?.creationTime;
            const joinDate = creationTime ? new Date(creationTime) : new Date();

            setUserStats({
                totalIssues: issues.length,
                resolvedIssues: resolvedCount,
                inProgressIssues: inProgressCount,
                openIssues: openCount,
                points: userData?.points || (issues.length * 10),
                rank: userData?.rank || 0, // Rank should be pre-calculated by a backend task/admin
                joinDate: userData?.createdAt?.toDate() || joinDate,
                lastActivity: userData?.lastActive?.toDate() || new Date(),
            });

        } catch (error) {
            console.error('Error loading user stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, db]);

    useEffect(() => {
        loadUserStats();
    }, [loadUserStats]);

    useEffect(() => {
        setValue(i18nInstance.language);
    }, [i18nInstance.language]);

    const onRefresh = () => {
        setRefreshing(true);
        loadUserStats();
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
            Alert.alert(t('profile.logoutFailed'), t('profile.logoutError'));
        }
    };

    const handleLanguageChange = async (item: any) => {
        if (item.value && item.value !== i18nInstance.language) {
            try {
                await i18n.changeLanguage(item.value);
                setOpen(false);
            } catch (error) {
                console.error('Error changing language:', error);
            }
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getInitials = (email: string) => {
        return email.substring(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {getInitials(user?.email || 'User')}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.rankBadge}>
                                <Text style={styles.rankText}>#{userStats.rank}</Text>
                            </View>
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                                {user?.displayName || user?.email?.split('@')[0] || 'User'}
                            </Text>
                            <Text style={styles.userEmail}>{user?.email}</Text>
                            <Text style={styles.joinDate}>
                                Member since {formatDate(userStats.joinDate)}
                            </Text>
                        </View>
                    </View>

                    {/* Points Section */}
                    <View style={styles.pointsContainer}>
                        <Text style={styles.pointsNumber}>{userStats.points}</Text>
                        <Text style={styles.pointsLabel}>Civic Points</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>Your Impact</Text>

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <IconBarChart />
                            </View>
                            <Text style={styles.statNumber}>{userStats.totalIssues}</Text>
                            <Text style={styles.statLabel}>Issues Reported</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <IconTrendingUp />
                            </View>
                            <Text style={styles.statNumber}>{userStats.resolvedIssues}</Text>
                            <Text style={styles.statLabel}>Resolved</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <IconAward />
                            </View>
                            <Text style={styles.statNumber}>#{userStats.rank}</Text>
                            <Text style={styles.statLabel}>City Rank</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressTitle}>Resolution Rate</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${userStats.totalIssues > 0 ? (userStats.resolvedIssues / userStats.totalIssues) * 100 : 0}%`
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {userStats.totalIssues > 0
                                ? `${Math.round((userStats.resolvedIssues / userStats.totalIssues) * 100)}%`
                                : '0%'
                            } of your issues resolved
                        </Text>
                    </View>
                </View>

                {/* Language Settings */}
                <View style={styles.settingsContainer}>
                    <Text style={styles.sectionTitle}>{t('profile.changeLanguage')}</Text>

                    <View style={styles.languageContainer}>
                        <DropDownPicker
                            open={open}
                            value={value}
                            items={items}
                            setOpen={setOpen}
                            setValue={setValue}
                            setItems={setItems}
                            onSelectItem={handleLanguageChange}
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownContainer}
                            placeholder={t('profile.selectLanguagePlaceholder')}
                            zIndex={1000}
                            listMode="SCROLLVIEW"
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {/* Settings Button */}
                    <TouchableOpacity style={styles.actionButton}>
                        <IconSettings />
                        <Text style={styles.actionButtonText}>Settings</Text>
                        <Text style={styles.actionButtonArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <IconLogOut />
                        <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfoContainer}>
                    <Text style={styles.appInfoText}>JanSahyog v1.0.0</Text>
                    <Text style={styles.appInfoText}>Building better communities together</Text>
                </View>
            </ScrollView>
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
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: 'white',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    rankBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#F59E0B',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 2,
        borderColor: 'white',
    },
    rankText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 4,
    },
    joinDate: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    pointsContainer: {
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        padding: 16,
        borderRadius: 12,
    },
    pointsNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    pointsLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    statsContainer: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statIconContainer: {
        marginBottom: 8,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    progressContainer: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#6B7280',
    },
    settingsContainer: {
        padding: 20,
    },
    languageContainer: {
        zIndex: 1000,
    },
    dropdown: {
        backgroundColor: 'white',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 12,
    },
    dropdownContainer: {
        backgroundColor: 'white',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 12,
    },
    actionsContainer: {
        padding: 20,
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
    },
    actionButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    actionButtonArrow: {
        fontSize: 18,
        color: '#9CA3AF',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
        gap: 12,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    appInfoContainer: {
        padding: 20,
        alignItems: 'center',
        gap: 4,
    },
    appInfoText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default ProfileScreen;
