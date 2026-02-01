const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

const { H5PGenerator } = require('./services/h5pGenerator');
const h5pGenerator = new H5PGenerator();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const OpenAI = require('openai');
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Library Version Mapping
const LIBRARY_MAPPING = {
    // Short names
    "qcm": "H5P.MultiChoice 1.16",
    "multichoice": "H5P.MultiChoice 1.16",
    "fals": "H5P.TrueFalse 1.8", // typo tolerance or standard
    "vrai-faux": "H5P.TrueFalse 1.8",
    "truefalse": "H5P.TrueFalse 1.8",
    "trous": "H5P.Blanks 1.14",
    "blanks": "H5P.Blanks 1.14",
    "fillblanks": "H5P.Blanks 1.14",
    "images": "H5P.ImageSlider 1.1",
    "imageslider": "H5P.ImageSlider 1.1",
    "accordeon": "H5P.Accordion 1.0",
    "accordion": "H5P.Accordion 1.0",
    "essay": "H5P.Essay 1.5",
    "dissertation": "H5P.Essay 1.5",
    "markthewords": "H5P.MarkTheWords 1.11",
    "surligner": "H5P.MarkTheWords 1.11",
    "dragtext": "H5P.DragText 1.10",
    "glisser": "H5P.DragText 1.10",
    "dialogcards": "H5P.Dialogcards 1.9",
    "cartes": "H5P.Dialogcards 1.9",
    "summary": "H5P.Summary 1.10",
    "resume": "H5P.Summary 1.10",
    "timeline": "H5P.Timeline 1.1",
    "frise": "H5P.Timeline 1.1",
    "guesstheanswer": "H5P.GuessTheAnswer 1.5",
    "devinette": "H5P.GuessTheAnswer 1.5",
    "questionset": "H5P.QuestionSet 1.20",
    "quiz": "H5P.QuestionSet 1.20",
    "sortparagraphs": "H5P.SortParagraphs 0.11",
    "trierparagraphes": "H5P.SortParagraphs 0.11",
    "singlechoiceset": "H5P.SingleChoiceSet 1.11",
    "choixunique": "H5P.SingleChoiceSet 1.11",
    "speakthewordsset": "H5P.SpeakTheWordsSet 1.3",
    "parler": "H5P.SpeakTheWordsSet 1.3",
    "flashcards": "H5P.Flashcards 1.5",
    "questionnaire": "H5P.Questionnaire 1.3",
    "enquete": "H5P.Questionnaire 1.3",

    // Explicit types without version
    "h5p.multichoice": "H5P.MultiChoice 1.16",
    "h5p.truefalse": "H5P.TrueFalse 1.8",
    "h5p.blanks": "H5P.Blanks 1.14",
    "h5p.dialogcards": "H5P.Dialogcards 1.9",
    "h5p.singlechoiceset": "H5P.SingleChoiceSet 1.11",
    "h5p.summary": "H5P.Summary 1.10",
    "h5p.timeline": "H5P.Timeline 1.1",
    "h5p.iframeembed": "H5P.IFrameEmbed 1.0",
    "h5p.guesstheanswer": "H5P.GuessTheAnswer 1.5",
    "h5p.dragtext": "H5P.DragText 1.10",
    "h5p.markthewords": "H5P.MarkTheWords 1.11",
    "h5p.questionset": "H5P.QuestionSet 1.20",
    "h5p.sortparagraphs": "H5P.SortParagraphs 0.11",
    "h5p.imageslider": "H5P.ImageSlider 1.1",
    "h5p.audiorecorder": "H5P.AudioRecorder 1.0",
    "h5p.coursepresentation": "H5P.CoursePresentation 1.25",
    "h5p.essay": "H5P.Essay 1.5",
    "h5p.questionnaire": "H5P.Questionnaire 1.3",
    "h5p.flashcards": "H5P.Flashcards 1.5",
    "h5p.speakthewordsset": "H5P.SpeakTheWordsSet 1.3"
};

// -- ROUTE: POST /api/generate/h5p --
app.post('/api/generate/h5p', async (req, res) => {
    try {
        let { type, prompt, count = 1 } = req.body;

        if (!openai) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }
        if (!type || !prompt) {
            return res.status(400).json({ error: 'Missing type or prompt' });
        }

        // Resolve type
        const normalizedType = type.toLowerCase();
        const resolvedType = LIBRARY_MAPPING[normalizedType] || type;

        console.log(`Generating ${count} H5P modules of type ${resolvedType} (requested: ${type}) for: ${prompt}`);

        const result = await h5pGenerator.generateAI(openai, resolvedType, prompt, parseInt(count));

        if (!result.success) {
            return res.status(500).json({ error: 'Generation failed' });
        }

        const formatted = result.results.map(item => ({
            lien: item.url,
            id: item.id,
            titre: prompt
        }));

        res.json(formatted);

    } catch (err) {
        console.error('H5P Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// -- ROUTE: POST /api/generate/learningapps --
app.post('/api/generate/learningapps', async (req, res) => {
    try {
        const { type, prompt, count = 1 } = req.body;

        if (!type || !prompt) {
            return res.status(400).json({ error: 'Missing type or prompt' });
        }

        console.log(`Generating ${count} LearningApps modules of type ${type} for: ${prompt} (REAL MODE)`);

        // Path to the CLI script
        const scriptPath = path.resolve(__dirname, 'learningapps/generate_cli.ts');
        const cwd = path.resolve(__dirname, 'learningapps');

        // Spawn process
        const child = spawn('npx', ['tsx', scriptPath], {
            cwd: cwd,
            env: { ...process.env, PATH: process.env.PATH }
        });

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (data) => {
            stdoutData += data;
        });

        child.stderr.on('data', (data) => {
            stderrData += data;
            console.error('[CLI STDERR]', data.toString());
        });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`CLI exited with code ${code}`);
                return res.status(500).json({ error: 'Generation failed', details: stderrData });
            }

            try {
                // Parse the JSON output from the CLI
                const results = JSON.parse(stdoutData);
                res.json(results);
            } catch (e) {
                console.error('Failed to parse CLI output:', e);
                res.status(500).json({ error: 'Invalid output from generation script', details: stdoutData });
            }
        });

        // Write input to stdin
        const input = JSON.stringify({ module: type, prompt, count: parseInt(count) });
        child.stdin.write(input);
        child.stdin.end();

    } catch (err) {
        console.error('LearningApps Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`H5P Backend running on port ${PORT}`);
});
