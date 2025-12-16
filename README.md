# H5P Generation API

This Node.js project provides an API to generate H5P content modules programmatically, either by providing direct parameters or by using AI (OpenAI) to generate the content.

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment (Optional)**:
    To use the AI generation feature, you must set your OpenAI API key:
    ```bash
    export OPENAI_API_KEY="sk-..."
    ```

3.  **Start the server**:
    ```bash
    node server.js
    ```
    The server runs on port 3000.

## Features

- **Dynamic H5P Generation**: Generates `h5p.json` and `content.json` automatically.
- **Dependency Resolution**: Recursively resolves libraries from the `libraries/` directory.
- **AI Integration**: Generates content based on a topic using ChatGPT (requires API key).
- **French Language Support**: Default language is set to French (`fr`).

## API Usage

### 1. Generate H5P Content (Manual)

**Endpoint**: `POST /api/h5p/generate`

**Body**:
```json
{
  "library": "H5P.QuestionSet 1.20",
  "params": {
    "questions": [ ... ]
  }
}
```

### 2. Generate H5P Content (AI)

**Endpoint**: `POST /api/h5p/generate-ai`

**Body**:
```json
{
  "library": "H5P.MultiChoice 1.16",
  "topic": "Les capitales européennes",
  "count": 5
}
```

**Response**:
```json
{
  "success": true,
  "path": "/var/www/html/my_first_h5p_environment/content/1765753404276",
  "id": "1765753404276",
  "aiParams": { ... }
}
```

## Scripts

### Generate Examples
To generate examples for all supported H5P types (including Interactive Book, Timeline, etc.):

```bash
node generate_examples.js
```

This script will create timestamped folders in the `content/` directory for each example.

## Supported Libraries

The system currently supports generation for:
- H5P.Blanks 1.14
- H5P.Column 1.18
- H5P.CoursePresentation 1.26
- H5P.Dialogcards 1.9
- H5P.DragQuestion 1.14
- H5P.DragText 1.10
- H5P.Essay 1.5
- H5P.Flashcards 1.7
- H5P.GuessTheAnswer 1.5
- H5P.IFrameEmbed 1.0
- H5P.InteractiveBook 1.11
- H5P.MemoryGame 1.3
- H5P.MultiChoice 1.16
- H5P.QuestionSet 1.20
- H5P.Questionnaire 1.3
- H5P.SortParagraphs 0.11
- H5P.SpeakTheWordsSet 1.3
- H5P.Summary 1.10
- H5P.Timeline 1.1
- H5P.TrueFalse 1.8

### 3. Generate LearningApps Content (Manual)

**Endpoint**: `POST /api/content/learningapps`

**Body**:
```json
{
  "module": "Qcm",
  "title": "My Quiz",
  "params": {
    "task": "Select the correct answer",
    "questions": [
      {
        "question_text": "What is 2+2?",
        "answers": [
          { "answer_text": "4", "is_correct": true },
          { "answer_text": "3", "is_correct": false }
        ]
      }
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "iframeUrl": "https://learningapps.org/watch?v=...",
  "embedCode": "<iframe ...></iframe>",
  "appId": "..."
}
```

### 4. Generate LearningApps Content (AI)

**Endpoint**: `POST /api/content/learningapps/ai`

**Body**:
```json
{
  "module": "Qcm",
  "topic": "Mathématiques",
  "count": 5
}
```

**Response**:
```json
{
  "success": true,
  "iframeUrl": "https://learningapps.org/watch?v=...",
  "aiParams": { ... }
}
```

## LearningApps Automation

### Fixes Implemented
- **Content Type Selection**: Fixed an issue where text/image inputs were not appearing because the type selection button was not clicked correctly. This affected:
    - Ordering
    - HorseRace
    - Pairmatching
    - TimelineAxis
    - FillTable
    - Grouping
    - WriteAnswerCards
- **Robustness**: Added explicit waits for input fields to appear after selection.

### Known Issues
- `TextInputQuiz`, `ImagePlacement`, and `SortingPuzzle` are currently failing and require further investigation.

### 5. View Learning Path (Parcours)

**Endpoint**: `GET /parcours`

**Query Parameters**:
- `modules`: A comma-separated list of modules to display in the Reveal.js presentation.
  - Format: `type:id`
  - Types: `h5p`, `learningapps`

**Example URL**:
```
http://localhost:3000/parcours?modules=learningapps:p2i7qp7k325,h5p:1765754437885
```

**Features**:
- Displays modules as slides in a Reveal.js presentation.
- **H5P**: Embeds H5P content using the external server (port 8080).
- **LearningApps**: Embeds LearningApps content using the official viewer.
- **Mobile Friendly**: Full-screen responsive design.
