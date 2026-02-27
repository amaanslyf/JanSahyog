import { Timestamp } from 'firebase/firestore';

// ─── Firebase Timestamp Helper ───────────────────────────────────────────────
export type FirebaseTimestamp = Timestamp | Date | string | number | null | undefined;

// ─── Civic Issue ─────────────────────────────────────────────────────────────
export interface CivicIssue {
    id: string;
    title: string;
    description: string;
    category: string;
    status: IssueStatus;
    priority: IssuePriority;
    reportedBy: string;
    reportedById: string;
    reportedAt: FirebaseTimestamp;
    lastUpdated: FirebaseTimestamp;
    assignedDepartment: string;
    location?: IssueLocation;
    address?: string;
    imageUrl?: string;
    imageUri?: string;
    imageBase64?: string;
    hasImage?: boolean;
    duplicateOfId?: string | null;
    duplicateScore?: number | null;
    aiAnalysis?: {
        suggestedCategory: string;
        confidence: number;
        description: string;
        severity: string;
        tags: string[];
        analyzedAt: string;
    } | null;
    responseTime?: number | null;
}

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved';
export type IssuePriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface IssueLocation {
    latitude: number;
    longitude: number;
    address?: string;
}

// ─── Comment ─────────────────────────────────────────────────────────────────
export interface Comment {
    id: string;
    text: string;
    author: string;
    authorEmail: string;
    createdAt: FirebaseTimestamp;
    type: 'comment' | 'status_change' | 'assignment';
}

// ─── User ────────────────────────────────────────────────────────────────────
export interface AppUser {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    status: UserStatus;
    source: UserSource;
    phone?: string;
    createdAt: FirebaseTimestamp;
    lastActive: FirebaseTimestamp;
    pushToken?: string;
    notificationsEnabled?: boolean;
    // Computed fields (enriched client-side)
    totalIssues?: number;
    resolvedIssues?: number;
    openIssues?: number;
}

export type UserRole = 'admin' | 'moderator' | 'citizen' | 'department_head';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type UserSource = 'mobile_app' | 'web_portal' | 'admin_created';

// ─── Department ──────────────────────────────────────────────────────────────
export interface Department {
    id: string;
    name: string;
    description: string;
    head: string;
    email: string;
    phone: string;
    active: boolean;
    categories: string[];
    createdAt: FirebaseTimestamp;
}

export interface DepartmentStats {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    resolveRate: number;
    avgResponseTime: number;
}

// ─── Auto-Assignment Rule ────────────────────────────────────────────────────
export interface AutoAssignmentRule {
    id: string;
    category: string;
    department: string;
    priority: string;
    enabled: boolean;
    createdAt: FirebaseTimestamp;
}

// ─── Notification ────────────────────────────────────────────────────────────
export interface NotificationLog {
    id: string;
    title: string;
    body: string;
    type: NotificationType;
    target: NotificationTarget;
    priority: 'normal' | 'high';
    sentAt: FirebaseTimestamp;
    sentBy: string;
    recipientCount: number;
    successCount: number;
    failureCount: number;
    status: 'sent' | 'failed' | 'partial';
    relatedIssueId?: string;
}

export type NotificationType = 'manual' | 'automated' | 'bulk' | 'issue_update';
export type NotificationTarget = 'all' | 'department' | 'individual' | 'role';

// ─── Notification Template ───────────────────────────────────────────────────
export interface NotificationTemplate {
    id: string;
    name: string;
    title: string;
    body: string;
    type: 'info' | 'warning' | 'success' | 'urgent';
    createdAt: FirebaseTimestamp;
}

// ─── Automation Rule ─────────────────────────────────────────────────────────
export interface AutomationRule {
    id: string;
    trigger: AutomationTrigger;
    condition: string;
    templateId: string;
    enabled: boolean;
    description: string;
    timesTriggered: number;
    createdAt: FirebaseTimestamp;
    lastTriggered: FirebaseTimestamp | null;
}

export type AutomationTrigger =
    | 'issue_assigned'
    | 'status_changed'
    | 'priority_changed'
    | 'comment_added'
    | 'issue_created';

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface AnalyticsData {
    filteredIssues: CivicIssue[];
    dailyTrends: DailyTrend[];
    departmentData: DepartmentPerformance[];
    priorityData: ChartDataItem[];
    statusData: ChartDataItem[];
    categoryChartData: ChartDataItem[];
    topReporters: TopReporter[];
    geographicData: GeographicArea[];
    totalIssues: number;
    resolvedIssues: number;
    avgResponseTime: number;
    activeUsers: number;
    newUsers: number;
    resolutionRate: number;
}

export interface DailyTrend {
    date: string;
    reported: number;
    resolved: number;
    inProgress: number;
    open: number;
    cumulative: number;
}

export interface DepartmentPerformance {
    department: string;
    shortName: string;
    total: number;
    resolved: number;
    open: number;
    inProgress: number;
    resolveRate: number;
    avgResponseTime: number;
    satisfaction: number;
}

export interface ChartDataItem {
    name: string;
    value: number;
    fill?: string;
}

export interface TopReporter {
    email: string;
    fullEmail: string;
    count: number;
}

export interface GeographicArea {
    area: string;
    total: number;
    resolved: number;
    open: number;
    resolveRate: number;
}

export interface PreviousPeriodData {
    totalIssues: number;
    resolvedIssues: number;
    avgResponseTime: number;
    resolutionRate: number;
}

// ─── UI State ────────────────────────────────────────────────────────────────
export interface AlertState {
    show: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
}

// ─── Communication ───────────────────────────────────────────────────────────
export interface CommunicationAnalytics {
    totalSent: number;
    sentThisWeek: number;
    successRate: number;
    totalRecipients: number;
    byType: Record<string, number>;
}
