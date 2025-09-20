import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../styles/colors'; // Import global styles
import { typography } from '../styles/typography';

const PrimaryButton = ({ title, onPress, loading }) => {
    return (
        <TouchableOpacity style={styles.buttonContainer} onPress={onPress} disabled={loading}>
            {loading ? (
                <ActivityIndicator color={colors.surface} />
            ) : (
                <Text style={styles.buttonText}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        backgroundColor: colors.primary, // Use global color
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: 50, // Ensure consistent height
    },
    buttonText: {
        ...typography.button, // Use global typography
    },
});

export default PrimaryButton;
