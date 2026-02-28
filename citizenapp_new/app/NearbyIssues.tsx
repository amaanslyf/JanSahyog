import React, { useState, useEffect, useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
    Modal,
    Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFirebase } from '../src/hooks/useFirebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { IconMapPin, IconRefresh, IconFilter, IconX } from '../src/components/Icons';
import { useTheme } from '../src/context/ThemeContext';
import { typography } from '../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../src/utils/responsive';

type NearbyIssue = {
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
    location: {
        latitude: number;
        longitude: number;
        address: string;
    };
    reportedBy?: string;
    distance?: number;
};

type FilterOptions = {
    status: string[];
    categories: string[];
    priority: string[];
    radius: number; // in km
};

const NearbyIssuesScreen = () => {
    const { db } = useFirebase();
    const { user } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [issues, setIssues] = useState<NearbyIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<NearbyIssue | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [mapRegion, setMapRegion] = useState<Region | null>(null);

    const [filters, setFilters] = useState<FilterOptions>({
        status: ['Open', 'In Progress'],
        categories: [],
        priority: [],
        radius: 5 // Default 5km radius
    });

    const categories = ['Garbage', 'Water Leak', 'Roads', 'Streetlight', 'Pollution', 'Other'];
    const statuses = ['Open', 'In Progress', 'Resolved'];
    const priorities = ['Low', 'Medium', 'High', 'Critical'];

    useEffect(() => {
        getCurrentLocation();
    }, []);

    useEffect(() => {
        if (userLocation) {
            loadNearbyIssues();
        }
    }, [userLocation, filters]);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('nearbyIssues.locationPermissionRequired'),
                    t('nearbyIssues.locationPermissionMessage')
                );
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setUserLocation(location);
            setMapRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            });
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert(t('nearbyIssues.errorTitle'), t('nearbyIssues.locationError'));
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const loadNearbyIssues = async () => {
        if (!userLocation) return;

        setLoading(true);
        try {
            const issuesRef = collection(db, 'civicIssues');

            // Basic query - we'll filter by location client-side
            const issuesQuery = query(
                issuesRef,
                where('publicVisible', '==', true)
            );

            const snapshot = await getDocs(issuesQuery);
            const allIssues: NearbyIssue[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.location && data.location.latitude && data.location.longitude) {
                    const distance = calculateDistance(
                        userLocation.coords.latitude,
                        userLocation.coords.longitude,
                        data.location.latitude,
                        data.location.longitude
                    );

                    // Filter by radius
                    if (distance <= filters.radius) {
                        allIssues.push({
                            id: doc.id,
                            ...data,
                            distance: distance,
                            reportedAt: data.reportedAt || Timestamp.now(),
                            lastUpdated: data.lastUpdated || data.reportedAt || Timestamp.now(),
                        } as NearbyIssue);
                    }
                }
            });

            // Apply additional filters
            let filteredIssues = allIssues;

            if (filters.status.length > 0) {
                filteredIssues = filteredIssues.filter(issue =>
                    filters.status.includes(issue.status)
                );
            }

            if (filters.categories.length > 0) {
                filteredIssues = filteredIssues.filter(issue =>
                    filters.categories.includes(issue.category)
                );
            }

            if (filters.priority.length > 0) {
                filteredIssues = filteredIssues.filter(issue =>
                    filters.priority.includes(issue.priority)
                );
            }

            // Sort by distance
            filteredIssues.sort((a, b) => (a.distance || 0) - (b.distance || 0));

            setIssues(filteredIssues);
        } catch (error) {
            console.error('Error loading nearby issues:', error);
            Alert.alert(t('nearbyIssues.errorTitle'), t('nearbyIssues.errorLoading'));
        } finally {
            setLoading(false);
        }
    };

    const getMarkerColor = (issue: NearbyIssue) => {
        switch (issue.status) {
            case 'Open':
                return colors.error;
            case 'In Progress':
                return colors.warning;
            case 'Resolved':
                return colors.success;
            default:
                return colors.textMuted;
        }
    };

    const formatDate = (timestamp: Timestamp) => {
        try {
            return timestamp.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return t('myComplaints.unknownDate');
        }
    };

    const handleMarkerPress = (issue: NearbyIssue) => {
        setSelectedIssue(issue);
        setModalVisible(true);
    };

    const toggleFilter = (filterType: keyof FilterOptions, value: string) => {
        setFilters(prev => {
            const currentArray = prev[filterType] as string[];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];

            return {
                ...prev,
                [filterType]: newArray
            };
        });
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>{t('nearbyIssues.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('nearbyIssues.title')}</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <IconFilter />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => {
                            getCurrentLocation();
                            loadNearbyIssues();
                        }}
                    >
                        <IconRefresh />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Map View */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>{t('nearbyIssues.loading')}</Text>
                </View>
            )}

            {mapRegion && (
                <MapView
                    style={styles.map}
                    region={mapRegion}
                    onRegionChangeComplete={setMapRegion}
                    showsUserLocation
                    showsMyLocationButton
                >
                    {issues.map((issue) => (
                        <Marker
                            key={issue.id}
                            coordinate={{
                                latitude: issue.location.latitude,
                                longitude: issue.location.longitude,
                            }}
                            onPress={() => handleMarkerPress(issue)}
                            pinColor={getMarkerColor(issue)}
                        />
                    ))}
                </MapView>
            )}

            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <Text style={styles.statsText}>
                    {t('nearbyIssues.stats', { count: issues.length, radius: filters.radius })}
                </Text>
                <Text style={styles.statsSubtext}>
                    {t('nearbyIssues.tapMarkers')}
                </Text>
            </View>

            {/* Issue Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedIssue && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{selectedIssue.title}</Text>
                                    <TouchableOpacity
                                        onPress={() => setModalVisible(false)}
                                        style={styles.modalCloseButton}
                                    >
                                        <IconX />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalBody}>
                                    {/* Issue Image */}
                                    {(selectedIssue.imageBase64 || selectedIssue.imageUri) && (
                                        <Image
                                            source={{
                                                uri: selectedIssue.imageBase64 ?
                                                    `data:image/jpeg;base64,${selectedIssue.imageBase64}` :
                                                    selectedIssue.imageUri
                                            }}
                                            style={styles.modalImage}
                                        />
                                    )}

                                    {/* Status Badge */}
                                    <View style={styles.modalStatusContainer}>
                                        <View style={[styles.statusBadge, getStatusStyle(selectedIssue.status).container]}>
                                            <Text style={[styles.statusText, getStatusStyle(selectedIssue.status).text]}>
                                                {t(`status.${selectedIssue.status.toLowerCase().replace(' ', '')}`)}
                                            </Text>
                                        </View>
                                        <Text style={styles.modalCategory}>{t(`categories.${selectedIssue.category.toLowerCase().replace(' ', '')}`)}</Text>
                                        <Text style={styles.modalPriority}>
                                            {t('nearbyIssues.priorityLabel', { priority: t(`priorities.${selectedIssue.priority.toLowerCase()}`) })}
                                        </Text>
                                    </View>

                                    {/* Description */}
                                    <Text style={styles.modalDescription}>{selectedIssue.description}</Text>

                                    {/* Details */}
                                    <View style={styles.modalDetails}>
                                        <Text style={styles.modalDetailItem}>
                                            {t('nearbyIssues.distanceLabel', { distance: selectedIssue.distance?.toFixed(1) })}
                                        </Text>
                                        <Text style={styles.modalDetailItem}>
                                            {t('nearbyIssues.reportedLabel', { date: formatDate(selectedIssue.reportedAt) })}
                                        </Text>
                                        <Text style={styles.modalDetailItem}>
                                            {t('nearbyIssues.reporterLabel', { name: selectedIssue.reportedBy || t('nearbyIssues.anonymous') })}
                                        </Text>
                                        {selectedIssue.assignedDepartment && (
                                            <Text style={styles.modalDetailItem}>
                                                {t('nearbyIssues.departmentLabel', { name: selectedIssue.assignedDepartment })}
                                            </Text>
                                        )}
                                        <Text style={styles.modalDetailItem}>
                                            {t('nearbyIssues.addressLabel', { address: selectedIssue.location.address })}
                                        </Text>
                                    </View>
                                </ScrollView>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={async () => {
                                            const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedIssue.location.latitude},${selectedIssue.location.longitude}`;
                                            const canOpen = await Linking.canOpenURL(url);
                                            if (canOpen) {
                                                Linking.openURL(url);
                                            } else {
                                                Alert.alert(t('nearbyIssues.errorTitle'), t('issueDetail.navigationError'));
                                            }
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>{t('issueDetail.getDirections')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={filterModalVisible}
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.filterModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('nearbyIssues.filterTitle')}</Text>
                            <TouchableOpacity
                                onPress={() => setFilterModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <IconX />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.filterBody}>
                            {/* Radius Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>{t('nearbyIssues.radiusLabel')}</Text>
                                <View style={styles.radiusButtons}>
                                    {[1, 2, 5, 10].map(radius => (
                                        <TouchableOpacity
                                            key={radius}
                                            style={[
                                                styles.radiusButton,
                                                filters.radius === radius && styles.radiusButtonActive
                                            ]}
                                            onPress={() => setFilters(prev => ({ ...prev, radius }))}
                                        >
                                            <Text style={[
                                                styles.radiusButtonText,
                                                filters.radius === radius && styles.radiusButtonTextActive
                                            ]}>
                                                {radius}km
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Status Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Status</Text>
                                <View style={styles.filterOptions}>
                                    {statuses.map(status => (
                                        <TouchableOpacity
                                            key={status}
                                            style={[
                                                styles.filterOption,
                                                filters.status.includes(status) && styles.filterOptionActive
                                            ]}
                                            onPress={() => toggleFilter('status', status)}
                                        >
                                            <Text style={[
                                                styles.filterOptionText,
                                                filters.status.includes(status) && styles.filterOptionTextActive
                                            ]}>
                                                {status}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Category Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Categories</Text>
                                <View style={styles.filterOptions}>
                                    {categories.map(category => (
                                        <TouchableOpacity
                                            key={category}
                                            style={[
                                                styles.filterOption,
                                                filters.categories.includes(category) && styles.filterOptionActive
                                            ]}
                                            onPress={() => toggleFilter('categories', category)}
                                        >
                                            <Text style={[
                                                styles.filterOptionText,
                                                filters.categories.includes(category) && styles.filterOptionTextActive
                                            ]}>
                                                {category}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Priority Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Priority</Text>
                                <View style={styles.filterOptions}>
                                    {priorities.map(priority => (
                                        <TouchableOpacity
                                            key={priority}
                                            style={[
                                                styles.filterOption,
                                                filters.priority.includes(priority) && styles.filterOptionActive
                                            ]}
                                            onPress={() => toggleFilter('priority', priority)}
                                        >
                                            <Text style={[
                                                styles.filterOptionText,
                                                filters.priority.includes(priority) && styles.filterOptionTextActive
                                            ]}>
                                                {priority}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.filterActions}>
                            <TouchableOpacity
                                style={styles.clearFiltersButton}
                                onPress={() => {
                                    setFilters({
                                        status: ['Open', 'In Progress'],
                                        categories: [],
                                        priority: [],
                                        radius: 5
                                    });
                                }}
                            >
                                <Text style={styles.clearFiltersText}>{t('nearbyIssues.clearAll')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyFiltersButton}
                                onPress={() => setFilterModalVisible(false)}
                            >
                                <Text style={styles.applyFiltersText}>{t('nearbyIssues.applyFilters')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(12),
    },
    backButton: {
        color: colors.white,
        fontSize: moderateScale(16),
        fontWeight: '500',
    },
    headerTitle: {
        ...typography.h3,
        fontSize: moderateScale(18),
        color: colors.white,
    },
    headerActions: {
        flexDirection: 'row',
        gap: moderateScale(8),
    },
    headerButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: moderateScale(8),
        borderRadius: moderateScale(8),
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        gap: moderateScale(12),
    },
    loadingText: {
        ...typography.body,
        fontSize: moderateScale(16),
        color: colors.textSecondary,
    },
    map: {
        flex: 1,
    },
    statsBar: {
        backgroundColor: colors.surface,
        padding: moderateScale(12),
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    statsText: {
        ...typography.body,
        fontSize: moderateScale(15),
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    statsSubtext: {
        ...typography.caption,
        fontSize: moderateScale(12),
        marginTop: moderateScale(2),
        color: colors.textMuted,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
        maxHeight: '80%',
    },
    filterModalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: moderateScale(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        ...typography.h3,
        fontSize: moderateScale(18),
        color: colors.textPrimary,
    },
    modalCloseButton: {
        padding: moderateScale(4),
    },
    modalBody: {
        padding: moderateScale(20),
    },
    modalImage: {
        width: '100%',
        height: moderateScale(200),
        borderRadius: moderateScale(12),
        marginBottom: moderateScale(16),
    },
    modalStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(12),
        marginBottom: moderateScale(16),
    },
    statusBadge: {
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: moderateScale(12),
    },
    statusText: {
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    statusOpen: {
        backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
    },
    statusOpenText: {
        color: colors.error,
    },
    statusProgress: {
        backgroundColor: isDark ? '#422006' : '#FEF3C7',
    },
    statusProgressText: {
        color: colors.warning,
    },
    statusResolved: {
        backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
    },
    statusResolvedText: {
        color: colors.success,
    },
    modalCategory: {
        ...typography.caption,
        fontSize: moderateScale(13),
        fontWeight: '500',
        color: colors.textSecondary,
    },
    modalPriority: {
        ...typography.caption,
        fontSize: moderateScale(13),
        color: colors.textMuted,
    },
    modalDescription: {
        ...typography.body,
        fontSize: moderateScale(15),
        lineHeight: moderateScale(22),
        marginBottom: moderateScale(20),
        color: colors.textPrimary,
    },
    modalDetails: {
        gap: moderateScale(8),
    },
    modalDetailItem: {
        ...typography.caption,
        fontSize: moderateScale(13),
        lineHeight: moderateScale(20),
        color: colors.textSecondary,
    },
    modalActions: {
        padding: moderateScale(20),
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    modalButton: {
        backgroundColor: colors.primary,
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(8),
        alignItems: 'center',
    },
    modalButtonText: {
        ...typography.button,
        fontSize: moderateScale(16),
        color: colors.white,
    },
    filterBody: {
        padding: moderateScale(20),
    },
    filterSection: {
        marginBottom: moderateScale(24),
    },
    filterSectionTitle: {
        ...typography.body,
        fontSize: moderateScale(16),
        fontWeight: 'bold',
        marginBottom: moderateScale(12),
        color: colors.textPrimary,
    },
    radiusButtons: {
        flexDirection: 'row',
        gap: moderateScale(8),
    },
    radiusButton: {
        flex: 1,
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: moderateScale(8),
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    radiusButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    radiusButtonText: {
        ...typography.caption,
        fontSize: moderateScale(13),
        fontWeight: '500',
        color: colors.textSecondary,
    },
    radiusButtonTextActive: {
        color: colors.white,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
    },
    filterOption: {
        paddingVertical: moderateScale(6),
        paddingHorizontal: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: moderateScale(16),
        backgroundColor: colors.surface,
    },
    filterOptionActive: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
        borderColor: colors.primary,
    },
    filterOptionText: {
        fontSize: moderateScale(12),
        color: colors.textSecondary,
    },
    filterOptionTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    filterActions: {
        flexDirection: 'row',
        padding: moderateScale(20),
        gap: moderateScale(12),
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    clearFiltersButton: {
        flex: 1,
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(8),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    clearFiltersText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    applyFiltersButton: {
        flex: 2,
        backgroundColor: colors.primary,
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(8),
        alignItems: 'center',
    },
    applyFiltersText: {
        color: colors.white,
        fontWeight: '600',
    },
});

export default NearbyIssuesScreen;
