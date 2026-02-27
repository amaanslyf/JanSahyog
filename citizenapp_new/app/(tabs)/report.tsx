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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import {
    IconCamera,
    IconMapPin,
    IconImage,
    IconSend,
    IconAlertTriangle,
    IconChevronDown
} from '../../src/components/Icons';
import { colors } from '../../src/styles/colors';
import { typography } from '../../src/styles/typography';
import { moderateScale, scale, verticalScale } from '../../src/utils/responsive';

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
    const params = useLocalSearchParams();

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
    const [locationLoading, setLocationLoading] = useState(false);
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const categories = [
        { label: t('report.categoryPlaceholder'), value: '' },
        { label: t('categories.garbage'), value: 'Garbage' },
        { label: t('categories.waterLeak'), value: 'Water Leak' },
        { label: t('categories.roads'), value: 'Roads' },
        { label: t('categories.streetlight'), value: 'Streetlight' },
        { label: t('categories.pollution'), value: 'Pollution' },
        { label: t('categories.other'), value: 'Other' },
    ];

    const priorities = [
        { label: t('priorities.low'), value: 'Low' },
        { label: t('priorities.medium'), value: 'Medium' },
        { label: t('priorities.high'), value: 'High' },
        { label: t('priorities.critical'), value: 'Critical' },
    ];

    // Request permissions on mount
    useEffect(() => {
        requestPermissions();
        getCurrentLocation();

        // Auto-fill category from params if provided
        if (params.category) {
            setCategory(params.category as string);
        }
    }, [params.category]);

    const requestPermissions = async () => {
        try {
            // Camera permissions
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (cameraStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
                Alert.alert(
                    t('report.permissions.cameraTitle'),
                    t('report.permissions.cameraMessage')
                );
            }

            // Location permissions
            const locationStatus = await Location.requestForegroundPermissionsAsync();
            if (locationStatus.status !== 'granted') {
                Alert.alert(
                    t('nearbyIssues.locationPermissionRequired'),
                    t('nearbyIssues.locationPermissionMessage')
                );
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
        }
    };

    const getCurrentLocation = async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationLoading(false);
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({});
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
            });

            const address = reverseGeocode[0] ?
                `${reverseGeocode[0].name}, ${reverseGeocode[0].city}, ${reverseGeocode[0].region}`
                : t('report.locationLabel');

            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                address: address,
            });
        } catch (error) {
            console.error('Error getting location:', error);
        } finally {
            setLocationLoading(false);
        }
    };

    const pickImage = async () => {
        Alert.alert(
            t('report.selectImage.title'),
            t('report.selectImage.subtitle'),
            [
                { text: t('report.selectImage.camera'), onPress: () => openCamera() },
                { text: t('report.selectImage.gallery'), onPress: () => openGallery() },
                { text: t('common.cancel'), style: 'cancel' },
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

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!title.trim()) newErrors.title = t('report.titleError');
        if (!description.trim()) newErrors.description = t('report.descriptionError');
        if (!category) newErrors.category = t('report.categoryError');
        if (!image) newErrors.image = t('report.photoRequired');
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submitComplaint = async () => {
        if (!validateForm() || !imageBase64) {
            setTouched({ title: true, description: true, category: true, image: true });
            Alert.alert(t('common.error'), t('report.fillRequiredFields'));
            return;
        }

        if (!user) {
            Alert.alert(t('common.error'), t('report.loginError'));
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
                t('report.successTitle'),
                t('report.successMessage'),
                [
                    {
                        text: t('report.viewReports'),
                        onPress: () => router.push('/mycomplaint')
                    },
                    {
                        text: t('report.reportAnother'),
                        onPress: () => resetForm()
                    },
                ]
            );

        } catch (error) {
            console.error('❌ Error submitting complaint:', error);
            Alert.alert(
                t('report.failedTitle'),
                t('report.failedMessage', { error: error instanceof Error ? error.message : 'Unknown error' })
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
        setTouched({});
        setErrors({});
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
                    <Text style={styles.headerTitle}>{t('report.title')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t('report.subtitle')}
                    </Text>
                </View>

                <View style={styles.form}>
                    {/* Title Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('report.issueTitle')}</Text>
                        <TextInput
                            style={[
                                styles.input,
                                touched.title && errors.title && styles.inputError
                            ]}
                            placeholder={t('report.issueTitlePlaceholder')}
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                if (touched.title) validateForm();
                            }}
                            onBlur={() => {
                                setTouched({ ...touched, title: true });
                                validateForm();
                            }}
                            maxLength={100}
                        />
                        {touched.title && errors.title && (
                            <Text style={styles.errorText}>{errors.title}</Text>
                        )}
                    </View>

                    {/* Category Picker */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('report.category')}</Text>
                        <View style={[
                            styles.pickerContainer,
                            touched.category && errors.category && styles.inputError
                        ]}>
                            <Picker
                                selectedValue={category}
                                onValueChange={(itemValue) => {
                                    setCategory(itemValue);
                                    setTouched({ ...touched, category: true });
                                    validateForm();
                                }}
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
                        {touched.category && errors.category && (
                            <Text style={styles.errorText}>{errors.category}</Text>
                        )}
                    </View>

                    {/* Priority Picker */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('report.priorityLabel')}</Text>
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
                        <Text style={styles.label}>{t('report.description')}</Text>
                        <TextInput
                            style={[
                                styles.input,
                                styles.textArea,
                                touched.description && errors.description && styles.inputError
                            ]}
                            placeholder={t('report.descriptionPlaceholder')}
                            value={description}
                            onChangeText={(text) => {
                                setDescription(text);
                                if (touched.description) validateForm();
                            }}
                            onBlur={() => {
                                setTouched({ ...touched, description: true });
                                validateForm();
                            }}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                        />
                        <View style={styles.rowBetween}>
                            {touched.description && errors.description ? (
                                <Text style={styles.errorText}>{errors.description}</Text>
                            ) : <View />}
                            <Text style={[
                                styles.characterCount,
                                description.length > 450 && { color: colors.error }
                            ]}>
                                {description.length}/500
                            </Text>
                        </View>
                    </View>

                    {/* Image Section - MANDATORY */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            {t('report.photoLabel')}
                            <Text style={styles.requiredText}> {t('report.photoRequired')}</Text>
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.imageButton,
                                !image && touched.image && styles.imageButtonError,
                                !image && styles.imageButtonRequired
                            ]}
                            onPress={() => {
                                pickImage();
                                setTouched({ ...touched, image: true });
                            }}
                            disabled={imageLoading}
                        >
                            {imageLoading ? (
                                <ActivityIndicator color="#6B7280" />
                            ) : (
                                <>
                                    <IconImage />
                                    <Text style={styles.imageButtonText}>
                                        {image ? t('report.changePhotoButton') : t('report.addPhotoButton')}
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
                                        validateForm();
                                    }}
                                >
                                    <Text style={styles.removeImageText}>{t('report.remove')}</Text>
                                </TouchableOpacity>
                                <View style={styles.imageStatusBadge}>
                                    <Text style={styles.imageStatusText}>{t('report.imageReady')}</Text>
                                </View>
                            </View>
                        )}

                        {!image && (
                            <View style={styles.imageRequiredNote}>
                                <IconAlertTriangle />
                                <Text style={styles.imageRequiredText}>
                                    {t('report.photoNote')}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Location Section */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('report.locationLabel')}</Text>
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
                                    <Text style={styles.locationText}>{t('report.locationPlaceholder')}</Text>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.locationButton, locationLoading && { opacity: 0.7 }]}
                            onPress={getCurrentLocation}
                            disabled={locationLoading}
                        >
                            {locationLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={styles.locationButtonText}>{t('report.updateLocationButton')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Priority Warning */}
                    {priority === 'Critical' && (
                        <View style={styles.warningContainer}>
                            <IconAlertTriangle />
                            <Text style={styles.warningText}>
                                {t('report.criticalWarning')}
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
                                <Text style={styles.submitButtonText}>{t('report.submittingButton')}</Text>
                            </>
                        ) : (
                            <>
                                <IconSend />
                                <Text style={styles.submitButtonText}>
                                    {!image ? t('report.addPhotoToSubmit') : t('report.submitButton')}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Info Text */}
                    <Text style={styles.infoText}>
                        {t('report.footerInfo')}
                    </Text>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: colors.primary,
        padding: moderateScale(24),
        paddingBottom: moderateScale(32),
    },
    headerTitle: {
        ...typography.h2,
        color: colors.white,
        fontSize: moderateScale(28),
        marginBottom: moderateScale(8),
    },
    headerSubtitle: {
        ...typography.body,
        color: colors.white,
        opacity: 0.9,
        fontSize: moderateScale(15),
    },
    form: {
        padding: moderateScale(20),
        gap: moderateScale(20),
    },
    inputGroup: {
        gap: moderateScale(8),
    },
    label: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
        fontSize: moderateScale(15),
    },
    requiredText: {
        color: colors.error,
        fontSize: moderateScale(13),
        fontWeight: 'normal',
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: moderateScale(12),
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(12),
        fontSize: moderateScale(16),
        color: colors.textPrimary,
    },
    inputError: {
        borderColor: colors.error,
        backgroundColor: '#FFF5F5',
    },
    errorText: {
        color: colors.error,
        fontSize: moderateScale(12),
        marginTop: moderateScale(2),
    },
    textArea: {
        height: moderateScale(120),
        textAlignVertical: 'top',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    characterCount: {
        ...typography.caption,
        textAlign: 'right',
        fontSize: moderateScale(11),
    },
    pickerContainer: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: moderateScale(12),
        position: 'relative',
        overflow: 'hidden',
    },
    picker: {
        height: moderateScale(50),
        width: '100%',
    },
    pickerIcon: {
        position: 'absolute',
        right: moderateScale(16),
        top: '50%',
        transform: [{ translateY: -10 }],
        pointerEvents: 'none',
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: moderateScale(12),
        paddingVertical: moderateScale(24),
        gap: moderateScale(8),
    },
    imageButtonRequired: {
        borderColor: colors.gold,
        backgroundColor: '#FFFBEB',
    },
    imageButtonError: {
        borderColor: colors.error,
        backgroundColor: '#FFF5F5',
    },
    imageButtonText: {
        ...typography.body,
        color: colors.textMuted,
        fontSize: moderateScale(15),
    },
    imageRequiredNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: moderateScale(8),
        padding: moderateScale(12),
        gap: moderateScale(8),
        marginTop: moderateScale(8),
    },
    imageRequiredText: {
        flex: 1,
        ...typography.caption,
        color: '#92400E',
        fontSize: moderateScale(12),
    },
    imagePreview: {
        position: 'relative',
        marginTop: moderateScale(12),
    },
    previewImage: {
        width: '100%',
        height: moderateScale(200),
        borderRadius: moderateScale(12),
    },
    removeImageButton: {
        position: 'absolute',
        top: moderateScale(8),
        right: moderateScale(8),
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(6),
        borderRadius: moderateScale(6),
    },
    removeImageText: {
        color: colors.white,
        fontSize: moderateScale(12),
        fontWeight: 'bold',
    },
    imageStatusBadge: {
        position: 'absolute',
        bottom: moderateScale(8),
        left: moderateScale(8),
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: moderateScale(6),
    },
    imageStatusText: {
        color: colors.white,
        fontSize: moderateScale(12),
        fontWeight: 'bold',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        gap: moderateScale(12),
    },
    locationInfo: {
        flex: 1,
    },
    locationText: {
        ...typography.body,
        fontWeight: '500',
        fontSize: moderateScale(14),
    },
    coordinatesText: {
        ...typography.caption,
        fontSize: moderateScale(11),
        marginTop: moderateScale(4),
    },
    locationButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(8),
        backgroundColor: '#EFF6FF',
        borderRadius: moderateScale(8),
        marginTop: moderateScale(8),
    },
    locationButtonText: {
        color: colors.primary,
        fontSize: moderateScale(13),
        fontWeight: '500',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: moderateScale(8),
        padding: moderateScale(12),
        gap: moderateScale(8),
    },
    warningText: {
        flex: 1,
        ...typography.bodySmall,
        color: '#92400E',
        fontSize: moderateScale(13),
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: moderateScale(12),
        paddingVertical: moderateScale(18),
        gap: moderateScale(8),
        marginTop: moderateScale(12),
    },
    submitButtonDisabled: {
        backgroundColor: colors.border,
    },
    submitButtonText: {
        ...typography.button,
        fontSize: moderateScale(18),
    },
    infoText: {
        ...typography.caption,
        textAlign: 'center',
        lineHeight: moderateScale(20),
        marginTop: moderateScale(8),
        fontSize: moderateScale(11),
    },
});

export default ReportScreen;
