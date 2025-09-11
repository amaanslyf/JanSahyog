// screens/HomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const HomeScreen = ({ navigation }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login'); // Go back to login screen
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to JanSahyog! 🎉</Text>
      <Text style={styles.subtitle}>What would you like to do today?</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.reportButton]}
        onPress={() => navigation.navigate('ReportIssue')}
      >
        <Text style={styles.buttonText}>📷 Report New Issue</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.viewButton]}
        onPress={() => navigation.navigate('IssueList')}
      >
        <Text style={styles.buttonText}>📋 View All Issues</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.signOutButton]}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>🚪 Sign Out</Text>
      </TouchableOpacity>

      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#7f8c8d',
  },
  button: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportButton: {
    backgroundColor: '#e74c3c',
  },
  viewButton: {
    backgroundColor: '#3498db',
  },
  signOutButton: {
    backgroundColor: '#95a5a6',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
