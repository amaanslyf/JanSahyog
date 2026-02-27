import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    getDocs,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { AppUser } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PushNotification {
    title: string;
    body: string;
    data?: Record<string, string>;
}

interface NotificationPayload {
    title: string;
    body: string;
    type: string;
    target: string;
    priority: string;
    relatedIssueId?: string;
}

interface SendResult {
    success: boolean;
    successCount: number;
    failureCount: number;
    errors: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

class NotificationService {
    private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /** Send notification to mobile users via Expo Push Notifications */
    static async sendToMobileUsers(
        notification: PushNotification,
        userTokens: string[],
    ): Promise<SendResult> {
        const validTokens = userTokens.filter((token) => token?.startsWith('ExponentPushToken'));

        if (validTokens.length === 0) {
            return { success: false, successCount: 0, failureCount: 0, errors: ['No valid Expo push tokens'] };
        }

        const messages = validTokens.map((token) => ({
            to: token,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: notification.data ?? {},
            priority: 'high' as const,
            channelId: 'default',
        }));

        try {
            const response = await fetch(this.EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });

            const result = await response.json();
            const tickets = Array.isArray(result.data) ? result.data : [result.data];
            const successCount = tickets.filter((t: { status: string }) => t?.status === 'ok').length;
            const failureCount = tickets.length - successCount;

            return { success: successCount > 0, successCount, failureCount, errors: [] };
        } catch (error) {
            console.error('Expo push error:', error);
            return {
                success: false,
                successCount: 0,
                failureCount: validTokens.length,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }

    /** Main function to send notifications to users */
    static async sendNotificationToUsers(
        notification: NotificationPayload,
        targetUsers: AppUser[],
    ): Promise<SendResult> {
        const mobileTokens = targetUsers
            .filter((u) => u.pushToken && u.notificationsEnabled !== false)
            .map((u) => u.pushToken!)
            .filter(Boolean);

        let result: SendResult = { success: false, successCount: 0, failureCount: 0, errors: [] };

        if (mobileTokens.length > 0) {
            result = await this.sendToMobileUsers(
                { title: notification.title, body: notification.body, data: { type: notification.type } },
                mobileTokens,
            );
        }

        // Log notification
        try {
            await addDoc(collection(db, 'notificationLogs'), {
                title: notification.title,
                body: notification.body,
                type: notification.type,
                target: notification.target,
                priority: notification.priority,
                sentAt: serverTimestamp(),
                sentBy: 'admin',
                recipientCount: targetUsers.length,
                successCount: result.successCount,
                failureCount: result.failureCount,
                status: result.successCount > 0 ? 'sent' : 'failed',
                relatedIssueId: notification.relatedIssueId ?? null,
            });
        } catch (error) {
            console.error('Error logging notification:', error);
        }

        // Create in-app notifications for each user
        try {
            const batch = writeBatch(db);
            targetUsers.forEach((user) => {
                const notifRef = doc(collection(db, 'users', user.id, 'notifications'));
                batch.set(notifRef, {
                    title: notification.title,
                    body: notification.body,
                    type: notification.type,
                    read: false,
                    createdAt: serverTimestamp(),
                    relatedIssueId: notification.relatedIssueId ?? null,
                });
            });
            await batch.commit();
        } catch (error) {
            console.error('Error creating in-app notifications:', error);
        }

        return result;
    }

    /** Automatic notification triggers */
    static async sendAutomaticNotification(
        trigger: string,
        issueData: Record<string, string>,
        _userData: Record<string, string>,
    ): Promise<void> {
        const templates: Record<string, { title: string; body: string }> = {
            issue_assigned: {
                title: '📋 Issue Assigned',
                body: `Issue "${issueData['title'] ?? 'Unknown'}" has been assigned to ${issueData['department'] ?? 'a department'}.`,
            },
            status_in_progress: {
                title: '🔄 Issue In Progress',
                body: `Your reported issue "${issueData['title'] ?? 'Unknown'}" is now being worked on.`,
            },
            status_resolved: {
                title: '✅ Issue Resolved',
                body: `Great news! Issue "${issueData['title'] ?? 'Unknown'}" has been resolved.`,
            },
            issue_escalated: {
                title: '⚠️ Issue Escalated',
                body: `Issue "${issueData['title'] ?? 'Unknown'}" has been marked as ${issueData['priority'] ?? 'high'} priority.`,
            },
        };

        const template = templates[trigger];
        if (!template) return;

        // Get users to notify
        try {
            const usersQuery = query(
                collection(db, 'users'),
                where('notificationsEnabled', '!=', false),
            );
            const snapshot = await getDocs(usersQuery);
            const users: AppUser[] = [];
            snapshot.forEach((docSnap) => {
                users.push({ id: docSnap.id, ...docSnap.data() } as AppUser);
            });

            if (users.length > 0) {
                await this.sendNotificationToUsers(
                    {
                        title: template.title,
                        body: template.body,
                        type: 'automated',
                        target: 'all',
                        priority: 'high',
                        relatedIssueId: issueData['issueId'],
                    },
                    users,
                );
            }
        } catch (error) {
            console.error('Error sending automatic notification:', error);
        }
    }

    /** Trigger notifications on issue updates */
    static async triggerOnIssueUpdate(
        oldIssue: Record<string, string>,
        newIssue: Record<string, string>,
        userData: Record<string, string>,
    ): Promise<void> {
        if (oldIssue['status'] !== newIssue['status']) {
            if (newIssue['status'] === 'In Progress') {
                await this.sendAutomaticNotification('status_in_progress', newIssue, userData);
            } else if (newIssue['status'] === 'Resolved') {
                await this.sendAutomaticNotification('status_resolved', newIssue, userData);
            }
        }

        if (oldIssue['assignedDepartment'] !== newIssue['assignedDepartment'] && newIssue['assignedDepartment']) {
            await this.sendAutomaticNotification('issue_assigned', newIssue, userData);
        }

        if (oldIssue['priority'] !== newIssue['priority'] && newIssue['priority'] === 'Critical') {
            await this.sendAutomaticNotification('issue_escalated', newIssue, userData);
        }
    }

    /** Send bulk notification to multiple users */
    static async sendBulkNotification(
        notification: NotificationPayload,
        userIds: string[],
    ): Promise<SendResult> {
        try {
            const users: AppUser[] = [];
            for (const userId of userIds) {
                const userQuery = query(collection(db, 'users'), where('__name__', '==', userId));
                const snapshot = await getDocs(userQuery);
                snapshot.forEach((docSnap) => {
                    users.push({ id: docSnap.id, ...docSnap.data() } as AppUser);
                });
            }

            if (users.length === 0) {
                return { success: false, successCount: 0, failureCount: 0, errors: ['No users found'] };
            }

            return await this.sendNotificationToUsers(notification, users);
        } catch (error) {
            console.error('Error sending bulk notification:', error);
            return {
                success: false,
                successCount: 0,
                failureCount: userIds.length,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }

    /** Update a user's push token */
    static async updatePushToken(userId: string, token: string): Promise<void> {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { pushToken: token, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error('Error updating push token:', error);
        }
    }
}

export default NotificationService;
