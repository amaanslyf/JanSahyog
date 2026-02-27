import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    GestureResponderEvent
} from 'react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

interface PrimaryButtonProps {
    title: string;
    onPress: (event: GestureResponderEvent) => void;
    loading?: boolean;
    style?: ViewStyle;
    disabled?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
    title,
    onPress,
    loading = false,
    style,
    disabled = false
}) => {
    return (
        <TouchableOpacity
            style={[styles.buttonContainer, style, (disabled || loading) && styles.disabledButton]}
            onPress={onPress}
            disabled={loading || disabled}
        >
            {loading ? (
                <ActivityIndicator color={colors.white} />
            ) : (
                <Text style={styles.buttonText}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        backgroundColor: colors.primary,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: 50,
    },
    disabledButton: {
        opacity: 0.6,
        backgroundColor: colors.textMuted,
    },
    buttonText: {
        ...typography.button,
    },
});

export default PrimaryButton;
