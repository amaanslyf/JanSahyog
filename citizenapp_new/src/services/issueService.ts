import { db } from '../hooks/useFirebase';
import {
    doc,
    runTransaction,
    updateDoc,
    arrayUnion,
    arrayRemove,
    increment
} from 'firebase/firestore';

/**
 * Service for handling issue-related operations like upvoting.
 */
export const issueService = {
    /**
     * Toggles an upvote for an issue by a specific user.
     * Uses a transaction to ensure atomic updates to the upvote count and voter list.
     */
    toggleUpvote: async (issueId: string, userId: string): Promise<{ success: boolean; upvoted: boolean; error?: string }> => {
        const issueRef = doc(db, 'civicIssues', issueId);

        try {
            return await runTransaction(db, async (transaction) => {
                const issueDoc = await transaction.get(issueRef);
                if (!issueDoc.exists()) {
                    throw new Error("Issue does not exist!");
                }

                const data = issueDoc.data();
                const upvotedBy = data.upvotedBy || [];
                const isUpvoted = upvotedBy.includes(userId);

                if (isUpvoted) {
                    // Remove upvote
                    transaction.update(issueRef, {
                        upvotedBy: arrayRemove(userId),
                        upvotes: increment(-1)
                    });
                    return { success: true, upvoted: false };
                } else {
                    // Add upvote
                    transaction.update(issueRef, {
                        upvotedBy: arrayUnion(userId),
                        upvotes: increment(1)
                    });
                    return { success: true, upvoted: true };
                }
            });
        } catch (error: any) {
            console.error('Error toggling upvote:', error);
            return { success: false, upvoted: false, error: error.message };
        }
    }
};
