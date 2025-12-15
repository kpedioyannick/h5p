import { Router, Request, Response } from 'express';
import { H5PGenerator } from '../services/h5pGenerator.js';
import OpenAI from 'openai';

const router = Router();
const h5pGenerator = new H5PGenerator();

// Lazy-load OpenAI client to ensure environment variables are loaded first
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
    if (openai === null && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI client initialized for H5P routes');
    }
    return openai;
}

/**
 * POST /api/h5p/generate
 * Manual H5P generation
 */
router.post('/generate', async (req: Request, res: Response) => {
    try {
        console.log('Received H5P generation request');
        const { library, params } = req.body;
        const result = await h5pGenerator.generate(library, params);
        res.json({ success: true, ...result });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/h5p/generate-ai
 * AI-driven H5P generation
 */
router.post('/generate-ai', async (req: Request, res: Response) => {
    try {
        console.log('Received H5P AI generation request');

        const openaiClient = getOpenAI();
        if (!openaiClient) {
            return res.status(500).json({ error: 'OpenAI API key not configured on server.' });
        }

        const { library, topic, count = 3 } = req.body;

        if (!library || !topic) {
            return res.status(400).json({ error: 'Missing library or topic' });
        }

        const prompt = `
        Generate a JSON object for H5P content parameters for the library "${library}".
        The content should be about "${topic}".
        Generate ${count} items/questions if applicable.
        
        The output must be ONLY valid JSON matching the structure required by ${library} content.json.
        Do not include markdown formatting or explanations.
        
        For H5P.QuestionSet, include "questions" array with H5P.MultiChoice or H5P.TrueFalse.
        For H5P.Dialogcards, include "dialogs" array.
        For H5P.Blanks, include "questions" array with text and asterisks for blanks.
        
        Ensure all text is in French.
        Add "tips" or "tipsAndFeedback" where possible to help the learner.
        `;

        const completion = await openaiClient.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('No content received from OpenAI');
        }

        const contentParams = JSON.parse(content);
        console.log('AI generated params:', JSON.stringify(contentParams, null, 2));

        const result = await h5pGenerator.generate(library, contentParams);
        res.json({ success: true, ...result, aiParams: contentParams });

    } catch (err: any) {
        console.error('AI Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
