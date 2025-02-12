/**
 * Represents a text entry or a revision.
 */
export interface Entry {
  type: "text" | "insertion" | "deletion";
  content: string;
  author?: string;
  date?: string;
}

/**
 * Represents a paragraph made of multiple entries.
 */
export interface Paragraph {
  entries: Entry[];
}

/**
 * Represents a group of entries.
 */
export interface Group {
  entries: Entry[];
}

/**
 * Represents a segment created when processing entries.
 */
export interface Segment {
  kind: "text" | "change";
  content: string | Entry;
}

/**
 * Represents a correction item for classification.
 */
export interface CorrectionItem {
  original: string;
  correction: string;
  error_type?: string;
  explanation?: string;
}
