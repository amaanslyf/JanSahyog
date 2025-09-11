// screens/IssueListScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const IssueListScreen = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const issuesQuery = query(
      collection(db, 'civicIssues'),
      orderBy('reportedAt', 'desc')
    );

    const unsubscribe = onSnapshot(issuesQuery, (querySnapshot) => {
      const issuesList = [];
      querySnapshot.forEach((doc) => {
        issuesList.push({ id: doc.id, ...doc.data() });
      });
      setIssues(issuesList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching issues:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.issueCard}>
      {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.issueImage} />}
      <View style={styles.issueDetails}>
        <Text style={styles.issueTitle}>{item.title}</Text>
        <Text style={styles.issueDescription}>{item.description}</Text>
        <Text style={styles.issueLocation}>📍 {item.address || 'Location not available'}</Text>
        <Text style={styles.issueStatus}>Status: {item.status}</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={issues}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.emptyText}>No issues reported yet.</Text>}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  issueCard: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  issueImage: {
    width: 120,
    height: 120,
  },
  issueDetails: {
    flex: 1,
    padding: 10,
  },
  issueTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 5,
    color: '#2c3e50',
  },
  issueDescription: {
    fontSize: 14,
    color: '#34495e',
  },
  issueLocation: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#7f8c8d',
  },
  issueStatus: {
    marginTop: 4,
    fontWeight: '600',
    color: '#27ae60',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default IssueListScreen;
