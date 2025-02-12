import * as fs from "fs";
import * as fsSync from "fs"; // for synchronous operations
import * as path from "path";
import type { CorrectionItem } from "./types";
import { OUTPUT_DIR, DATASET_FILE, CLASSIFIED_DATASET_FILE } from "./constants";
import OpenAI from "openai";


// Create the output directory if it does not exist
if (!fsSync.existsSync(OUTPUT_DIR)) {
  fsSync.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const openai = new OpenAI();

const DATASET_FILE_PATH = path.join(OUTPUT_DIR, DATASET_FILE);
const OUTPUT_FILE = path.join(OUTPUT_DIR, CLASSIFIED_DATASET_FILE);

/**
 * Builds a prompt for the OpenAI API.
 * @param original - The original text.
 * @param correction - The corrected text.
 * @returns {string} The prompt string.
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
 * Sends the prompt to OpenAI API for classification.
 * @param original - Original text.
 * @param correction - Corrected text.
 * @returns {Promise<{ error_type: string; explanation: string }>} Classification result.
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
    const jsonStart = output?.indexOf('{') ?? -1;
    const jsonEnd = output?.lastIndexOf('}') ?? -1;
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON portion found in the response.");
    }
    const jsonString = output?.substring(jsonStart, jsonEnd + 1) ?? "";
    const classification = JSON.parse(jsonString);
    if (classification.error_type && classification.explanation) {
      return {
        error_type: classification.error_type,
        explanation: classification.explanation,
      };
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error("Error classifying correction:", error);
    return {
      error_type: "unknown",
      explanation: "Unable to classify correction.",
    };
  }
}

/**
 * Processes the dataset for classification.
 */
async function classifyDataset() {
  const lines = fs
    .readFileSync(DATASET_FILE_PATH, { encoding: "utf8" })
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
      console.error("Error processing line:", e);
    }
  }

  outputStream.end(() => {
    console.log(`Classified dataset written to ${OUTPUT_FILE}`);
  });
}

classifyDataset();