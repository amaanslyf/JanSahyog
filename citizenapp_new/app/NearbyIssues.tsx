import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
// FIXED: Correct i18n import
import { useTranslation } from 'react-i18next';

// UPDATED: Match admin portal data structure
type Complaint = {
    id: string;
    title: string;
    category: string;
    description: string;
    coordinates?: number[]; // CHANGED: coordinates array instead of location object
    location?: {
        latitude: number;
        longitude: number;
    };
    address?: string;
    status: string;
    priority: string;
    assignedDepartment?: string;
    reportedAt: Timestamp; // CHANGED: reportedAt instead of submittedAt
};

type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

const NearbyIssuesScreen = () => {
    // FIXED: Use correct react-i18next hook
    const { t } = useTranslation();
    const [userRegion, setUserRegion] = useState<Region | undefined>(undefined);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const setupMap = async () => {
            try {
                // 1. Get location permissions from the user
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg(t('report.locationPermissionDenied'));
                    setIsLoading(false);
                    return;
                }

                // 2. Get the user's current location
                let location = await Location.getCurrentPositionAsync({});
                const region = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                };
                setUserRegion(region);

                // 3. CHANGED: Fetch from civicIssues collection (same as admin portal)
                const db = getFirestore();
                const querySnapshot = await getDocs(
                    query(
                        collection(db, "civicIssues"), // CHANGED: civicIssues instead of complaints
                        where("publicVisible", "==", true) // Only show public issues
                    )
                );
                const complaintsData: Complaint[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    complaintsData.push({ 
                        id: doc.id, 
                        ...data,
                        reportedAt: data.reportedAt || Timestamp.now(),
                    } as Complaint);
                });

                // UPDATED: Handle both coordinate formats
                const complaintsWithLocation = complaintsData.filter(c => {
                    // Check for new coordinates format [lat, lng]
                    if (c.coordinates && Array.isArray(c.coordinates) && c.coordinates.length === 2) {
                        return true;
                    }
                    // Check for old location format {latitude, longitude}
                    if (c.location && c.location.latitude && c.location.longitude) {
                        return true;
                    }
                    return false;
                });

                setComplaints(complaintsWithLocation);

            } catch (error) {
                console.error("Failed to setup map:", error);
                setErrorMsg(t('nearbyIssues.errorLoading'));
            } finally {
                setIsLoading(false);
            }
        };

        setupMap();
    }, [t]);

    // Show a loading indicator while we get location and data
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>{t('nearbyIssues.loading')}</Text>
            </View>
        );
    }

    // Show an error message if something went wrong
    if (errorMsg) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ title: t('nearbyIssues.errorTitle'), headerShown: true }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
        );
    }

    // Helper function to get coordinates
    const getCoordinates = (complaint: Complaint) => {
        if (complaint.coordinates && Array.isArray(complaint.coordinates) && complaint.coordinates.length === 2) {
            return {
                latitude: complaint.coordinates[0],
                longitude: complaint.coordinates[1],
            };
        }
        if (complaint.location) {
            return {
                latitude: complaint.location.latitude,
                longitude: complaint.location.longitude,
            };
        }
        return null;
    };

    // Helper function to get marker color based on status
    const getMarkerColor = (status: string) => {
        switch (status) {
            case 'Open': return '#EF4444'; // Red
            case 'In Progress': return '#F59E0B'; // Orange
            case 'Resolved': return '#10B981'; // Green
            default: return '#6B7280'; // Gray
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('home.quickActions.nearby'), headerShown: true }} />
            <StatusBar barStyle="dark-content" />

            <MapView
                style={styles.map}
                initialRegion={userRegion}
                showsUserLocation={true}
            >
                {complaints.map((complaint) => {
                    const coordinates = getCoordinates(complaint);
                    if (!coordinates) return null;

                    return (
                        <Marker
                            key={complaint.id}
                            coordinate={coordinates}
                            title={complaint.title || complaint.category}
                            description={`${complaint.description}\n\nStatus: ${complaint.status}\nDepartment: ${complaint.assignedDepartment || 'Not assigned'}`}
                            pinColor={getMarkerColor(complaint.status)}
                        />
                    );
                })}
            </MapView>

            {/* Issue count overlay */}
            <View style={styles.issueCountOverlay}>
                <Text style={styles.issueCountText}>
                    {complaints.length} issues in your area
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6B7280',
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    issueCountOverlay: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    issueCountText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
});

export default NearbyIssuesScreen;
