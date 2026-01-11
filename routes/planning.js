const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');
const { H5PGenerator } = require('./h5pGenerator');
const h5pGenerator = new H5PGenerator();

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

router.post('/', async (req, res) => {
    try {
        const { request, count, classroom, subject, chapter, subChapter, type, contexte, lang, forceGeneratePath } = req.body;
        const level = classroom || req.body.level;

        if (!request) {
            return res.status(400).json({ error: 'The "request" parameter is mandatory' });
        }

        if (!openai) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        const h5pLibraries = [
            "H5P.MultiChoice 1.16", "H5P.TrueFalse 1.8", "H5P.DragQuestion 1.14", "H5P.Blanks 1.12",
            "H5P.MarkTheWords 1.11", "H5P.Flashcards 1.5",
            "H5P.QuestionSet 1.20", "H5P.SingleChoiceSet 1.11",
            "H5P.DragText 1.10"
        ];

        const learningAppsModules = [
            "Qcm", "Fillblanks", "Grouping", "Hangman", "HorseRace", "Millionaire",
            "Ordering", "Pairmatching", "WriteAnswerCards", "TextInputQuiz"
        ];

        const moduleCount = count || "4 to 6";

        const prompt = `
        IMPORTANT: Your primary goal is to CREATE a professional pedagogical structure based on the user's specific REQUEST. 
        Detect the language of the REQUEST (support English, French, and Arabic) and generate the entire response in THAT SAME LANGUAGE.
        
        TARGET AUDIENCE (Default): Your default audience is STUDENTS in Primary, Middle, or High School. 
        Adapt the tone, complexity, and pedagogical depth accordingly.
        
        STRICT RULES:
        1. YOU MUST REDEFINE the Pedagogical Metadata (Subject, Chapter, SubChapter, and Level) based on the REQUEST.
        2. FORBIDDEN: Do not copy the user's optional input directly. You must transform them into professional, precise, and descriptive academic titles.
        3. If optional inputs are missing, deduce them entirely from the REQUEST.
        
        CORE USER REQUEST: "${request}"
        
        Optional Supporting Info:
        - Provided Level: ${level || 'Not provided'}
        - Provided Subject: ${subject || 'Not provided'}
        - Provided Chapter: ${chapter || 'Not provided'}
        - Provided SubChapter: ${subChapter || 'Not provided'}
        - Activity Type: ${type || 'Not provided'}
        - Specific Context: ${contexte || 'Not provided'}

        The output MUST be a JSON object with this exact structure:
        {
            "title": "Title of the study plan in the same language as the request",
            "modules": [
                {
                    "type": "h5p",
                    "library": "Choose from: ${h5pLibraries.join(', ')}",
                    "title": "Professional Module Title",
                    "prompt": "Detailed AI prompt to generate content in the request language",
                    "difficulty": "easy/medium/hard",
                    "category": "course/exercise/exam"
                },
                {
                    "type": "learningapps",
                    "module": "Choose from: ${learningAppsModules.join(', ')}",
                    "title": "Professional Module Title",
                    "prompt": "Detailed AI prompt to generate content in the request language",
                    "difficulty": "easy/medium/hard",
                    "category": "course/exercise/exam"
                }
            ],
            "contexte": {
                "subject": "YOUR REDEFINED PROFESSIONAL SUBJECT",
                "chapter": "YOUR REDEFINED PROFESSIONAL CHAPTER",
                "subChapter": "YOUR REDEFINED PROFESSIONAL SUB-CHAPTER",
                "level": "YOUR REDEFINED PROFESSIONAL LEVEL",
                "lang": "detected language code ('fr', 'en', or 'ar')"
            }
        }

        Rules:
        - Propose exactly ${moduleCount} modules.
        - Mix H5P and LearningApps appropriately.
        - Use "gpt-4o-mini" capabilities for deep pedagogical relevance.
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        let result = JSON.parse(content);

        // Ensure metadata is filled, prioritizing AI's REDEFINED values
        result.contexte = {
            subject: result.contexte?.subject || subject || "General",
            chapter: result.contexte?.chapter || chapter || "Introduction",
            subChapter: result.contexte?.subChapter || subChapter || "Overview",
            level: result.contexte?.level || level || "General",
            lang: result.contexte?.lang || lang || "fr"
        };

        if (forceGeneratePath) {
            console.log("🛠 Force generating path content...");
            const generatedModules = [];
            for (const module of result.modules) {
                console.log(`  Generating module: ${module.title} (${module.type})`);
                if (module.type === 'h5p') {
                    try {
                        const h5pResult = await h5pGenerator.generateAI(openai, module.library, module.prompt, 1);
                        if (h5pResult.success && h5pResult.results.length > 0) {
                            generatedModules.push({
                                type: 'h5p',
                                id: h5pResult.results[0].id,
                                title: module.title
                            });
                        }
                    } catch (e) {
                        console.error(`Error generating H5P module ${module.title}:`, e);
                    }
                } else if (module.type === 'learningapps') {
                    try {
                        const laBaseUrl = process.env.LEARNINGAPPS_API_URL || 'http://localhost:3001';
                        // Use module.prompt as topic for LearningApps AI generation
                        const laResponse = await axios.post(`${laBaseUrl}/api/content/learningapps/ai`, {
                            module: module.module,
                            topic: module.prompt,
                            count: 1
                        });

                        if (laResponse.data.success && laResponse.data.results && laResponse.data.results.length > 0) {
                            const laResult = laResponse.data.results[0];
                            generatedModules.push({
                                type: 'learningapps',
                                id: laResult.appId,
                                title: module.title
                            });
                        }
                    } catch (e) {
                        console.error(`Error generating LearningApps module ${module.title}:`, e);
                    }
                }
            }

            if (generatedModules.length > 0) {
                // Generate Parcours (Interactive Book)
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                const bookResult = await h5pGenerator.generateInteractiveBook(generatedModules, baseUrl, result.title);

                result.parcours = {
                    id: bookResult.id,
                    url: bookResult.url,
                    type: 'interactivebook',
                    modules: generatedModules
                };
            }
        }

        res.json(result);

    } catch (err) {
        console.error('Planning Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
