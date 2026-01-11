const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');

const COURSES_DIR = path.join(__dirname, '../courses');

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

router.post('/generate', async (req, res) => {
    try {
        const { classroom, subject, chapter, subChapter, type, contexte } = req.body;

        if (!openai) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        console.log(`🚀 Generating Reveal.js course for ${chapter} (${subChapter})...`);

        const prompt = `
        Generate a pedagogical course in French for a school activity.
        Class: ${classroom}
        Subject: ${subject}
        Chapter: ${chapter}
        SubChapter: ${subChapter}
        Type: ${type}
        Context: ${contexte || "No specific context"}

        The output must be a JSON object structured for a Reveal.js presentation.
        Use modern pedagogical methods.
        
        CRITICAL: 
        - Use a consistent BLACK theme. Do not suggest backgrounds.
        - Content must be MOBILE-FRIENDLY (short sentences, clear structure).
        - Use KaTeX for math formulas. ALWAYS use delimiters: \\( ... \\) for inline and \\[ ... \\] for block math.
        - Use "fragments" to reveal content step-by-step.
        - Use "auto-animate" for smooth transitions.
        - ALWAYS include "autoSlide": 5000 for every slide.
        - Add speaker notes for each slide.

        JSON Structure:
        {
            "title": "Course Title",
            "slides": [
                {
                    "content": "<h1 data-id='t1'>Slide Title</h1><p class='fragment'>Point 1</p>",
                    "autoAnimate": true,
                    "autoSlide": 5000,
                    "notes": "Speaker notes"
                }
            ]
        }

        Return ONLY the JSON object.
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        const courseData = JSON.parse(content);

        const timestamp = Date.now();
        const courseId = `${timestamp}`;
        const coursePath = path.join(COURSES_DIR, `${courseId}.json`);

        await fs.writeJson(coursePath, courseData);

        res.json({
            success: true,
            courseId,
            title: courseData.title,
            url: `${req.protocol}://${req.get('host')}/course/view/${courseId}`
        });

    } catch (err) {
        console.error('Course Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/view/:id', async (req, res) => {
    const courseId = req.params.id;
    const coursePath = path.join(COURSES_DIR, `${courseId}.json`);

    if (!await fs.pathExists(coursePath)) {
        return res.status(404).send('Course not found');
    }

    const viewerPath = path.join(__dirname, '../views/course_viewer.html');
    let html = await fs.readFile(viewerPath, 'utf8');

    // Inject course ID into the viewer
    html = html.replace('{{COURSE_ID}}', courseId);

    res.send(html);
});

router.get('/data/:id', async (req, res) => {
    const courseId = req.params.id;
    const coursePath = path.join(COURSES_DIR, `${courseId}.json`);

    if (!await fs.pathExists(coursePath)) {
        return res.status(404).json({ error: 'Course not found' });
    }

    const courseData = await fs.readJson(coursePath);
    res.json(courseData);
});

module.exports = router;
