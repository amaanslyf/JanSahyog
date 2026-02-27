import {
    collection, onSnapshot, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import NotificationService from './notificationService';
import type { AutomationRule, AppUser, CivicIssue } from '../types';

// ─── Automation Engine ───────────────────────────────────────────────────────

let rules: AutomationRule[] = [];
let users: AppUser[] = [];

async function fireRules(trigger: string, issue: CivicIssue): Promise<void> {
    const matchingRules = rules.filter((r) => r.enabled && r.trigger === trigger);
    if (matchingRules.length === 0) return;

    for (const rule of matchingRules) {
        try {
            let targetUsers: AppUser[] = [];
            let title = '';
            let body = '';

            switch (trigger) {
                case 'issue_created':
                    targetUsers = users.filter((u) => u.role === 'admin' && u.pushToken);
                    title = 'New Issue Reported';
                    body = `"${issue.title}" - ${issue.category} (${issue.priority})`;
                    break;
                case 'status_changed':
                    targetUsers = users.filter((u) => u.id === issue.reportedById && u.pushToken);
                    title = 'Issue Status Updated';
                    body = `"${issue.title}" is now "${issue.status}"`;
                    break;
                case 'issue_assigned':
                    targetUsers = users.filter((u) => u.role === 'department_head' && u.pushToken);
                    title = 'Issue Assigned to Your Department';
                    body = `"${issue.title}" assigned to ${issue.assignedDepartment}`;
                    break;
                case 'priority_changed':
                    targetUsers = users.filter((u) => u.role === 'admin' && u.pushToken);
                    title = 'Issue Priority Changed';
                    body = `"${issue.title}" priority set to ${issue.priority}`;
                    break;
                default:
                    continue;
            }

            if (targetUsers.length === 0) continue;

            const result = await NotificationService.sendNotificationToUsers(
                { title, body, type: 'automated', target: 'individual', priority: 'normal' },
                targetUsers,
            );

            await updateDoc(doc(db, 'automationRules', rule.id), {
                timesTriggered: (rule.timesTriggered ?? 0) + 1,
                lastTriggered: serverTimestamp(),
            });

            console.log(`Automation "${rule.description}" fired: ${result.successCount} notifications sent`);
        } catch (error) {
            console.error(`Automation rule "${rule.description}" failed:`, error);
        }
    }
}

export function startAutomationEngine(): () => void {
    const rulesUnsub = onSnapshot(collection(db, 'automationRules'), (snapshot) => {
        rules = [];
        snapshot.forEach((d) => rules.push({ id: d.id, ...d.data() } as AutomationRule));
        console.log(`Automation rules loaded: ${rules.filter((r) => r.enabled).length} active`);
    });

    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        users = [];
        snapshot.forEach((d) => users.push({ id: d.id, ...d.data() } as AppUser));
    });

    const issuesUnsub = onSnapshot(collection(db, 'civicIssues'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const issue = { id: change.doc.id, ...change.doc.data() } as CivicIssue;

            if (change.type === 'added') {
                setTimeout(() => fireRules('issue_created', issue), 1000);
            }

            if (change.type === 'modified') {
                fireRules('status_changed', issue);
                if (issue.assignedDepartment) {
                    fireRules('issue_assigned', issue);
                }
            }
        });
    });

    console.log('Automation engine started');
    return () => {
        rulesUnsub();
        usersUnsub();
        issuesUnsub();
        console.log('Automation engine stopped');
    };
}
