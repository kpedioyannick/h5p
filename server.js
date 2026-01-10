const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const { H5PGenerator } = require('./routes/h5pGenerator');
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

// Routes
const parcoursRoutes = require('./routes/parcours');
const planningRoutes = require('./routes/planning');
const courseRoutes = require('./routes/course');

app.use('/api/parcours', parcoursRoutes);
app.use('/parcours', parcoursRoutes); // Alias to match documentation
app.use('/api/planning', planningRoutes);
app.use('/course', courseRoutes);

app.post('/api/h5p/generate', async (req, res) => {
    try {
        const { library, params } = req.body;
        const result = await h5pGenerator.generate(library, params);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/h5p/generate-ai', async (req, res) => {
    try {
        const { library, topic, count = 3 } = req.body;
        if (!openai) return res.status(500).json({ error: 'OpenAI API key not configured.' });

        const result = await h5pGenerator.generateAI(openai, library, topic, count);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`H5P Backend running on port ${PORT}`);
});
