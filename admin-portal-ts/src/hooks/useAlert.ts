import { useState, useCallback } from 'react';
import type { AlertState } from '../types';

const INITIAL_ALERT: AlertState = { show: false, message: '', severity: 'info' };

/**
 * Custom hook for managing alert state with auto-dismiss.
 * Replaces the duplicated showAlert pattern across every page.
 */
export function useAlert(autoDismissMs = 5000) {
    const [alert, setAlert] = useState<AlertState>(INITIAL_ALERT);

    const showAlert = useCallback(
        (message: string, severity: AlertState['severity'] = 'info') => {
            setAlert({ show: true, message, severity });
            setTimeout(() => setAlert(INITIAL_ALERT), autoDismissMs);
        },
        [autoDismissMs],
    );

    const dismissAlert = useCallback(() => {
        setAlert(INITIAL_ALERT);
    }, []);

    return { alert, showAlert, dismissAlert };
}
