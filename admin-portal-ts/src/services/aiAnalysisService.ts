import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIAnalysisResult {
    suggestedCategory: string;
    confidence: number;       // 0.0 to 1.0
    description: string;      // AI-generated description of the image
    severity: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];           // detected elements (e.g., "pothole", "standing water")
}

// ─── Configuration ───────────────────────────────────────────────────────────

// Store API key in localStorage for now — admin can set it in settings
const GEMINI_API_KEY_STORAGE = 'jansahyog_gemini_api_key';

export function setGeminiApiKey(key: string): void {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
}

export function getGeminiApiKey(): string | null {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE);
}

export function hasGeminiApiKey(): boolean {
    return !!getGeminiApiKey();
}

// ─── Known Categories ────────────────────────────────────────────────────────

const CATEGORIES = ['Garbage', 'Water Leak', 'Roads', 'Streetlight', 'Pollution', 'Other'];

const CATEGORY_MAP: Record<string, string> = {
    garbage: 'Garbage', trash: 'Garbage', waste: 'Garbage', litter: 'Garbage', dump: 'Garbage',
    water: 'Water Leak', leak: 'Water Leak', flooding: 'Water Leak', sewage: 'Water Leak', drain: 'Water Leak',
    road: 'Roads', pothole: 'Roads', crack: 'Roads', pavement: 'Roads', asphalt: 'Roads',
    light: 'Streetlight', streetlight: 'Streetlight', lamp: 'Streetlight', pole: 'Streetlight',
    pollution: 'Pollution', smoke: 'Pollution', air: 'Pollution', dust: 'Pollution',
};

// ─── AI Analysis ─────────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are a civic issue classifier for a city complaint system. Analyze this image of a civic issue and respond ONLY with a valid JSON object (no markdown, no code fences).

Categories: ${CATEGORIES.join(', ')}

Respond with this exact JSON structure:
{"suggestedCategory":"<one of the categories>","confidence":0.85,"description":"<one sentence describing the issue>","severity":"<low|medium|high|critical>","tags":["tag1","tag2"]}

Rules:
- confidence should be between 0.0 and 1.0
- severity: low (minor inconvenience), medium (needs attention), high (safety concern), critical (immediate danger)
- tags: 2-5 keywords describing what you see
- If unsure about category, use "Other" with lower confidence`;

/**
 * Analyze an issue image using Google Gemini API (free tier).
 */
export async function analyzeIssueImage(base64Image: string): Promise<AIAnalysisResult> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key not configured. Go to Settings to add it.');
    }

    // Strip data URI prefix if present
    const rawBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: ANALYSIS_PROMPT },
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: rawBase64,
                        },
                    },
                ],
            }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 300,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API error:', error);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse the JSON response
    try {
        // Clean up the response — remove markdown fences if any
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned) as AIAnalysisResult;

        // Validate and normalize the category
        if (!CATEGORIES.includes(parsed.suggestedCategory)) {
            // Try fuzzy matching
            const lower = parsed.suggestedCategory.toLowerCase();
            parsed.suggestedCategory = CATEGORY_MAP[lower] ?? 'Other';
        }

        // Clamp confidence
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

        return parsed;
    } catch (parseError) {
        console.error('Failed to parse Gemini response:', text);
        // Return a fallback
        return {
            suggestedCategory: 'Other',
            confidence: 0,
            description: 'AI analysis could not parse the image',
            severity: 'medium',
            tags: [],
        };
    }
}

/**
 * Analyze and store AI results on the issue document in Firestore.
 */
export async function analyzeAndStoreResult(issueId: string, base64Image: string): Promise<AIAnalysisResult> {
    const result = await analyzeIssueImage(base64Image);

    await updateDoc(doc(db, 'civicIssues', issueId), {
        aiAnalysis: {
            suggestedCategory: result.suggestedCategory,
            confidence: result.confidence,
            description: result.description,
            severity: result.severity,
            tags: result.tags,
            analyzedAt: new Date().toISOString(),
        },
        lastUpdated: serverTimestamp(),
    });

    console.log(`AI analyzed issue ${issueId}: ${result.suggestedCategory} (${Math.round(result.confidence * 100)}%)`);
    return result;
}
