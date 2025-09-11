// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

// Import screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ReportIssueScreen from './screens/ReportIssueScreen';
import IssueListScreen from './screens/IssueListScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? "Home" : "Login"}
        screenOptions={{
          headerStyle: { backgroundColor: '#3498db' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ 
            title: 'JanSahyog Dashboard',
            headerLeft: null,
          }}
        />
        {/* Add this new screen */}
        <Stack.Screen 
          name="ReportIssue" 
          component={ReportIssueScreen}
          options={{ title: 'Report Issue' }}
        />
        <Stack.Screen
         name="IssueList"
         component={IssueListScreen}
         options={{ title: 'Reported Issues' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
