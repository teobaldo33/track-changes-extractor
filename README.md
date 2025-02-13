# Track Changes Extractor 🚀

A little tool to extract and process revisions from Microsoft Word documents, designed to build a dataset for fine-tuning language models. ✨

## Table of Contents 📚

- [Track Changes Extractor 🚀](#track-changes-extractor-)
  - [Table of Contents 📚](#table-of-contents-)
  - [Overview 🔍](#overview-)
  - [Installation 💻](#installation-)
  - [Configuration ⚙️](#configuration-️)
  - [Usage ▶️](#usage-️)
  - [Contributing 🤝](#contributing-)

## Overview 🔍

Track Changes Extractor parses `.docx` files to extract revisions (insertions and deletions) and groups them by paragraph.
It then creates a dataset with this format : 

```json
{
	"original":"È il punto crittico delle donne, di",
	"correction":"È il punto critico delle donne, di"
}
```

Finally it classifies the corrections : 
```json
{
	"original":"È il punto crittico delle donne, di",
	"corrected":"È il punto critico delle donne, di",
	"error_type":"Spelling",
	"explanation":"The correction fixes the misspelling of 'critico', which was originally written as 'crittico' with an extra 't'."
}
```


## Installation 💻

1. Clone the repository:

   ```bash
   git clone <REPOSITORY_URL>
   cd track-changes-extractor
   ```

2. Install dependencies using [Bun](https://bun.sh/):

   ```bash
   bun install
   ```

## Configuration ⚙️

To fully utilize all features (including classification via the OpenAI GPT-4 model), set the following environment variable:

```bash
# On Linux/macOS
export OPENAI_API_KEY=your_api_key

# On Windows (Cmd)
set OPENAI_API_KEY=your_api_key

# On Windows (PowerShell)
$env:OPENAI_API_KEY="your_api_key"
```

## Usage ▶️

To extract revisions from a Microsoft Word file, run:

```bash
bun extract path_to_your_file.docx
```

To generate the corrections dataset from the grouped revisions file, run:

```bash
bun dataset
```

To classify the dataset with then OpenAI API

```bash
bun classify
```

Generated files will be saved in the `outputs` folder. 📂

## Contributing 🤝

Contributions are welcome!  

1. Fork the repository  
2. Create your feature branch (`git checkout -b feature/YourFeature`)  
3. Commit your changes (`git commit -m 'Add some feature'`)  
4. Push your branch (`git push origin feature/YourFeature`)  
5. Open a Pull Request  

Feel free to open issues or suggest improvements. We're all in this together! 👍
