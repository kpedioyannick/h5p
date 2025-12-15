import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

// Lazy-load OpenAI client
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
    if (openai === null && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI client initialized for Planning routes');
    }
    return openai;
}

/**
 * POST /api/planning/generate
 * Generate a learning plan with module suggestions
 */
router.post('/generate', async (req: Request, res: Response) => {
    try {
        console.log('Received learning plan generation request');

        const openaiClient = getOpenAI();
        if (!openaiClient) {
            return res.status(500).json({ error: 'OpenAI API key not configured on server.' });
        }

        const { topic, level, category } = req.body;

        if (!topic || !level || !category) {
            return res.status(400).json({
                error: 'Missing required fields: topic, level, category',
                example: {
                    topic: 'additions',
                    level: 'beginner',
                    category: 'course'
                }
            });
        }

        // Validate category
        const validCategories = ['course', 'entrainement', 'revision'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            });
        }

        const prompt = `
You are a pedagogical expert creating a learning plan for students.

Topic: ${topic}
Level: ${level}
Category: ${category}

Based on the category:
- "course": Focus on teaching new concepts (presentations, explanations, demonstrations)
- "entrainement": Focus on practice and skill building (exercises, interactive activities)
- "revision": Focus on review and assessment (quizzes, tests, summary activities)

Generate 3-5 learning modules. For each module, specify:
1. "type": Either "h5p" or "learningapps"
2. "library" (if h5p): Choose from H5P.CoursePresentation, H5P.InteractiveVideo, H5P.MultiChoice, H5P.DragQuestion, H5P.Blanks, H5P.TrueFalse
3. "module" (if learningapps): Choose from Qcm, Fillblanks, Ordering, Pairmatching, Grouping, HorseRace, Millionaire, WriteAnswerCards
4. "instruction": Short topic/instruction for this specific module (max 10 words)
5. "description": Brief description of what this module will teach/practice (1 sentence)
6. "count": Number of questions/items to generate (3-10)

Order modules pedagogically (easier to harder, or introduction to practice).

IMPORTANT: Return a JSON object with a "modules" array. Example:

{
  "modules": [
    {
      "type": "h5p",
      "library": "H5P.CoursePresentation 1.25",
      "instruction": "Introduction to ${topic}",
      "description": "Interactive presentation explaining the basics",
      "count": 5
    },
    {
      "type": "learningapps",
      "module": "Qcm",
      "instruction": "Quiz on ${topic} fundamentals",
      "description": "Multiple choice questions to verify understanding",
      "count": 3
    }
  ]
}
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

        let modules;
        try {
            const parsed = JSON.parse(content);
            console.log('OpenAI response:', JSON.stringify(parsed, null, 2));

            // Handle both array and object with modules property
            if (Array.isArray(parsed)) {
                modules = parsed;
            } else if (parsed.modules && Array.isArray(parsed.modules)) {
                modules = parsed.modules;
            } else {
                console.error('Unexpected response structure:', parsed);
                throw new Error('Response does not contain a modules array');
            }
        } catch (e) {
            console.error('Failed to parse OpenAI response:', content);
            throw new Error('Invalid JSON response from OpenAI: ' + (e instanceof Error ? e.message : String(e)));
        }

        return res.json({
            success: true,
            topic,
            level,
            category,
            modules,
            totalModules: modules.length
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Learning Plan Generation Error:', errorMessage);
        return res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

export default router;
