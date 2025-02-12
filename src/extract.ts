import * as fsSync from "fs"; // for synchronous operations
import { promises as fs } from "fs"; // for asynchronous operations
import * as xml2js from "xml2js";
import JSZip from "jszip";
import * as path from "path";
import type { Entry, Paragraph } from "./types";

/**
 * Extracts and returns the text content from an XML element.
 * @param item - The XML element.
 * @returns {string} The extracted text.
 */
function extractText(item: any): string {
  if (typeof item === "string") return item;
  if (typeof item === "object" && item._ !== undefined) return item._;
  if (Array.isArray(item)) return item.map(extractText).join("");
  return "";
}

/**
 * Merges adjacent text entries.
 * @param entries - Array of Entry.
 * @returns {Entry[]} Merged entries.
 */
function mergeTextEntries(entries: Entry[]): Entry[] {
  const merged: Entry[] = [];
  for (const entry of entries) {
    if (
      entry.type === "text" &&
      merged.length > 0 &&
      merged[merged.length - 1].type === "text"
    ) {
      merged[merged.length - 1].content += entry.content;
    } else {
      merged.push({ ...entry });
    }
  }
  return merged;
}

/**
 * Extracts an Entry from the given XML node.
 * @param child - XML node.
 * @returns {Entry | null} The extracted entry or null.
 */
function extractEntry(child: any): Entry | null {
  let author = child.$ && child.$["w:author"] ? child.$["w:author"] : "";
  let date = child.$ && child.$["w:date"] ? child.$["w:date"] : "";
  const tag = child["#name"];
  if (tag === "w:r") {
    let text = "";
    if (child["w:t"]) {
      text = extractText(child["w:t"]);
    } else if (child.$$) {
      child.$$.forEach((sub: any) => {
        if (sub["#name"] === "w:t") {
          text += extractText(sub);
        }
      });
    }
    if (text === "") text = " ";
    return { type: "text", content: text };
  }
  if (tag === "w:del") {
    let text = "";
    if (child.$$) {
      child.$$.forEach((delChild: any) => {
        if (delChild["#name"] === "w:r" && delChild.$$) {
          delChild.$$.forEach((sub: any) => {
            if (sub["#name"] === "w:delText") {
              text += extractText(sub);
            }
          });
        }
      });
    }
    if (text === "") text = " ";
    return { type: "deletion", content: text, author: author, date: date };
  }
  if (tag === "w:ins") {
    let text = "";
    if (child.$$) {
      child.$$.forEach((insChild: any) => {
        if (insChild["#name"] === "w:r") {
          if (insChild["w:t"]) {
            text += extractText(insChild["w:t"]);
          } else if (insChild.$$) {
            insChild.$$.forEach((sub: any) => {
              if (sub["#name"] === "w:t") {
                text += extractText(sub);
              }
            });
          }
        }
      });
    }
    if (text === "") text = " ";
    return { type: "insertion", content: text, author: author, date: date };
  }
  return null;
}

/**
 * Gets the XML content from a file.
 * @param inputPath - Path to the input file.
 * @returns {Promise<string>} The XML content.
 */
async function getXMLContent(inputPath: string): Promise<string> {
  if (inputPath.toLowerCase().endsWith(".docx")) {
    const data = await fs.readFile(inputPath);
    const zip = await JSZip.loadAsync(data);
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) {
      throw new Error("document.xml not found in the docx file");
    }
    return await documentXmlFile.async("string");
  } else {
    return await fs.readFile(inputPath, "utf-8");
  }
}

/**
 * Parses the XML content into an array of Paragraphs.
 * @param xmlContent - The XML content.
 * @returns {Promise<Paragraph[]>} Array of Paragraphs.
 */
async function parseXMLContent(xmlContent: string): Promise<Paragraph[]> {
  const parser = new xml2js.Parser({
    explicitChildren: true,
    preserveChildrenOrder: true,
    explicitArray: true,
    trim: false,
  });
  const doc = await parser.parseStringPromise(xmlContent);
  const paragraphsXML = doc["w:document"]["w:body"][0]["w:p"];
  const paragraphs: Paragraph[] = [];
  paragraphsXML.forEach((p: any) => {
    const entries: Entry[] = [];
    const children = p.$$ || [];
    children.forEach((child: any) => {
      const entry = extractEntry(child);
      if (entry) entries.push(entry);
    });
    paragraphs.push({ entries: mergeTextEntries(entries) });
  });
  return paragraphs;
}

/**
 * Saves the paragraphs into a JSON file.
 * @param paragraphs - Array of Paragraph.
 * @param outputPath - Path to the output file.
 * @returns {Promise<void>}
 */
async function saveParagraphs(paragraphs: Paragraph[], outputPath: string): Promise<void> {
  await fs.writeFile(outputPath, JSON.stringify(paragraphs, null, 2), "utf-8");
  console.log("Grouped revisions saved in " + outputPath);
}

/**
 * Reads and prints the paragraphs from a JSON file.
 * @param jsonPath - Path to the JSON file.
 * @returns {Promise<void>}
 */
async function printParagraphsFromFile(jsonPath: string): Promise<void> {
  const data = await fs.readFile(jsonPath, "utf-8");
  const paragraphs: Paragraph[] = JSON.parse(data);
  paragraphs.forEach((paragraph, index) => {
    const content = paragraph.entries
      .filter((e) => e.type === "text" || e.type === "insertion")
      .map((e) => e.content)
      .join("");
    console.log(`Paragraph ${index + 1}: ${content}`);
  });
}

async function main() {
  try {
    const inputPath = process.argv[2] || "";
    const outputDir = path.join(__dirname, '../outputs');
    
    // Utiliser fsSync pour les méthodes synchrones
    if (!fsSync.existsSync(outputDir)) {
      fsSync.mkdirSync(outputDir, { recursive: true });
    }

    const xmlContent = await getXMLContent(inputPath);
    const paragraphs = await parseXMLContent(xmlContent);
    const outputPath = path.join(outputDir, "revisions_grouped.json");
    await saveParagraphs(paragraphs, outputPath);
    await printParagraphsFromFile(outputPath);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch((error) => console.error("Error:", error));