import {
    collection, query, where, onSnapshot, getDocs, updateDoc, addDoc,
    doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { findDuplicates, flagAsDuplicate } from './duplicateDetectionService';
import { analyzeAndStoreResult, hasGeminiApiKey } from './aiAnalysisService';
import type { CivicIssue, AutoAssignmentRule } from '../types';

// ─── Default Departments ─────────────────────────────────────────────────────

export const DEFAULT_DEPARTMENTS = [
    {
        name: 'Public Works',
        description: 'Handles road maintenance, construction, and infrastructure repairs',
        head: '',
        email: '',
        phone: '',
        active: true,
        categories: ['Roads'],
    },
    {
        name: 'Water & Sanitation',
        description: 'Manages water supply, sewage, drainage, and waste collection',
        head: '',
        email: '',
        phone: '',
        active: true,
        categories: ['Water Leak', 'Garbage'],
    },
    {
        name: 'Electrical',
        description: 'Manages street lighting, power supply, and electrical infrastructure',
        head: '',
        email: '',
        phone: '',
        active: true,
        categories: ['Streetlight'],
    },
    {
        name: 'Environment',
        description: 'Handles pollution, green cover, and environmental compliance',
        head: '',
        email: '',
        phone: '',
        active: true,
        categories: ['Pollution'],
    },
    {
        name: 'General Administration',
        description: 'Handles miscellaneous civic issues and general inquiries',
        head: '',
        email: '',
        phone: '',
        active: true,
        categories: ['Other'],
    },
];

// ─── Default Auto-Assignment Rules ───────────────────────────────────────────

export const DEFAULT_RULES: Omit<AutoAssignmentRule, 'id' | 'createdAt'>[] = [
    { category: 'Roads', department: 'Public Works', priority: 'Medium', enabled: true },
    { category: 'Water Leak', department: 'Water & Sanitation', priority: 'High', enabled: true },
    { category: 'Garbage', department: 'Water & Sanitation', priority: 'Medium', enabled: true },
    { category: 'Streetlight', department: 'Electrical', priority: 'Medium', enabled: true },
    { category: 'Pollution', department: 'Environment', priority: 'High', enabled: true },
    { category: 'Other', department: 'General Administration', priority: 'Low', enabled: true },
];

// Known categories from the mobile app
export const KNOWN_CATEGORIES = [
    'Garbage', 'Water Leak', 'Roads', 'Streetlight', 'Pollution', 'Other',
];

// ─── Seed Functions ──────────────────────────────────────────────────────────

export async function seedDefaultDepartments(): Promise<number> {
    const snapshot = await getDocs(collection(db, 'departments'));
    const existingNames = new Set(snapshot.docs.map((d) => d.data().name));

    let created = 0;
    for (const dept of DEFAULT_DEPARTMENTS) {
        if (!existingNames.has(dept.name)) {
            await addDoc(collection(db, 'departments'), {
                ...dept,
                createdAt: serverTimestamp(),
            });
            created++;
        }
    }
    return created;
}

export async function seedDefaultRules(): Promise<number> {
    const snapshot = await getDocs(collection(db, 'autoAssignmentRules'));
    const existingCats = new Set(snapshot.docs.map((d) => d.data().category));

    let created = 0;
    for (const rule of DEFAULT_RULES) {
        if (!existingCats.has(rule.category)) {
            await addDoc(collection(db, 'autoAssignmentRules'), {
                ...rule,
                createdAt: serverTimestamp(),
            });
            created++;
        }
    }
    return created;
}

// ─── Auto-Assign Engine ──────────────────────────────────────────────────────

/**
 * Assigns a single issue to a department based on active rules.
 * Returns the department name if assigned, null otherwise.
 */
async function assignIssue(
    issueId: string,
    issue: CivicIssue,
    rules: AutoAssignmentRule[],
): Promise<string | null> {
    const matchingRule = rules.find(
        (r) => r.enabled && r.category.toLowerCase() === (issue.category ?? '').toLowerCase(),
    );

    if (!matchingRule) return null;

    try {
        // Update the issue with the assigned department
        await updateDoc(doc(db, 'civicIssues', issueId), {
            assignedDepartment: matchingRule.department,
            lastUpdated: serverTimestamp(),
        });

        // Log as a comment
        await addDoc(collection(db, 'civicIssues', issueId, 'comments'), {
            text: `Auto-assigned to "${matchingRule.department}" based on category "${issue.category}"`,
            author: 'System',
            authorEmail: 'auto-assign@system',
            type: 'assignment',
            createdAt: serverTimestamp(),
        });

        console.log(`✅ Auto-assigned issue "${issue.title}" → ${matchingRule.department}`);
        return matchingRule.department;
    } catch (error) {
        console.error(`❌ Failed to auto-assign issue ${issueId}:`, error);
        return null;
    }
}

/**
 * Scan all unassigned issues and route them. Call this on demand.
 * Returns the number of issues assigned.
 */
export async function runBulkAutoAssign(): Promise<number> {
    // Fetch active rules
    const rulesSnapshot = await getDocs(collection(db, 'autoAssignmentRules'));
    const rules: AutoAssignmentRule[] = [];
    rulesSnapshot.forEach((d) => rules.push({ id: d.id, ...d.data() } as AutoAssignmentRule));
    const activeRules = rules.filter((r) => r.enabled);

    if (activeRules.length === 0) {
        console.log('⚠️ No active auto-assignment rules found');
        return 0;
    }

    // Fetch unassigned issues
    const issuesQuery = query(
        collection(db, 'civicIssues'),
        where('assignedDepartment', '==', ''),
    );
    const issuesSnapshot = await getDocs(issuesQuery);
    let assigned = 0;

    for (const docSnap of issuesSnapshot.docs) {
        const issue = { id: docSnap.id, ...docSnap.data() } as CivicIssue;
        const result = await assignIssue(docSnap.id, issue, activeRules);
        if (result) assigned++;
    }

    console.log(`🔄 Bulk auto-assign complete: ${assigned}/${issuesSnapshot.size} issues routed`);
    return assigned;
}

/**
 * Start a real-time listener that auto-assigns new unassigned issues.
 * Returns an unsubscribe function.
 */
export function startAutoAssignListener(): () => void {
    let rules: AutoAssignmentRule[] = [];

    // Listen to rules so we always have the latest
    const rulesUnsub = onSnapshot(collection(db, 'autoAssignmentRules'), (snapshot) => {
        rules = [];
        snapshot.forEach((d) => rules.push({ id: d.id, ...d.data() } as AutoAssignmentRule));
        console.log(`📋 Auto-assign rules loaded: ${rules.filter((r) => r.enabled).length} active`);
    });

    // Listen for unassigned issues
    const issuesQuery = query(
        collection(db, 'civicIssues'),
        where('assignedDepartment', '==', ''),
    );

    const issuesUnsub = onSnapshot(issuesQuery, (snapshot) => {
        const activeRules = rules.filter((r) => r.enabled);
        if (activeRules.length === 0) return;

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const issue = { id: change.doc.id, ...change.doc.data() } as CivicIssue;
                // Small delay to avoid rapid-fire on initial load
                setTimeout(async () => {
                    await assignIssue(change.doc.id, issue, activeRules);
                    // Check for duplicates
                    try {
                        const duplicates = await findDuplicates(issue);
                        const topMatch = duplicates[0];
                        if (topMatch) {
                            await flagAsDuplicate(change.doc.id, topMatch.issueId, topMatch.score);
                        }
                    } catch (err) {
                        console.error('Duplicate check failed:', err);
                    }
                    // AI image analysis
                    if (hasGeminiApiKey() && (issue.imageBase64 || issue.imageUri)) {
                        try {
                            const imageData = issue.imageBase64 || issue.imageUri || '';
                            await analyzeAndStoreResult(change.doc.id, imageData);
                        } catch (err) {
                            console.error('AI analysis failed:', err);
                        }
                    }
                }, 500);
            }
        });
    });

    console.log('🚀 Auto-assign listener started');
    return () => {
        rulesUnsub();
        issuesUnsub();
        console.log('🛑 Auto-assign listener stopped');
    };
}
