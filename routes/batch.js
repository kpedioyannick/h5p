const express = require('express');
const router = express.Router();
const axios = require('axios');
const OpenAI = require('openai');
const { H5PGenerator } = require('./h5pGenerator');
const h5pGenerator = new H5PGenerator();

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * POST /api/generate-batch
 * Génère plusieurs modules pédagogiques et éventuellement un parcours complet.
 */
router.post('/', async (req, res) => {
    try {
        const { modules, forceGeneratePath, title } = req.body;

        if (!modules || !Array.isArray(modules)) {
            return res.status(400).json({ error: 'Le paramètre "modules" doit être un tableau.' });
        }

        if (!openai) {
            return res.status(500).json({ error: 'La clé API OpenAI n\'est pas configurée.' });
        }

        const results = [];
        const generatedForPath = [];

        console.log(`🚀 Batch generating ${modules.length} modules...`);

        for (const module of modules) {
            const { type, module: moduleName, topic, count = 1 } = module;
            console.log(`  Processing ${type}: ${moduleName} - Topic: ${topic}`);

            if (type === 'h5p') {
                try {
                    const h5pResult = await h5pGenerator.generateAI(openai, moduleName, topic, count);
                    if (h5pResult.success && h5pResult.results.length > 0) {
                        results.push({
                            type: 'h5p',
                            success: true,
                            id: h5pResult.results[0].id,
                            url: h5pResult.results[0].url,
                            title: topic
                        });
                        generatedForPath.push({
                            type: 'h5p',
                            id: h5pResult.results[0].id,
                            title: topic
                        });
                    } else {
                        results.push({ type: 'h5p', success: false, error: 'Échec de génération H5P', module: moduleName });
                    }
                } catch (e) {
                    console.error(`H5P Batch Error:`, e);
                    results.push({ type: 'h5p', success: false, error: e.message, module: moduleName });
                }
            } else if (type === 'learningapps') {
                try {
                    const laBaseUrl = process.env.LEARNINGAPPS_API_URL || 'http://localhost:3001';
                    const laResponse = await axios.post(`${laBaseUrl}/api/content/learningapps/ai`, {
                        module: moduleName,
                        topic: topic,
                        count: count
                    });

                    if (laResponse.data.success && laResponse.data.results && laResponse.data.results.length > 0) {
                        const laResult = laResponse.data.results[0];
                        results.push({
                            type: 'learningapps',
                            success: true,
                            id: laResult.appId,
                            url: laResult.iframeUrl,
                            title: topic
                        });
                        generatedForPath.push({
                            type: 'learningapps',
                            id: laResult.appId,
                            title: topic
                        });
                    } else {
                        results.push({ type: 'learningapps', success: false, error: 'Échec de génération LearningApps', module: moduleName });
                    }
                } catch (e) {
                    console.error(`LearningApps Batch Error:`, e);
                    results.push({ type: 'learningapps', success: false, error: e.message, module: moduleName });
                }
            } else {
                results.push({ type, success: false, error: `Type de module non supporté: ${type}` });
            }
        }

        const response = {
            success: true,
            results: results
        };

        if (forceGeneratePath && generatedForPath.length > 0) {
            console.log("🛠 Assembling batch into Interactive Book...");
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const bookResult = await h5pGenerator.generateInteractiveBook(generatedForPath, baseUrl, title || "Parcours Généré");

            response.parcours = {
                id: bookResult.id,
                url: bookResult.url,
                type: 'interactivebook',
                modules: generatedForPath
            };
        }

        res.json(response);

    } catch (err) {
        console.error('Batch API Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
