import * as fs from "fs";
import * as path from "path";

interface Entry {
    type: string;
    content: string;
    author?: string;
    date?: string;
}

interface Group {
    entries: Entry[];
}

interface Segment {
    kind: "text" | "change";
    // Pour "text": content est le fragment textuel complet.
    // Pour "change": content est l'entrée de changement.
    content: string | Entry;
}

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
 * Regroupe les changements consécutifs.
 * Pour la version "original", on concatène les contenus en deletion.
 * Pour la version "correction", on concatène les contenus en insertion.
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

// Extrait les 4 derniers mots du texte
function extractTailWords(text: string, count: number = 4): string {
    const words = text.split(/\s+/);
    return words.slice(Math.max(words.length - count, 0)).join(" ");
}

// Extrait les 4 premiers mots du texte
function extractHeadWords(text: string, count: number = 4): string {
    const words = text.split(/\s+/);
    return words.slice(0, count).join(" ");
}

function processGroup(entries: Entry[]): { original: string; correction: string }[] {
    const dataset: { original: string; correction: string }[] = [];
    const segments = buildSegments(entries);

    let i = 0;
    while (i < segments.length) {
        if (segments[i].kind === "change") {
            // Récupération de tous les changements consécutifs.
            const changeGroup: Entry[] = [];
            while (i < segments.length && segments[i].kind === "change") {
                changeGroup.push(segments[i].content as Entry);
                i++;
            }
            // Identifier le segment textuel précédent et suivant (s'ils existent).
            const prevText = (i - changeGroup.length - 1) >= 0 && segments[i - changeGroup.length - 1].kind === "text"
                ? segments[i - changeGroup.length - 1].content as string
                : "";
            const nextText = i < segments.length && segments[i].kind === "text"
                ? segments[i].content as string
                : "";
            
            const { originalChange, correctionChange } = processChangeGroup(changeGroup);

            // Extraire 4 mots de contexte avant et après la zone d'erreur.
            const contextPrev = extractTailWords(prevText);
            const contextNext = extractHeadWords(nextText);
            
            const originalFull = (contextPrev + "" + originalChange + "" + contextNext);
            const correctionFull = (contextPrev + "" + correctionChange + "" + contextNext);

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

function main() {
    const inputFile = path.join(__dirname, "revisions_grouped.json");
    const outputFile = path.join(__dirname, "dataset.jsonl");

    const rawData = fs.readFileSync(inputFile, { encoding: "utf8" });
    let groups: Group[];
    try {
        groups = JSON.parse(rawData);
    } catch (error) {
        console.error("Erreur lors du parsing du JSON:", error);
        return;
    }

    const dataset: { original: string; correction: string }[] = [];
    for (const group of groups) {
        if (group.entries && group.entries.length > 0) {
            const changes = processGroup(group.entries);
            for (const change of changes) {
                // Garder uniquement les corrections non vides.
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
        console.log(`Dataset extrait dans le fichier ${outputFile}`);
    });
}

main();