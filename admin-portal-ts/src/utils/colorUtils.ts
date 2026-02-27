import type { IssueStatus, IssuePriority } from '../types';

/**
 * Returns a MUI color string for the given issue status.
 */
export function getStatusColor(status: IssueStatus): 'error' | 'warning' | 'success' | 'default' {
    switch (status) {
        case 'Open':
            return 'error';
        case 'In Progress':
            return 'warning';
        case 'Resolved':
            return 'success';
        default:
            return 'default';
    }
}

/**
 * Returns a MUI color string for the given issue priority.
 */
export function getPriorityColor(priority: IssuePriority): 'error' | 'warning' | 'primary' | 'success' | 'default' {
    switch (priority) {
        case 'Critical':
            return 'error';
        case 'High':
            return 'warning';
        case 'Medium':
            return 'primary';
        case 'Low':
            return 'success';
        default:
            return 'default';
    }
}

/**
 * Returns a hex color for a department name (deterministic hash).
 */
const DEPARTMENT_COLORS = [
    '#1976d2', '#f57c00', '#4caf50', '#2196f3', '#8bc34a',
    '#9c27b0', '#ff5722', '#607d8b', '#795548', '#e91e63',
];

export function getDepartmentColor(department: string | undefined): string {
    const hash = (department ?? '').split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return DEPARTMENT_COLORS[hash % DEPARTMENT_COLORS.length] ?? '#1976d2';
}

/**
 * Chart fill colors for priority values.
 */
export function getPriorityFill(priority: string): string {
    switch (priority) {
        case 'Critical':
            return '#d32f2f';
        case 'High':
            return '#f57c00';
        case 'Medium':
            return '#1976d2';
        case 'Low':
            return '#388e3c';
        default:
            return '#9e9e9e';
    }
}

/**
 * Chart fill colors for status values.
 */
export function getStatusFill(status: string): string {
    switch (status) {
        case 'Open':
            return '#f44336';
        case 'In Progress':
            return '#ff9800';
        case 'Resolved':
            return '#4caf50';
        default:
            return '#9e9e9e';
    }
}
