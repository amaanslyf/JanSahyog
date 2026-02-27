import type { FirebaseTimestamp } from '../types';

/**
 * Safely converts any Firebase timestamp variant to a JS Date.
 */
export function toDate(timestamp: FirebaseTimestamp): Date {
    try {
        if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
            return (timestamp as { toDate: () => Date }).toDate();
        }
        if (timestamp instanceof Date) return timestamp;
        if (timestamp) return new Date(timestamp as string | number);
        return new Date();
    } catch {
        return new Date();
    }
}

/**
 * Formats a Firebase timestamp into a human-readable date string.
 */
export function formatDate(
    timestamp: FirebaseTimestamp,
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
    try {
        const date = toDate(timestamp);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', options);
    } catch {
        return 'Unknown';
    }
}

/**
 * Formats a Firebase timestamp for chart display (short month + day).
 */
export function formatDateForChart(timestamp: FirebaseTimestamp): string {
    return formatDate(timestamp, { month: 'short', day: 'numeric' });
}

/**
 * Calculates the difference in days between two timestamps.
 */
export function daysBetween(start: FirebaseTimestamp, end: FirebaseTimestamp): number {
    const startDate = toDate(start);
    const endDate = toDate(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates response time in days for an issue.
 * Returns null if issue is Open or missing timestamps.
 */
export function calculateResponseTime(
    reportedAt: FirebaseTimestamp,
    lastUpdated: FirebaseTimestamp,
    status: string,
): number | null {
    if (!lastUpdated || !reportedAt || status === 'Open') return null;
    return daysBetween(reportedAt, lastUpdated);
}
