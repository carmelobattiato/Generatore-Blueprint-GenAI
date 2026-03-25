# Project Overview

This is an automation project that leverages `gemini-cli` to massively generate architectural "Blueprints" (in Markdown format) for IT Infrastructure Use Cases. 

The core of the project relies on a system prompt (`agent_generatore_blueprint.md`) and a data source (`attivita_infrastrutture_TA.csv`). A bash script reads the CSV and orchestrates calls to the Gemini CLI, which in turn acts as an **Enterprise GenAI Integration Architect** to produce structured, simple, and linear AI integration strategies for each use case.

## Architecture & Technologies
- **Bash Scripts:** Used for orchestration (`generate_blueprints.sh`) and validation (`validate_blueprints.sh`).
- **Gemini CLI:** The core execution engine for generating content based on the provided System Prompt.
- **Markdown & Mermaid.js:** The output format for the blueprints, which include architectural, process, and sequence diagrams.
- **Node.js (npx):** Used by the validation script to run `markdownlint-cli` and `@mermaid-js/mermaid-cli`.

## Directory Structure
- `/` - Contains the core execution scripts, the system prompt, and the input CSV.
- `Blueprint/` - The output directory where all generated `.md` blueprints are stored.

## Building and Running

### Generating Blueprints
You can generate blueprints using the `generate_blueprints.sh` script in two modes:

1. **Range Mode** (Generates blueprints for a range of IDs in the CSV):
   ```bash
   ./generate_blueprints.sh <start_id> <end_id>
   # Example: ./generate_blueprints.sh 1 5
   ```

2. **List Mode** (Generates blueprints for a specific list of IDs):
   ```bash
   ./generate_blueprints.sh "<id1>;<id2>;..."
   # Example: ./generate_blueprints.sh "9;13;24"
   ```

### Validating Blueprints
After generation, you can validate the Markdown syntax and Mermaid.js diagrams using the `validate_blueprints.sh` script:

```bash
./validate_blueprints.sh <target_directory_or_file> [max_files_to_process]
# Example: ./validate_blueprints.sh Blueprint/
```
*Note: The validation script requires `npx` (Node.js) to be installed on the system to run the linters.*

## Development Conventions

- **Language:** The generated output and project documentation are primarily in **Italian**.
- **Blueprint Structure:** Blueprints must adhere strictly to the format defined in `agent_generatore_blueprint.md`, including specific sections like Use Case Description, Efficient Process Phases, Logical Flow, Mermaid Diagrams, and Technical Implementation Guide.
- **Mermaid.js Strict Rules:**
  - Always use `flowchart TD` (not `graph TD`).
  - Bidirectional arrows with labels (`<-->|test|`) are forbidden; use separate arrows or unidirectional arrows.
  - Text labels on arrows must always be enclosed in double quotes (e.g., `A -->|"Webhook (Salva)"| B`).
- **Simplicity:** The generated solutions emphasize atomic resolution of problems, absolute simplicity (favoring low-code/no-code or simple scripts), and familiarity (e.g., using Microsoft Teams chatbots).
