// src/styles/typography.ts
import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography: Record<string, TextStyle> = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    h3: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    body: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    bodySmall: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    button: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.white,
    },
    caption: {
        fontSize: 12,
        color: colors.textMuted,
    },
};
