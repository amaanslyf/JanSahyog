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
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useFirebase } from '../../src/hooks/useFirebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';

// --- (SVG Icons are unchanged) ---
const IconImage = () => ( <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" /> <Circle cx="9" cy="9" r="2" /> <Polyline points="21 15 16 10 5 21" /> </Svg> );
const IconSend = () => ( <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <Line x1="22" y1="2" x2="11" y2="13" /> <Polyline points="22 2 15 22 11 13 2 9 22 2" /> </Svg> );
const IconMapPin = () => ( <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><Circle cx="12" cy="10" r="3" /></Svg>);
const IconAlertTriangle = () => ( <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /> <Line x1="12" y1="9" x2="12" y2="13" /> <Line x1="12" y1="17" x2="12.01" y2="17" /> </Svg> );


type LocationData = {
    latitude: number;
    longitude: number;
    address: string;
};

const ReportScreen = () => {
    const { db } = useFirebase();
    const { user } = useAuth();
    const router = useRouter();

    const [description, setDescription] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    useEffect(() => {
        requestPermissions();
        getCurrentLocation();
    }, []);

    const requestPermissions = async () => {
        try {
            await ImagePicker.requestCameraPermissionsAsync();
            await ImagePicker.requestMediaLibraryPermissionsAsync();
            await Location.requestForegroundPermissionsAsync();
        } catch (error) {
            console.error('Error requesting permissions:', error);
        }
    };

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const currentLocation = await Location.getCurrentPositionAsync({});
            const reverseGeocode = await Location.reverseGeocodeAsync(currentLocation.coords);

            const address = reverseGeocode[0] ? `${reverseGeocode[0].name}, ${reverseGeocode[0].city}` : 'Location detected';
            setLocation({ ...currentLocation.coords, address });
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const processImage = async (uri: string) => {
        setImageLoading(true);
        try {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 800 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            if (manipulatedImage.base64 && (manipulatedImage.base64.length / 1024) < 800) {
                setImage(manipulatedImage.uri);
                setImageBase64(manipulatedImage.base64);
            } else {
                Alert.alert('Image Too Large', 'Please choose a smaller image.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to process image.');
        } finally {
            setImageLoading(false);
        }
    };

    const pickImage = () => Alert.alert('Select Image', 'Choose an option', [
        { text: 'Camera', onPress: async () => {
                const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.8 });
                if (!result.canceled) await processImage(result.assets[0].uri);
            }},
        { text: 'Gallery', onPress: async () => {
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.8 });
                if (!result.canceled) await processImage(result.assets[0].uri);
            }},
        { text: 'Cancel', style: 'cancel' },
    ]);

    const submitComplaint = async () => {
        if (!description.trim() || !imageBase64) {
            Alert.alert('Missing Information', 'A description and photo are required.');
            return;
        }
        if (!user) {
            Alert.alert('Authentication Error', 'Please log in to submit a complaint.');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'civicIssues'), {
                description: description.trim(),
                imageUri: `data:image/jpeg;base64,${imageBase64}`,
                reportedById: user.uid,
                reportedBy: user.email,
                reportedAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                location: location || null,
                status: 'Open',
                category: 'Other',
                priority: 'Medium',
            });
            Alert.alert('Success!', 'Your complaint has been submitted.', [
                { text: 'View My Reports', onPress: () => router.push('/mycomplaint') },
                { text: 'Report Another', onPress: resetForm },
            ]);
        } catch (error) {
            Alert.alert('Submission Failed', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setDescription('');
        setImage(null);
        setImageBase64(null);
        getCurrentLocation();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAwareScrollView>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Report an Issue</Text>
                    <Text style={styles.headerSubtitle}>Help improve your community by reporting civic issues</Text>
                </View>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Provide a detailed description..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Add Photo * <Text style={styles.requiredText}>(Required)</Text></Text>
                        <TouchableOpacity style={[styles.imageButton, !image && styles.imageButtonRequired]} onPress={pickImage} disabled={imageLoading}>
                            {imageLoading ? <ActivityIndicator color="#6B7280" /> : <><IconImage /><Text style={styles.imageButtonText}>{image ? 'Change Photo' : 'Add Photo'}</Text></>}
                        </TouchableOpacity>
                        {image && (
                            <View style={styles.imagePreview}>
                                <Image source={{ uri: image }} style={styles.previewImage} />
                                <TouchableOpacity style={styles.removeImageButton} onPress={() => { setImage(null); setImageBase64(null); }}><Text style={styles.removeImageText}>Remove</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location</Text>
                        <View style={styles.locationContainer}>
                            <IconMapPin />
                            <Text style={styles.locationText}>{location ? location.address : 'Getting location...'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={[styles.submitButton, (loading || !image) && styles.submitButtonDisabled]} onPress={submitComplaint} disabled={loading || !image}>
                        {loading ? <ActivityIndicator color="white" /> : <><IconSend /><Text style={styles.submitButtonText}>Submit Report</Text></>}
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#2563EB', padding: 24, paddingBottom: 32 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    headerSubtitle: { fontSize: 16, color: 'white', opacity: 0.9 },
    form: { padding: 20, gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    requiredText: { color: '#EF4444', fontSize: 14, fontWeight: 'normal' },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1F2937' },
    textArea: { height: 100, textAlignVertical: 'top' },
    imageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 20, gap: 8 },
    imageButtonRequired: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
    imageButtonText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
    imagePreview: { marginTop: 12, position: 'relative' },
    previewImage: { width: '100%', height: 200, borderRadius: 12 },
    removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    removeImageText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    locationContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, gap: 12 },
    locationText: { flex: 1, fontSize: 16, color: '#1F2937', fontWeight: '500' },
    submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, gap: 8, marginTop: 12 },
    submitButtonDisabled: { backgroundColor: '#9CA3AF' },
    submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

export default ReportScreen;