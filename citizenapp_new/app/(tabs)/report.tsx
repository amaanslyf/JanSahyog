import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';

// Icons
const IconCamera = () => (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <Circle cx="12" cy="13" r="3" />
    </Svg>
);

const IconMapPin = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle cx="12" cy="10" r="3" />
    </Svg>
);

const IconImage = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <Circle cx="9" cy="9" r="2" />
        <Polyline points="21 15 16 10 5 21" />
    </Svg>
);

const IconSend = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Line x1="22" y1="2" x2="11" y2="13" />
        <Polyline points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
);

const IconAlertTriangle = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <Line x1="12" y1="9" x2="12" y2="13" />
        <Line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
);

const IconChevronDown = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="6 9 12 15 18 9" />
    </Svg>
);

type LocationData = {
    latitude: number;
    longitude: number;
    address: string;
};

const ReportScreen = () => {
    const { db } = useFirebase(); // Removed storage
    const { user } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [image, setImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    const categories = [
        { label: 'Select Category', value: '' },
        { label: 'Garbage Collection', value: 'Garbage' },
        { label: 'Water Leak', value: 'Water Leak' },
        { label: 'Road Issues', value: 'Roads' },
        { label: 'Street Light', value: 'Streetlight' },
        { label: 'Pollution', value: 'Pollution' },
        { label: 'Other', value: 'Other' },
    ];

    const priorities = [
        { label: 'Low Priority', value: 'Low' },
        { label: 'Medium Priority', value: 'Medium' },
        { label: 'High Priority', value: 'High' },
        { label: 'Critical/Emergency', value: 'Critical' },
    ];

    // Request permissions on mount
    useEffect(() => {
        requestPermissions();
        getCurrentLocation();
    }, []);

    const requestPermissions = async () => {
        try {
            // Camera permissions
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (cameraStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
                Alert.alert(
                    'Permissions Required',
                    'Camera and media library permissions are needed to report issues with photos.'
                );
            }

            // Location permissions
            const locationStatus = await Location.requestForegroundPermissionsAsync();
            if (locationStatus.status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Location permission is needed to tag your complaint with location data.'
                );
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
        }
    };

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const currentLocation = await Location.getCurrentPositionAsync({});
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
            });

            const address = reverseGeocode[0] ? 
                `${reverseGeocode[0].name}, ${reverseGeocode[0].city}, ${reverseGeocode[0].region}` 
                : 'Location detected';

            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                address: address,
            });
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const pickImage = async () => {
        Alert.alert(
            'Select Image *',
            'Choose an option to add a photo of the issue (Required)',
            [
                { text: 'Camera', onPress: () => openCamera() },
                { text: 'Gallery', onPress: () => openGallery() },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const processImage = async (imageUri: string) => {
        setImageLoading(true);
        try {
            console.log('🖼️ Processing image:', imageUri);

            // Compress and resize image to stay within Firestore limits
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [
                    { resize: { width: 800 } }, // Resize to max 800px width
                ],
                {
                    compress: 0.7, // Compress to 70% quality
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true, // Get base64 directly
                }
            );

            if (manipulatedImage.base64) {
                console.log('✅ Image processed successfully');
                console.log('📦 Base64 size:', Math.round(manipulatedImage.base64.length / 1024), 'KB');
                
                // Check if image size is within limits (Firestore doc limit is 1MB)
                const sizeInKB = manipulatedImage.base64.length / 1024;
                if (sizeInKB > 800) { // Keep under 800KB to be safe
                    Alert.alert(
                        'Image Too Large',
                        'Please choose a smaller image or use the camera to take a new photo.'
                    );
                    return;
                }

                setImage(manipulatedImage.uri);
                setImageBase64(manipulatedImage.base64);
            }
        } catch (error) {
            console.error('❌ Error processing image:', error);
            Alert.alert('Error', 'Failed to process image. Please try again.');
        } finally {
            setImageLoading(false);
        }
    };

    const openCamera = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9] as [number, number],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                await processImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error opening camera:', error);
            Alert.alert('Error', 'Failed to open camera');
        }
    };

    const openGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9] as [number, number],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                await processImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error opening gallery:', error);
            Alert.alert('Error', 'Failed to open gallery');
        }
    };

    const submitComplaint = async () => {
        // Enhanced Validation
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title for your complaint');
            return;
        }
        
        if (!description.trim()) {
            Alert.alert('Error', 'Please provide a description of the issue');
            return;
        }
        
        if (!category) {
            Alert.alert('Error', 'Please select a category');
            return;
        }

        // MANDATORY IMAGE VALIDATION
        if (!image || !imageBase64) {
            Alert.alert('Image Required', 'Please add a photo of the issue to submit your complaint.');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'Please login to submit complaints');
            return;
        }

        setLoading(true);

        try {
            console.log('💾 Saving complaint to Firestore...');

            // Create complaint data with base64 image stored in Firestore
            const complaintData = {
                title: title.trim(),
                description: description.trim(),
                category: category,
                priority: priority,
                status: 'Open',
                // Store image as base64 string directly in Firestore
                imageBase64: imageBase64,
                imageUri: `data:image/jpeg;base64,${imageBase64}`, // Create data URI for display
                hasImage: true,
                reportedById: user.uid,
                reportedBy: user.email,
                reportedAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                location: location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address,
                } : null,
                publicVisible: true,
                assignedDepartment: '',
                adminNotes: '',
                updatedBy: 'Citizen App',
                source: 'mobile_app',
                // Additional metadata
                imageSize: Math.round(imageBase64.length / 1024), // Size in KB
                submissionMethod: 'mobile_with_image',
            };

            await addDoc(collection(db, 'civicIssues'), complaintData);
            console.log('✅ Complaint saved successfully');

            Alert.alert(
                'Success! 🎉',
                'Your complaint with photo has been submitted successfully. You will receive updates on its progress.',
                [
                    { 
                        text: 'View My Reports', 
                        onPress: () => router.push('/mycomplaint') 
                    },
                    { 
                        text: 'Report Another', 
                        onPress: () => resetForm() 
                    },
                ]
            );

        } catch (error) {
            console.error('❌ Error submitting complaint:', error);
            Alert.alert(
                'Submission Failed',
                `Please try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setCategory('');
        setPriority('Medium');
        setImage(null);
        setImageBase64(null);
        getCurrentLocation();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <KeyboardAwareScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                enableAutomaticScroll={Platform.OS === 'ios'}
                extraScrollHeight={20}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Report an Issue</Text>
                    <Text style={styles.headerSubtitle}>
                        Help improve your community by reporting civic issues
                    </Text>
                </View>

                <View style={styles.form}>
                    {/* Title Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Issue Title *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Brief title describing the issue"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />
                    </View>

                    {/* Category Picker */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category *</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={category}
                                onValueChange={(itemValue) => setCategory(itemValue)}
                                style={styles.picker}
                            >
                                {categories.map((cat) => (
                                    <Picker.Item 
                                        key={cat.value} 
                                        label={cat.label} 
                                        value={cat.value} 
                                    />
                                ))}
                            </Picker>
                            <View style={styles.pickerIcon}>
                                <IconChevronDown />
                            </View>
                        </View>
                    </View>

                    {/* Priority Picker */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Priority Level</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={priority}
                                onValueChange={(itemValue) => setPriority(itemValue)}
                                style={styles.picker}
                            >
                                {priorities.map((pri) => (
                                    <Picker.Item 
                                        key={pri.value} 
                                        label={pri.label} 
                                        value={pri.value} 
                                    />
                                ))}
                            </Picker>
                            <View style={styles.pickerIcon}>
                                <IconChevronDown />
                            </View>
                        </View>
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Provide detailed description of the issue..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                        />
                        <Text style={styles.characterCount}>
                            {description.length}/500 characters
                        </Text>
                    </View>

                    {/* Image Section - MANDATORY */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Add Photo * 
                            <Text style={styles.requiredText}> (Required)</Text>
                        </Text>
                        <TouchableOpacity 
                            style={[
                                styles.imageButton, 
                                !image && styles.imageButtonRequired
                            ]} 
                            onPress={pickImage}
                            disabled={imageLoading}
                        >
                            {imageLoading ? (
                                <ActivityIndicator color="#6B7280" />
                            ) : (
                                <>
                                    <IconImage />
                                    <Text style={styles.imageButtonText}>
                                        {image ? 'Change Photo' : 'Add Photo (Required)'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        
                        {image && (
                            <View style={styles.imagePreview}>
                                <Image source={{ uri: image }} style={styles.previewImage} />
                                <TouchableOpacity 
                                    style={styles.removeImageButton}
                                    onPress={() => {
                                        setImage(null);
                                        setImageBase64(null);
                                    }}
                                >
                                    <Text style={styles.removeImageText}>Remove</Text>
                                </TouchableOpacity>
                                <View style={styles.imageStatusBadge}>
                                    <Text style={styles.imageStatusText}>✓ Image Ready</Text>
                                </View>
                            </View>
                        )}

                        {!image && (
                            <View style={styles.imageRequiredNote}>
                                <IconAlertTriangle />
                                <Text style={styles.imageRequiredText}>
                                    Photo is required to verify and process your complaint effectively
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Location Section */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location</Text>
                        <View style={styles.locationContainer}>
                            <IconMapPin />
                            <View style={styles.locationInfo}>
                                {location ? (
                                    <>
                                        <Text style={styles.locationText}>{location.address}</Text>
                                        <Text style={styles.coordinatesText}>
                                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.locationText}>Getting current location...</Text>
                                )}
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.locationButton}
                            onPress={getCurrentLocation}
                        >
                            <Text style={styles.locationButtonText}>Update Location</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Priority Warning */}
                    {priority === 'Critical' && (
                        <View style={styles.warningContainer}>
                            <IconAlertTriangle />
                            <Text style={styles.warningText}>
                                Critical issues will be prioritized for immediate attention
                            </Text>
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={[
                            styles.submitButton, 
                            (loading || !image) && styles.submitButtonDisabled
                        ]}
                        onPress={submitComplaint}
                        disabled={loading || !image}
                    >
                        {loading ? (
                            <>
                                <ActivityIndicator color="white" />
                                <Text style={styles.submitButtonText}>Submitting...</Text>
                            </>
                        ) : (
                            <>
                                <IconSend />
                                <Text style={styles.submitButtonText}>
                                    {!image ? 'Add Photo to Submit' : 'Submit Report'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Info Text */}
                    <Text style={styles.infoText}>
                        Your report with photo will be reviewed by the relevant department and you&apos;ll receive updates on its progress. Photos help authorities understand and resolve issues faster.
                    </Text>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#2563EB',
        padding: 24,
        paddingBottom: 32,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'white',
        opacity: 0.9,
    },
    form: {
        padding: 20,
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    requiredText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: 'normal',
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    characterCount: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'right',
    },
    pickerContainer: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    pickerIcon: {
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: [{ translateY: -10 }],
        pointerEvents: 'none',
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 20,
        gap: 8,
    },
    imageButtonRequired: {
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
    },
    imageButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    imageRequiredNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        marginTop: 8,
    },
    imageRequiredText: {
        flex: 1,
        fontSize: 12,
        color: '#92400E',
    },
    imagePreview: {
        position: 'relative',
        marginTop: 12,
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    removeImageText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    imageStatusBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    imageStatusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    locationInfo: {
        flex: 1,
    },
    locationText: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    coordinatesText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    locationButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
        marginTop: 8,
    },
    locationButtonText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '500',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: '#92400E',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
        marginTop: 12,
    },
    submitButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 8,
    },
});

export default ReportScreen;
