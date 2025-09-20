import React from 'react';
import { Tabs } from 'expo-router';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';

// --- (Icon components are unchanged) ---
const IconHome = ({ color }: { color: string }) => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Polyline points="9 22 9 12 15 12 15 22" /></Svg>;
const IconPlus = ({ color }: { color: string }) => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 5v14m-7-7h14" /></Svg>;
const IconFileText = ({ color }: { color: string }) => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><Polyline points="14 2 14 8 20 8" /><Line x1="16" y1="13" x2="8" y2="13" /><Line x1="16" y1="17" x2="8" y2="17" /><Polyline points="10 9 9 9 8 9" /></Svg>;
const IconUser = ({ color }: { color: string }) => <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" /></Svg>;

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#6B7280',
                // UPDATE: This one line will hide the header on all tab screens
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="home" // This corresponds to home.tsx
                options={{
                    // Use 'tabBarLabel' for the text below the icon
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color }) => <IconHome color={color} />,
                }}
            />
            <Tabs.Screen
                name="report" // This corresponds to report.tsx
                options={{
                    tabBarLabel: 'Report',
                    tabBarIcon: ({ color }) => <IconPlus color={color} />,
                }}
            />
            <Tabs.Screen
                name="mycomplaint" // This corresponds to mycomplaint.tsx
                options={{
                    tabBarLabel: 'My Complaints',
                    tabBarIcon: ({ color }) => <IconFileText color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile" // This corresponds to profile.tsx
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color }) => <IconUser color={color} />,
                }}
            />
        </Tabs>
    );
}