import React from 'react';
import { Tabs } from 'expo-router';
import { IconHome, IconPlus, IconFileText, IconUser } from '../../src/components/Icons';

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