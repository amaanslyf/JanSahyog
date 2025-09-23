import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

admin.initializeApp();

const corsHandler = cors({origin: true});

interface CivicIssue {
    id: string;
    [key: string]: any;
}

/**
 * Fetches all documents from the 'civicIssues' collection in Firestore.
 */
export const getCivicIssues = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        try {
            const db = admin.firestore();

            const snapshot = await db.collection("civicIssues")
                .orderBy("lastUpdated", "desc")
                .get();

            if (snapshot.empty) {
                response.status(404).send("No civic issues found.");
                return;
            }

            const issues: CivicIssue[] = [];
            snapshot.forEach((doc) => {
                issues.push({id: doc.id, ...doc.data()});
            });

            response.status(200).json(issues);
        } catch (error) {
            console.error("Error fetching civic issues:", error);
            response.status(500).send("Something went wrong.");
        }
    });
});