import {
    collection, getDocs, query, where, updateDoc, doc, serverTimestamp,
    addDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { CivicIssue } from '../types';

// ─── Haversine Distance ──────────────────────────────────────────────────────

/** Returns distance in meters between two lat/lng points */
export function haversineDistance(
    lat1: number, lon1: number, lat2: number, lon2: number,
): number {
    const R = 6_371_000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROXIMITY_THRESHOLD_METERS = 100;    // Issues within 100m
const TIME_WINDOW_DAYS = 7;                // Created within 7 days of each other
const MIN_DUPLICATE_SCORE = 0.6;           // Minimum score to flag as duplicate

// ─── Duplicate Detection ─────────────────────────────────────────────────────

export interface DuplicateMatch {
    issueId: string;
    title: string;
    score: number;       // 0.0 to 1.0
    distance: number;    // meters
    category: string;
}

/**
 * Find potential duplicates of the given issue among recent open issues.
 *
 * Scoring:
 * - Same category:               +0.4
 * - Location within 100m:        +0.3
 * - Similar title (word overlap): +0.3
 *
 * Only issues with score >= 0.6 are returned.
 */
export async function findDuplicates(issue: CivicIssue): Promise<DuplicateMatch[]> {
    // Must have location to detect geo-duplicates
    if (!issue.location?.latitude || !issue.location?.longitude) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TIME_WINDOW_DAYS);

    // Fetch recent non-resolved issues
    const issuesQuery = query(
        collection(db, 'civicIssues'),
        where('status', 'in', ['Open', 'In Progress']),
    );
    const snapshot = await getDocs(issuesQuery);

    const matches: DuplicateMatch[] = [];
    const issueWords = new Set(issue.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

    snapshot.forEach((docSnap) => {
        if (docSnap.id === issue.id) return; // Skip self

        const other = docSnap.data() as CivicIssue;
        if (!other.location?.latitude || !other.location?.longitude) return;

        // Check time window
        const otherDate = other.reportedAt instanceof Timestamp
            ? other.reportedAt.toDate()
            : new Date(other.reportedAt as string | number);
        if (otherDate < cutoffDate) return;

        // Calculate score
        let score = 0;
        const distance = haversineDistance(
            issue.location!.latitude, issue.location!.longitude,
            other.location.latitude, other.location.longitude,
        );

        // Category match
        if (issue.category?.toLowerCase() === other.category?.toLowerCase()) {
            score += 0.4;
        }

        // Proximity
        if (distance <= PROXIMITY_THRESHOLD_METERS) {
            score += 0.3 * (1 - distance / PROXIMITY_THRESHOLD_METERS); // Closer = higher score
        }

        // Title similarity (word overlap)
        const otherWords = new Set(
            (other.title ?? '').toLowerCase().split(/\s+/).filter((w) => w.length > 2),
        );
        const intersection = [...issueWords].filter((w) => otherWords.has(w));
        const union = new Set([...issueWords, ...otherWords]);
        if (union.size > 0) {
            score += 0.3 * (intersection.length / union.size);
        }

        if (score >= MIN_DUPLICATE_SCORE) {
            matches.push({
                issueId: docSnap.id,
                title: other.title ?? '',
                score: Math.round(score * 100) / 100,
                distance: Math.round(distance),
                category: other.category ?? '',
            });
        }
    });

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
}

/**
 * Flag an issue as a potential duplicate in Firestore.
 */
export async function flagAsDuplicate(
    issueId: string,
    duplicateOfId: string,
    score: number,
): Promise<void> {
    await updateDoc(doc(db, 'civicIssues', issueId), {
        duplicateOfId,
        duplicateScore: score,
        lastUpdated: serverTimestamp(),
    });

    // Log as comment
    await addDoc(collection(db, 'civicIssues', issueId, 'comments'), {
        text: `⚠️ Possible duplicate detected (${Math.round(score * 100)}% match). Original issue ID: ${duplicateOfId}`,
        author: 'System',
        authorEmail: 'duplicate-detection@system',
        type: 'assignment',
        createdAt: serverTimestamp(),
    });

    console.log(`🔁 Flagged issue ${issueId} as potential duplicate of ${duplicateOfId} (score: ${score})`);
}

/**
 * Clear duplicate flag from an issue (admin decides it's not a duplicate).
 */
export async function clearDuplicateFlag(issueId: string): Promise<void> {
    await updateDoc(doc(db, 'civicIssues', issueId), {
        duplicateOfId: null,
        duplicateScore: null,
        lastUpdated: serverTimestamp(),
    });
}
