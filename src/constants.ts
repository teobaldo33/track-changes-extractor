import * as path from "path";

/**
 * The directory where output files are stored.
 */
export const OUTPUT_DIR = path.join(__dirname, '../outputs');

/**
 * The name of the revisions grouped file.
 */
export const REVISIONS_FILE = "revisions_grouped.json";

/**
 * The name of the dataset file.
 */
export const DATASET_FILE = "dataset.jsonl";

/**
 * The name of the classified dataset file.
 */
export const CLASSIFIED_DATASET_FILE = "dataset_classified.jsonl";
