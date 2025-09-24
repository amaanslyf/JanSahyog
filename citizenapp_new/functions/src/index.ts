import {onRequest} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import cors from "cors";

import {ImageAnnotatorClient} from "@google-cloud/vision";
import {LanguageServiceClient} from "@google-cloud/language";

admin.initializeApp();
const corsHandler = cors({origin: true});

interface CivicIssue {
  id: string;
  [key: string]: any;
}

/**
 * An HTTP-triggered Cloud Function (v2) that fetches all documents
 * from the 'civicIssues' collection in Firestore.
 */
export const getcivicissuesapi = onRequest((request, response) => {
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
      logger.error("Error fetching civic issues:", error);
      response.status(500).send("Something went wrong.");
    }
  });
});

// --- Helper Functions for AI Analysis ---
const mapKeywordsToCategory = (text: string): string => {
  const lowerCaseText = text.toLowerCase();
  if (/\b(pothole|road|asphalt|crack)\b/.test(lowerCaseText)) return "Roads";
  if (/\b(garbage|trash|waste|dumpster|bin)\b/.test(lowerCaseText)) return "Garbage";
  if (/\b(water|leak|pipe|sewage)\b/.test(lowerCaseText)) return "Water Leak";
  if (/\b(streetlight|lamp|light pole)\b/.test(lowerCaseText)) return "Streetlight";
  if (/\b(smoke|smog|pollution)\b/.test(lowerCaseText)) return "Pollution";
  return "Other";
};

const determinePriority = (description: string, visionLabels: string[], sentimentScore: number): string => {
  const combinedText = (description + " " + visionLabels.join(" ")).toLowerCase();
  const urgentKeywords = ["fire", "fallen pole", "sparking", "accident", "emergency", "exposed wire"];
  if (urgentKeywords.some((keyword) => combinedText.includes(keyword))) {
    return "Urgent";
  }
  const highPriorityKeywords = ["blockage", "overflowing", "major leak", "no power", "broken"];
  if (highPriorityKeywords.some((keyword) => combinedText.includes(keyword))) {
    return "High";
  }
  if (sentimentScore < -0.6) return "High";
  if (sentimentScore >= -0.6 && sentimentScore < 0.2) return "Medium";
  return "Low";
};

/**
 * A Firestore-triggered Cloud Function that intelligently analyzes new complaints.
 */
export const analyzecomplainttrigger = onDocumentCreated("civicIssues/{issueId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.log("No data associated with the event");
    return;
  }
  const issueData = snapshot.data();
  const visionClient = new ImageAnnotatorClient();
  const languageClient = new LanguageServiceClient();
  const analysisResults: {[key: string]: any} = {};
  let visionLabels: string[] = [];
  let sentimentScore = 0;

  if (issueData.imageUri && issueData.imageUri.startsWith("data:image/jpeg;base64,")) {
    try {
      const base64Image = issueData.imageUri.split(";base64,").pop();
      if (base64Image) {
        const [result] = await visionClient.labelDetection({image: {content: Buffer.from(base64Image, "base64")}});
        const labels = result.labelAnnotations;
        if (labels && labels.length > 0) {
          visionLabels = labels.map((label) => label.description || "");
          analysisResults.visionLabels = visionLabels.slice(0, 5);
        }
      }
    } catch (error) {
      logger.error("Vision API Error:", error);
    }
  }

  if (issueData.description) {
    try {
      const document = { content: issueData.description, type: "PLAIN_TEXT" as const };
      const [sentimentResult] = await languageClient.analyzeSentiment({document});
      const [entityResult] = await languageClient.analyzeEntities({document});

      const sentiment = sentimentResult.documentSentiment;
      if (sentiment && sentiment.score != null) {
        sentimentScore = sentiment.score;
        analysisResults.sentimentScore = sentiment.score;
      }

      const entities = entityResult.entities;
      if (entities && entities.length > 0) {
        analysisResults.mentionedEntities = entities
          // UPDATE: Convert e.type to a string to fix the type error
          .filter((e) => ["LOCATION", "ORGANIZATION"].includes(String(e.type) || ""))
          .map((e) => e.name)
          .slice(0, 3);
      }
    } catch (error) {
      logger.error("Natural Language API Error:", error);
    }
  }

  const categoryFromImage = mapKeywordsToCategory(visionLabels.join(" "));
  const categoryFromText = mapKeywordsToCategory(issueData.description || "");
  analysisResults.category = categoryFromImage !== "Other" ? categoryFromImage : categoryFromText;
  analysisResults.priority = determinePriority(issueData.description || "", visionLabels, sentimentScore);

  if (Object.keys(analysisResults).length > 0) {
    logger.log("Updating document with smart analysis:", analysisResults);
    return snapshot.ref.update(analysisResults);
  } else {
    logger.log("No new analysis to add.");
    return null;
  }
});