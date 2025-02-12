import * as fs from "fs";
import OpenAI from "openai";
import * as path from "path";


interface CorrectionItem {
    original: string;
    correction: string;
    error_type?: string;
    explanation?: string;
}

const DATASET_FILE = path.join(__dirname, "dataset.jsonl");
const OUTPUT_FILE = path.join(__dirname, "dataset_classified.jsonl");

// // Configure OpenAI avec la clé API (assurez-vous de la définir dans votre environnement)
// const configuration = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
// });
const openai = new OpenAI();

/**
 * Construit le prompt pour OpenAI en demandant strictement une réponse JSON.
 */
function buildPrompt(original: string, correction: string): string {
    return `Compare the following two texts and determine what changes have been made and why. Focus only on the differences between the "Original" and "Corrected" texts, then select one error type from the list below and provide a brief explanation.

Original: "${original}"
Corrected: "${correction}"

Instructions:
1. Identify the specific parts where the texts differ.
2. Deduce which errors have been corrected (e.g., missing accent, incorrect punctuation, verb conjugation mistake, etc.).
3. Choose one error type from the following:
   - Spelling (e.g., accents, homophones)
   - Grammar (e.g., verb conjugation, auxiliary usage, gender/number agreement)
   - Syntax (word order)
   - Lexical (false friends)
   - Punctuation
4. Respond exactly with a JSON object containing two keys:
   "error_type": a string that describes the error type,
   "explanation": a brief explanation of what was corrected and why.

Examples:
Example 1:
Original: "lano"
Corrected: "l'anno"
Output JSON: {"error_type": "Spelling (homophones)", "explanation": "The correction adds the missing apostrophe, resolving a homophone error."}

Example 2:
Original: "Egli ha andato"
Corrected: "Egli è andato"
Output JSON: {"error_type": "Grammar (auxiliary)", "explanation": "The correction replaces 'ha' with 'è' because 'andato' requires the auxiliary 'essere'."}

Now, please produce the JSON object for the provided texts.`;
}

/**
 * Utilise l'API OpenAI pour classifier une correction.
 */
async function classifyCorrection(original: string, correction: string): Promise<{ error_type: string; explanation: string }> {
    const prompt = buildPrompt(original, correction);
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });
        const output = response.choices[0].message.content;
        // Tentative de trouver une portion JSON dans la réponse.
        const jsonStart = output?.indexOf('{') ?? -1;
        const jsonEnd = output?.lastIndexOf('}') ?? -1;
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("Aucune portion JSON trouvée dans la réponse.");
        }
        const jsonString = output?.substring(jsonStart, jsonEnd + 1) ?? "";
        const classification = JSON.parse(jsonString);
        if (classification.error_type && classification.explanation) {
            return {
                error_type: classification.error_type,
                explanation: classification.explanation,
            };
        } else {
            throw new Error("Format de réponse invalide");
        }
    } catch (error) {
        console.error("Error classifying correction:", error);
        return {
            error_type: "unknown",
            explanation: "Unable to classify correction.",
        };
    }
}

async function classifyDataset() {
    const lines = fs
        .readFileSync(DATASET_FILE, { encoding: "utf8" })
        .split("\n")
        .filter((line) => line.trim() !== "");
    const outputStream = fs.createWriteStream(OUTPUT_FILE, { encoding: "utf8" });

    for (const line of lines) {
        try {
            const item: CorrectionItem = JSON.parse(line);
            const classification = await classifyCorrection(item.original, item.correction);
            const newItem = {
                original: item.original,
                corrected: item.correction,
                error_type: classification.error_type,
                explanation: classification.explanation,
            };
            outputStream.write(JSON.stringify(newItem) + "\n");
        } catch (e) {
            console.error("Erreur lors du traitement d'une ligne:", e);
        }
    }

    outputStream.end(() => {
        console.log(`Dataset classifié écrit dans ${OUTPUT_FILE}`);
    });
}

classifyDataset();