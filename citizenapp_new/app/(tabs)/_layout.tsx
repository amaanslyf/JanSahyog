import React from 'react';
import { Tabs } from 'expo-router';
import { IconHome, IconPlus, IconFileText, IconUser } from '../../src/components/Icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                }
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    tabBarLabel: t('nav.home'),
                    tabBarIcon: ({ color }) => <IconHome color={color} />,
                }}
            />
            <Tabs.Screen
                name="report"
                options={{
                    tabBarLabel: t('nav.report'),
                    tabBarIcon: ({ color }) => <IconPlus color={color} />,
                }}
            />
            <Tabs.Screen
                name="mycomplaint"
                options={{
                    tabBarLabel: t('nav.myReports'),
                    tabBarIcon: ({ color }) => <IconFileText color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarLabel: t('nav.profile'),
                    tabBarIcon: ({ color }) => <IconUser color={color} />,
                }}
            />
        </Tabs>
    );
}