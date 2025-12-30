const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

router.post('/', async (req, res) => {
    try {
        const { classroom, subject, chapter, subChapter, type } = req.body;

        if (!openai) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        const prompt = `
        Generate a study plan for a school activity.
        Class: ${classroom}
        Subject: ${subject}
        Chapter: ${chapter}
        ${subChapter ? `SubChapter: ${subChapter}` : ''}
        Activity Type: ${type} (revision, exercise, exam)

        Propose 3 to 5 modules (activities) for this plan.
        For each module, provide:
        - type: "h5p" or "learningapps"
        - title: A relevant title
        - description: A short description
        - difficulty: "easy", "medium", or "hard"
        - params: 
            - For h5p: { "library": "H5P.MultiChoice 1.16" (or other suitable library like H5P.TrueFalse 1.8, H5P.DragQuestion 1.14), "topic": "Specific topic for AI generation" }
            - For learningapps: { "topic": "Specific search topic" }

        Return a JSON object with a key "modules" containing the array of modules.
        Example:
        {
            "modules": [
                {
                    "type": "h5p",
                    "title": "Quiz sur les additions",
                    "description": "Un quiz rapide pour tester les connaissances.",
                    "difficulty": "easy",
                    "params": { "library": "H5P.MultiChoice 1.16", "topic": "Additions simples" }
                }
            ]
        }
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        const result = JSON.parse(content);

        res.json(result);

    } catch (err) {
        console.error('Planning Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
