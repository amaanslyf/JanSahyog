import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ActivityIndicator, View } from 'react-native';
import '../src/i18n/i18n'; // Initialize i18n

const InitialLayout = () => {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const pathname = usePathname();
    const router = useRouter(); // Fixed: Move router to component level

    useEffect(() => {
        if (isLoading) {
            return;
        }

        const inTabsGroup = segments[0] === '(tabs)';

        // Use pathname to check for the root route instead of segments.length
        if (user && (pathname === '/' || segments[0] === 'login')) {
            // Navigate to home if user is authenticated
            router.replace('/(tabs)/home');
        }
        else if (!user && inTabsGroup) {
            // Navigate to login if user is not authenticated
            router.replace('/login');
        }
    }, [user, isLoading, segments, pathname, router]); // Fixed: Added router to dependencies

    if (isLoading) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#F9FAFB'
            }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="NearbyIssues" options={{ headerShown: true, title: 'Nearby Issues' }} />
            <Stack.Screen name="leaderBoard" options={{ headerShown: false }} />
        </Stack>
    );
};

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <InitialLayout />
            </AuthProvider>
        </ThemeProvider>
    );
}
