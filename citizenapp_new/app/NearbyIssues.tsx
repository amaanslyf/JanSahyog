import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    ScrollView,
    Image,
    Modal,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFirebase } from '../src/hooks/useFirebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Polyline,Line } from 'react-native-svg';

// Icons
const IconMapPin = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle cx="12" cy="10" r="3" />
    </Svg>
);

const IconRefresh = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="23 4 23 10 17 10" />
        <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </Svg>
);

const IconFilter = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </Svg>
);

const IconX = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Line x1="18" y1="6" x2="6" y2="18" />
        <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
);

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
                    'Location Permission Required',
                    'Please enable location services to view nearby issues.'
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
            Alert.alert('Error', 'Failed to get your current location.');
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
            Alert.alert('Error', 'Failed to load nearby issues.');
        } finally {
            setLoading(false);
        }
    };

    const getMarkerColor = (issue: NearbyIssue) => {
        switch (issue.status) {
            case 'Open':
                return '#EF4444'; // Red
            case 'In Progress':
                return '#F59E0B'; // Yellow
            case 'Resolved':
                return '#10B981'; // Green
            default:
                return '#6B7280'; // Gray
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
            return 'Unknown date';
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
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nearby Issues</Text>
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
                    <Text style={styles.loadingText}>Loading nearby issues...</Text>
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
                    {issues.length} issues within {filters.radius}km
                </Text>
                <Text style={styles.statsSubtext}>
                    Tap markers for details
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
                                                {selectedIssue.status}
                                            </Text>
                                        </View>
                                        <Text style={styles.modalCategory}>{selectedIssue.category}</Text>
                                        <Text style={styles.modalPriority}>
                                            Priority: {selectedIssue.priority}
                                        </Text>
                                    </View>

                                    {/* Description */}
                                    <Text style={styles.modalDescription}>{selectedIssue.description}</Text>

                                    {/* Details */}
                                    <View style={styles.modalDetails}>
                                        <Text style={styles.modalDetailItem}>
                                            📍 Distance: {selectedIssue.distance?.toFixed(1)}km away
                                        </Text>
                                        <Text style={styles.modalDetailItem}>
                                            📅 Reported: {formatDate(selectedIssue.reportedAt)}
                                        </Text>
                                        <Text style={styles.modalDetailItem}>
                                            📧 Reporter: {selectedIssue.reportedBy || 'Anonymous'}
                                        </Text>
                                        {selectedIssue.assignedDepartment && (
                                            <Text style={styles.modalDetailItem}>
                                                🏢 Department: {selectedIssue.assignedDepartment}
                                            </Text>
                                        )}
                                        <Text style={styles.modalDetailItem}>
                                            📍 Address: {selectedIssue.location.address}
                                        </Text>
                                    </View>
                                </ScrollView>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => {
                                            // Open in maps
                                            const url = `https://maps.google.com/?q=${selectedIssue.location.latitude},${selectedIssue.location.longitude}`;
                                            // You can use Linking.openURL(url) here
                                            Alert.alert('Navigation', 'Would open in Google Maps');
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Get Directions</Text>
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
                            <Text style={styles.modalTitle}>Filter Issues</Text>
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
                                <Text style={styles.filterSectionTitle}>Search Radius</Text>
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
                                <Text style={styles.clearFiltersText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyFiltersButton}
                                onPress={() => setFilterModalVisible(false)}
                            >
                                <Text style={styles.applyFiltersText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 16,
    },
    backButton: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 8,
        borderRadius: 8,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    map: {
        flex: 1,
    },
    statsBar: {
        backgroundColor: 'white',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        alignItems: 'center',
    },
    statsText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statsSubtext: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    filterModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    modalImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    modalStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
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
    modalCategory: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    modalPriority: {
        fontSize: 14,
        color: '#6B7280',
    },
    modalDescription: {
        fontSize: 16,
        color: '#1F2937',
        lineHeight: 22,
        marginBottom: 20,
    },
    modalDetails: {
        gap: 8,
    },
    modalDetailItem: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    modalActions: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    modalButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Filter Modal Styles
    filterBody: {
        padding: 20,
    },
    filterSection: {
        marginBottom: 24,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    radiusButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    radiusButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        alignItems: 'center',
    },
    radiusButtonActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    radiusButtonText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    radiusButtonTextActive: {
        color: 'white',
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterOption: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
    },
    filterOptionActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB',
    },
    filterOptionText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    filterOptionTextActive: {
        color: '#2563EB',
    },
    filterActions: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    clearFiltersButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        alignItems: 'center',
    },
    clearFiltersText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    applyFiltersButton: {
        flex: 2,
        paddingVertical: 12,
        backgroundColor: '#2563EB',
        borderRadius: 8,
        alignItems: 'center',
    },
    applyFiltersText: {
        fontSize: 16,
        color: 'white',
        fontWeight: 'bold',
    },
});

export default NearbyIssuesScreen;
