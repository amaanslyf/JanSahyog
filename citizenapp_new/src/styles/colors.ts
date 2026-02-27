// src/styles/colors.ts

const commonColors = {
    primary: '#2563EB',      // Blue 600
    primaryLight: '#3B82F6', // Blue 500
    primaryDark: '#1E40AF',  // Blue 800
    success: '#10B981',      // Emerald 500
    warning: '#F59E0B',      // Amber 500
    error: '#EF4444',        // Red 500
    info: '#3B82F6',         // Blue 500
    accent: '#8B5CF6',       // Violet 500
    gold: '#F59E0B',
    silver: '#94A3B8',
    bronze: '#B45309',
};

export const lightTheme = {
    ...commonColors,
    white: '#FFFFFF',
    background: '#F9FAFB',   // Slate 50
    surface: '#FFFFFF',
    border: '#E5E7EB',       // Slate 200
    textPrimary: '#111827',  // Slate 900
    textSecondary: '#4B5563',// Slate 600
    textMuted: '#9CA3AF',    // Slate 400
};

export const darkTheme = {
    ...commonColors,
    white: '#FFFFFF',
    background: '#0F172A',   // Slate 900
    surface: '#1E293B',      // Slate 800
    border: '#334155',       // Slate 700
    textPrimary: '#F9FAFB',  // Slate 50
    textSecondary: '#94A3B8',// Slate 400
    textMuted: '#64748B',    // Slate 500
};

export const colors = lightTheme; // Backward compatibility

export type ColorType = typeof lightTheme;
