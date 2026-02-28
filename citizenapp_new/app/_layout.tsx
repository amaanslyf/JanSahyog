import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../src/i18n/i18n'; // Initialize i18n

const InitialLayout = () => {
    const { user, isLoading } = useAuth();
    const { colors, isDark } = useTheme();
    const segments = useSegments();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            return;
        }

        const inTabsGroup = segments[0] === '(tabs)';

        if (user && (pathname === '/' || segments[0] === 'login')) {
            router.replace('/(tabs)/home');
        }
        else if (!user && inTabsGroup) {
            router.replace('/login');
        }
    }, [user, isLoading, segments, pathname, router]);

    if (isLoading) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.background
            }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background }
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="NearbyIssues" options={{ headerShown: true, title: 'Nearby Issues' }} />
                <Stack.Screen name="leaderBoard" options={{ headerShown: false }} />
            </Stack>
        </>
    );
};

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <InitialLayout />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
