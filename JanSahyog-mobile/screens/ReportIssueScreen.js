// screens/ReportIssueScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const ReportIssueScreen = ({ navigation }) => {
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [address, setAddress] = useState('Getting location...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user's current location when screen loads
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Function to get current location
  const getCurrentLocation = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Location permission denied');
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Convert coordinates to human-readable address
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse) {
        const addr = addressResponse;
        setAddress(`${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}`);
      }

    } catch (error) {
      console.error('Error getting location:', error);
      setAddress('Unable to get location');
    }
  };

  // Function to pick image from camera
  const takePhoto = async () => {
  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    // Launch camera - FIXED SYNTAX
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], // ✅ NEW: Array syntax instead of MediaTypeOptions
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets.uri);
    }

  } catch (error) {
    Alert.alert('Error', 'Failed to take photo');
    console.error('Camera error:', error);
  }
};

// Function to pick image from gallery - UPDATED
const pickFromGallery = async () => {
  try {
    // Request gallery permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to select photos');
      return;
    }

    // Launch gallery - FIXED SYNTAX
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ NEW: Array syntax instead of MediaTypeOptions
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets.uri);
    }

  } catch (error) {
    Alert.alert('Error', 'Failed to select photo');
    console.error('Gallery error:', error);
  }
};
  // const takePhoto = async () => {
  //   try {
  //     // Request camera permission
  //     const { status } = await ImagePicker.requestCameraPermissionsAsync();
  //     if (status !== 'granted') {
  //       Alert.alert('Permission needed', 'Camera permission is required to take photos');
  //       return;
  //     }

  //     // Launch camera
  //     const result = await ImagePicker.launchCameraAsync({
  //       mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //       allowsEditing: true,
  //       aspect: [4, 3],
  //       quality: 0.8, // Reduce file size
  //     });

  //     if (!result.canceled) {
  //       setSelectedImage(result.assets.uri);
  //     }

  //   } catch (error) {
  //     Alert.alert('Error', 'Failed to take photo');
  //     console.error('Camera error:', error);
  //   }
  // };

  // // Function to pick image from gallery
  // const pickFromGallery = async () => {
  //   try {
  //     // Request gallery permission
  //     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  //     if (status !== 'granted') {
  //       Alert.alert('Permission needed', 'Gallery permission is required to select photos');
  //       return;
  //     }

  //     // Launch gallery
  //     const result = await ImagePicker.launchImageLibraryAsync({
  //       mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //       allowsEditing: true,
  //       aspect: [4, 3],
  //       quality: 0.8,
  //     });

  //     if (!result.canceled) {
  //       setSelectedImage(result.assets.uri);
  //     }

  //   } catch (error) {
  //     Alert.alert('Error', 'Failed to select photo');
  //     console.error('Gallery error:', error);
  //   }
  // };

  // Function to show image picker options
  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Function to submit issue to Firebase
  const submitIssue = async () => {
    // Validate inputs
    if (!issueTitle.trim()) {
      Alert.alert('Error', 'Please enter an issue title');
      return;
    }
    if (!issueDescription.trim()) {
      Alert.alert('Error', 'Please enter issue description');
      return;
    }
    if (!selectedImage) {
      Alert.alert('Error', 'Please add a photo of the issue');
      return;
    }
    if (!currentLocation) {
      Alert.alert('Error', 'Location is required. Please enable GPS and try again');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create issue object
      const issueData = {
        title: issueTitle.trim(),
        description: issueDescription.trim(),
        imageUri: selectedImage,
        location: currentLocation,
        address: address,
        reportedBy: auth.currentUser.email,
        reportedAt: new Date(),
        status: 'Open', // Open, In Progress, Resolved
        priority: 'Medium', // Low, Medium, High, Critical
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'civicIssues'), issueData);
      
      Alert.alert(
        'Success!', 
        'Issue reported successfully. Reference ID: ' + docRef.id,
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form and go back to home
              setIssueTitle('');
              setIssueDescription('');
              setSelectedImage(null);
              navigation.navigate('Home');
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Error', 'Failed to submit issue. Please try again.');
      console.error('Submit error:', error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Report Civic Issue</Text>
      
      {/* Location Display */}
      <View style={styles.locationContainer}>
        <Text style={styles.locationTitle}>📍 Location:</Text>
        <Text style={styles.locationText}>{address}</Text>
        <TouchableOpacity onPress={getCurrentLocation} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>🔄 Refresh Location</Text>
        </TouchableOpacity>
      </View>

      {/* Issue Title Input */}
      <Text style={styles.label}>Issue Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Pothole on Main Street"
        value={issueTitle}
        onChangeText={setIssueTitle}
        maxLength={100}
      />

      {/* Issue Description Input */}
      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the issue in detail..."
        value={issueDescription}
        onChangeText={setIssueDescription}
        multiline
        numberOfLines={4}
        maxLength={500}
      />

      {/* Photo Section */}
      <Text style={styles.label}>Photo *</Text>
      <TouchableOpacity style={styles.photoButton} onPress={showImagePickerOptions}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>📷</Text>
            <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity 
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
        onPress={submitIssue}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>📋 Submit Issue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
    textAlign: 'center',
  },
  locationContainer: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  locationText: {
    fontSize: 14,
    color: '#34495e',
    marginTop: 5,
  },
  refreshButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: '#3498db',
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2c3e50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  photoButton: {
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
    borderRadius: 10,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReportIssueScreen;
