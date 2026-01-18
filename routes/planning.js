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
        const { request, userId, classroom, subject, chapter, subChapter, type, contexte, lang, forceGeneratePath } = req.body;
        const level = classroom || req.body.level;

        if (!request) {
            return res.status(400).json({ error: 'The "request" parameter is mandatory' });
        }

        if (!openai) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        const MODULE_GROUPS = {
            "CHOICE": [
                { type: "h5p", library: "H5P.MultiChoice 1.16" },
                { type: "h5p", library: "H5P.TrueFalse 1.8" },
                { type: "learningapps", module: "Qcm" }
            ],
            "BLANKS": [
                { type: "h5p", library: "H5P.Blanks 1.12" },
                { type: "learningapps", module: "FillTable" },
                { type: "learningapps", module: "TextInputQuiz" }
            ],
            "MATCHING": [
                { type: "h5p", library: "H5P.DragQuestion 1.14" },
                { type: "learningapps", module: "Pairmatching" },
                { type: "learningapps", module: "Grouping" },
                { type: "learningapps", module: "SortingPuzzle" }
            ],
            "ORDERING": [
                { type: "h5p", library: "H5P.SortParagraphs 1.3" },
                { type: "h5p", library: "H5P.Timeline 1.1" },
                { type: "learningapps", module: "Ordering" },
                { type: "learningapps", module: "TimelineAxis" }
            ],
            "MEMORY_CARDS": [
                { type: "h5p", library: "H5P.Flashcards 1.5" },
                { type: "h5p", library: "H5P.MemoryGame 1.3" },
                { type: "h5p", library: "H5P.Dialogcards 1.9" },
                { type: "learningapps", module: "WriteAnswerCards" }
            ],
            "WRITING": [
                { type: "h5p", library: "H5P.Essay 1.5" }
            ],
            "GAMES": [
                { type: "learningapps", module: "Hangman" },
                { type: "h5p", library: "H5P.GuessTheAnswer 1.5" }
            ]
        };

        let sujetTraitement = `- Subject : ${request}`;
        if (subject) sujetTraitement += `\n        - Matière : ${subject}`;
        if (chapter) sujetTraitement += `\n        - Chapter : ${chapter}`;
        if (subChapter) sujetTraitement += `\n        - Sub-chapter : ${subChapter}`;

        let mandatoryKeys = `          - subject`;
        if (chapter) mandatoryKeys += `\n          - chapter`;
        if (subChapter) mandatoryKeys += `\n          - sub_chapter`;
        mandatoryKeys += `\n          - sub_chapters (décomposition du sujet en sous-blocs pédagogiques)`;

        const prompt = `
        Tu es un expert en ingénierie pédagogique pour les élèves débutants, taxonomie de Bloom et création de contenus interactifs sur ${request}. 
        Ta mission est de :
        1. Reformuler le titre et SUJET et le CHAPITRE pour qu'ils soient pédagogiquement pertinents (ex: "cellule" -> "La structure de la cellule végétale").
        2. Décomposition du sujet reformulé en plusieurs SOUS-CHAPITRES (ou sous-blocs) logiques et cohérents.
        3. Pour chaque sous-chapitre, générer une progression basée sur la taxonomie de Bloom.

        Sujet initial : ${request}
        Matière initiale : ${subject || 'Non précisée'}
        Chapitre initial : ${chapter || 'Général'}
 
        Contraintes OBLIGATOIRES :
        - Le JSON doit contenir les clés suivantes :
          - subject (votre version REFORMULÉE et professionnelle)
          - chapter (votre version REFORMULÉE et professionnelle)
          - sub_chapters (décomposition du sujet en sous-blocs pédagogiques)

        - Le tableau "sub_chapters" doit contenir la décomposition logique du sujet.
        - Chaque étape dans "sub_chapters" doit avoir :
          - title (titre thématique du sous-chapitre)
          - bloom_taxonomy (un tableau de 6 niveaux de Bloom spécifiques à ce sous-chapitre)

        - Pour chaque "bloom_taxonomy", utiliser STRICTEMENT les 6 niveaux dans cet ordre :
          1. remember
          2. understand
          3. apply
          4. analyze
          5. evaluate
          6. create

        - Chaque niveau de Bloom doit contenir :
          - level (1 à 6)
          - name
          - objective
          - modules (tableau)

        Règles des modules :
        - Déterminer pour chaque module un GROUPE idéal parmi : ${Object.keys(MODULE_GROUPS).join(', ')}
        - Chaque niveau de Bloom doit contenir au moins 1 module.
        - Chaque module doit contenir UNIQUEMENT :
          - module_group (Le groupe choisi)
          - objective (consignes et objectif pédagogique extrêmement détaillés pour l'outil de génération, spécifiques au thème du sous-chapitre et au niveau de Bloom)
          - count (nombre d'éléments, ex: 5)

        - IMPORTANT : Tout le contenu généré doit être STRICTEMENT centré sur l'aspect spécifique de "${request}".


        Format de sortie :
        - JSON valide uniquement
        - Aucune phrase hors JSON
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        let result = JSON.parse(content);

        if (forceGeneratePath) {
            console.log("🛠 Force generating path content with sub-chapter Bloom structure...");
            const generatedModules = [];

            // Iterate through sub-chapters, then Bloom levels, then modules
            for (const subChapter of result.sub_chapters || []) {
                console.log(`Processing Sub-Chapter: ${subChapter.title}`);
                for (const level of subChapter.bloom_taxonomy || []) {
                    console.log(`  Processing Bloom Level ${level.level}: ${level.name}`);
                    for (const moduleObj of level.modules || []) {
                        // Selection logic: Pick a specific implementation from the group
                        const groupName = moduleObj.module_group;
                        const groupOptions = MODULE_GROUPS[groupName] || MODULE_GROUPS["CHOICE"];

                        // Pick a random implementation from the group for variety
                        const selection = groupOptions[Math.floor(Math.random() * groupOptions.length)];
                        moduleObj.type = selection.type;
                        if (selection.type === 'h5p') moduleObj.library = selection.library;
                        if (selection.type === 'learningapps') moduleObj.module = selection.module;

                        // Use objective as prompt if prompt is missing
                        const generationPrompt = moduleObj.prompt || moduleObj.objective;
                        // Use objective as title if title is missing (first 50 chars)
                        if (!moduleObj.title) {
                            moduleObj.title = moduleObj.objective.length > 50
                                ? moduleObj.objective.substring(0, 47) + '...'
                                : moduleObj.objective;
                        }

                        console.log(`    Generating module: ${moduleObj.title} (Group: ${groupName} -> ${moduleObj.module || moduleObj.library})`);
                        if (moduleObj.type === 'h5p') {
                            try {
                                const libraryName = moduleObj.library || "H5P.MultiChoice 1.16";
                                const h5pResult = await h5pGenerator.generateAI(openai, libraryName, generationPrompt, moduleObj.count || 1);
                                if (h5pResult.success && h5pResult.results.length > 0) {
                                    const genId = h5pResult.results[0].id;
                                    const genUrl = h5pResult.results[0].url;

                                    moduleObj.id = genId;
                                    moduleObj.url = genUrl;

                                    generatedModules.push({
                                        type: 'h5p',
                                        id: genId,
                                        title: moduleObj.title
                                    });
                                }
                            } catch (e) {
                                console.error(`Error generating H5P module ${moduleObj.title}:`, e);
                            }
                        } else if (moduleObj.type === 'learningapps') {
                            try {
                                const laBaseUrl = process.env.LEARNINGAPPS_API_URL || 'http://localhost:3001';
                                const laResponse = await axios.post(`${laBaseUrl}/api/content/learningapps/ai`, {
                                    module: moduleObj.module,
                                    topic: generationPrompt,
                                    count: moduleObj.count || 1
                                });

                                if (laResponse.data.success && laResponse.data.results && laResponse.data.results.length > 0) {
                                    const laResult = laResponse.data.results[0];
                                    const genId = laResult.appId;
                                    const genUrl = `https://learningapps.org/watch?v=${genId}`;

                                    moduleObj.id = genId;
                                    moduleObj.url = genUrl;

                                    generatedModules.push({
                                        type: 'learningapps',
                                        id: genId,
                                        title: moduleObj.title
                                    });
                                }
                            } catch (e) {
                                console.error(`Error generating LearningApps module ${moduleObj.title}:`, e);
                            }
                        }
                    }
                }
            }

            if (generatedModules.length > 0) {
                // Generate Parcours (Interactive Book)
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                const bookResult = await h5pGenerator.generateInteractiveBook(generatedModules, baseUrl, result.subject || result.title);

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
