# Track Changes Extractor

This application extracts revisions (insertions, deletions, and regular text) from a Microsoft Word XML file and groups them by paragraph. It then saves the grouped revisions into a JSON file and prints the original text for each paragraph by concatenating consecutive text and insertion entries.

## Features

- Parses a Word document saved as XML.
- Extracts and groups revisions by paragraph.
- Merges consecutive text entries.
- Saves the processed data into a JSON file.
- Prints the reconstructed paragraph text to the console.

## Installation

To install dependencies, run:

```bash
bun install
bun start
