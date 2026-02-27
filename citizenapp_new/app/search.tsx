import React, { useState, useEffect, useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { useFirebase } from '../src/hooks/useFirebase';
import { IconSearch, IconChevronLeft, IconFilter, IconX, IconClock, IconActivity, IconCheckCircle } from '../src/components/Icons';
import { typography } from '../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../src/utils/responsive';
import { useTheme } from '../src/context/ThemeContext';
import { useMemo as useMemoReact } from 'react';

const CATEGORIES = ['Road', 'Electricity', 'Water', 'Waste Management', 'Public Safety', 'Health', 'Education', 'Other'];
const STATUSES = ['Open', 'In Progress', 'Resolved'];

const SearchScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { db } = useFirebase();
    const { colors, isDark } = useTheme();
    const styles = useMemoReact(() => getStyles({ ...colors, isDark }), [colors, isDark]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchInitialIssues = async () => {
            setLoading(true);
            try {
                const issuesRef = collection(db, 'civicIssues');
                const q = query(issuesRef, orderBy('reportedAt', 'desc'), limit(20));
                const snapshot = await getDocs(q);
                const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setResults(issues);
            } catch (error) {
                console.error('Error fetching initial issues:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialIssues();
    }, [db]);

    const filteredResults = useMemo(() => {
        return results.filter(issue => {
            const matchesQuery =
                issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                issue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                issue.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = !selectedCategory || issue.category === selectedCategory;
            const matchesStatus = !selectedStatus || issue.status === selectedStatus;

            return matchesQuery && matchesCategory && matchesStatus;
        });
    }, [results, searchQuery, selectedCategory, selectedStatus]);

    const renderIssueItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.issueCard}
            onPress={() => router.push({ pathname: '/IssueDetail/[id]', params: { id: item.id } } as any)}
        >
            <View style={styles.issueHeader}>
                <Text style={styles.issueTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {t(`status.${item.status.toLowerCase().replace(' ', '')}`)}
                    </Text>
                </View>
            </View>
            <Text style={styles.issueDescription} numberOfLines={2}>{item.description}</Text>
            <View style={styles.issueFooter}>
                <Text style={styles.categoryLabel}>{t(`categories.${item.category.toLowerCase().replace(' ', '')}`)}</Text>
                <Text style={styles.dateText}>
                    {item.reportedAt?.toDate().toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Resolved': return { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' };
            case 'In Progress': return { backgroundColor: isDark ? '#422006' : '#FEF9C3' };
            default: return { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Resolved': return colors.success;
            case 'In Progress': return colors.warning;
            default: return colors.error;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Sticky Header with Search */}
            <View style={styles.header}>
                <View style={styles.searchRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <IconChevronLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View style={styles.searchContainer}>
                        <IconSearch size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('home.searchPlaceholder')}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <IconX size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <IconFilter size={20} color={showFilters ? '#FFFFFF' : '#4B5563'} />
                    </TouchableOpacity>
                </View>

                {/* Filters Panel */}
                {showFilters && (
                    <View style={styles.filtersPanel}>
                        <Text style={styles.filterTitle}>{t('notifications.filters')}</Text>

                        <Text style={styles.filterLabel}>{t('notifications.allCategories')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            <TouchableOpacity
                                style={[styles.chip, !selectedCategory && styles.chipActive]}
                                onPress={() => setSelectedCategory(null)}
                            >
                                <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>{t('common.all')}</Text>
                            </TouchableOpacity>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                                        {t(`categories.${cat.toLowerCase().replace(' ', '')}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.filterLabel}>{t('notifications.allStatuses')}</Text>
                        <View style={styles.chipRow}>
                            <TouchableOpacity
                                style={[styles.chip, !selectedStatus && styles.chipActive]}
                                onPress={() => setSelectedStatus(null)}
                            >
                                <Text style={[styles.chipText, !selectedStatus && styles.chipTextActive]}>{t('common.all')}</Text>
                            </TouchableOpacity>
                            {STATUSES.map(status => (
                                <TouchableOpacity
                                    key={status}
                                    style={[styles.chip, selectedStatus === status && styles.chipActive]}
                                    onPress={() => setSelectedStatus(status)}
                                >
                                    <Text style={[styles.chipText, selectedStatus === status && styles.chipTextActive]}>
                                        {t(`status.${status.toLowerCase().replace(' ', '')}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredResults}
                    renderItem={renderIssueItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <IconSearch size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>{t('notifications.noResults')}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.surface,
        paddingVertical: verticalScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        gap: scale(12),
    },
    backButton: {
        padding: scale(4),
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.isDark ? '#1E293B' : '#F3F4F6',
        borderRadius: scale(12),
        paddingHorizontal: scale(12),
        height: verticalScale(44),
    },
    searchInput: {
        flex: 1,
        marginLeft: scale(8),
        fontSize: moderateScale(16),
        ...typography.body,
        color: colors.textPrimary,
    },
    filterButton: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(12),
        backgroundColor: colors.isDark ? '#1E293B' : '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
    },
    filtersPanel: {
        paddingTop: verticalScale(16),
        paddingHorizontal: scale(16),
    },
    filterTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: verticalScale(12),
    },
    filterLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: verticalScale(8),
        marginBottom: verticalScale(8),
    },
    chipScroll: {
        flexGrow: 0,
        marginBottom: verticalScale(8),
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
        marginBottom: verticalScale(8),
    },
    chip: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: scale(20),
        backgroundColor: colors.isDark ? '#1E293B' : '#F3F4F6',
        marginRight: scale(8),
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: moderateScale(13),
        color: colors.textSecondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        padding: scale(16),
        paddingBottom: verticalScale(40),
    },
    issueCard: {
        backgroundColor: colors.surface,
        borderRadius: scale(16),
        padding: scale(16),
        marginBottom: verticalScale(12),
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(8),
    },
    issueTitle: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: colors.textPrimary,
        flex: 1,
        marginRight: scale(8),
    },
    statusBadge: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: scale(6),
    },
    statusText: {
        fontSize: moderateScale(11),
        fontWeight: '700',
    },
    issueDescription: {
        fontSize: moderateScale(14),
        color: colors.textSecondary,
        marginBottom: verticalScale(12),
        lineHeight: moderateScale(20),
    },
    issueFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryLabel: {
        fontSize: moderateScale(12),
        color: colors.primary,
        fontWeight: '600',
        backgroundColor: colors.isDark ? '#1E293B' : '#EFF6FF',
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(2),
        borderRadius: scale(4),
    },
    dateText: {
        fontSize: moderateScale(12),
        color: colors.textMuted,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(100),
    },
    emptyText: {
        fontSize: moderateScale(16),
        color: colors.textMuted,
        marginTop: verticalScale(16),
    },
});

export default SearchScreen;
