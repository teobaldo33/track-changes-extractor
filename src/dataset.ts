import * as fs from "fs";
import * as path from "path";
import type { Entry, Group, Segment } from "./types";
import { OUTPUT_DIR, DATASET_FILE, REVISIONS_FILE } from "./constants";

/**
 * Builds segments from entries by merging adjacent text segments.
 * @param entries - Array of Entry.
 * @returns {Segment[]} Array of segments.
 */
function buildSegments(entries: Entry[]): Segment[] {
  const segments: Segment[] = [];
  for (const entry of entries) {
    if (entry.type === "text") {
      if (segments.length > 0 && segments[segments.length - 1].kind === "text") {
        segments[segments.length - 1].content = (segments[segments.length - 1].content as string) + entry.content;
      } else {
        segments.push({ kind: "text", content: entry.content });
      }
    } else if (entry.type === "insertion" || entry.type === "deletion") {
      segments.push({ kind: "change", content: entry });
    }
  }
  return segments;
}

/**
 * Processes a group of changes.
 * @param changeGroup - Array of change entries.
 * @returns {{ originalChange: string; correctionChange: string }} The original and corrected changes.
 */
function processChangeGroup(changeGroup: Entry[]): { originalChange: string; correctionChange: string } {
  let originalChange = "";
  let correctionChange = "";
  for (const change of changeGroup) {
    if (change.type === "deletion") {
      originalChange += change.content;
    } else if (change.type === "insertion") {
      correctionChange += change.content;
    }
  }
  return { originalChange, correctionChange };
}

/**
 * Extracts the last few words from a text.
 * @param text - The text.
 * @param count - Number of words to extract.
 * @returns {string} The tail words.
 */
function extractTailWords(text: string, count: number = 4): string {
  const words = text.split(/\s+/);
  return words.slice(Math.max(words.length - count, 0)).join(" ");
}

/**
 * Extracts the first few words from a text.
 * @param text - The text.
 * @param count - Number of words to extract.
 * @returns {string} The head words.
 */
function extractHeadWords(text: string, count: number = 4): string {
  const words = text.split(/\s+/);
  return words.slice(0, count).join(" ");
}

/**
 * Processes a group of entries to produce dataset entries.
 * @param entries - Array of Entry.
 * @returns {{ original: string; correction: string }[]} Dataset items.
 */
function processGroup(entries: Entry[]): { original: string; correction: string }[] {
  const dataset: { original: string; correction: string }[] = [];
  const segments = buildSegments(entries);

  let i = 0;
  while (i < segments.length) {
    if (segments[i].kind === "change") {
      const changeGroup: Entry[] = [];
      while (i < segments.length && segments[i].kind === "change") {
        changeGroup.push(segments[i].content as Entry);
        i++;
      }
      const prevText =
        (i - changeGroup.length - 1) >= 0 && segments[i - changeGroup.length - 1].kind === "text"
          ? (segments[i - changeGroup.length - 1].content as string)
          : "";
      const nextText =
        i < segments.length && segments[i].kind === "text"
          ? (segments[i].content as string)
          : "";

      const { originalChange, correctionChange } = processChangeGroup(changeGroup);

      const contextPrev = extractTailWords(prevText);
      const contextNext = extractHeadWords(nextText);

      const originalFull = contextPrev + originalChange + contextNext;
      const correctionFull = contextPrev + correctionChange + contextNext;

      dataset.push({
        original: originalFull,
        correction: correctionFull,
      });
    } else {
      i++;
    }
  }

  return dataset;
}

/**
 * Main function for extracting the dataset.
 */
function main() {
  // Create the output directory if it does not exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const inputFile = path.join(OUTPUT_DIR, REVISIONS_FILE);
  const outputFile = path.join(OUTPUT_DIR, DATASET_FILE);

  const rawData = fs.readFileSync(inputFile, { encoding: "utf8" });
  let groups: Group[];
  try {
    groups = JSON.parse(rawData);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return;
  }

  const dataset: { original: string; correction: string }[] = [];
  for (const group of groups) {
    if (group.entries && group.entries.length > 0) {
      const changes = processGroup(group.entries);
      for (const change of changes) {
        if (change.original || change.correction) {
          dataset.push(change);
        }
      }
    }
  }

  const stream = fs.createWriteStream(outputFile, { encoding: "utf8" });
  for (const item of dataset) {
    stream.write(JSON.stringify(item) + "\n");
  }
  stream.end(() => {
    console.log(`Dataset extracted into file ${outputFile}`);
  });
}

main();