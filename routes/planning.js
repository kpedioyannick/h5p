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
            "REMEMBER": [
                { type: "h5p", library: "H5P.Dialogcards 1.9" },
                { type: "h5p", library: "H5P.SingleChoiceSet 1.11" },
                { type: "h5p", library: "H5P.DragText 1.10" },
                { type: "h5p", library: "H5P.Timeline 1.1" },
                { type: "h5p", library: "H5P.TrueFalse 1.8" }
            ],
            "UNDERSTAND": [
                // "Créer un cours revealjs" -> Implicitly handled as a specific module type or IFrame
                // For now, let's use a placeholder for Course/Slide
                { type: "revealjs", module: "CoursePresentation" }
            ],
            "APPLY": [
                { type: "h5p", library: "H5P.Blanks 1.14" },
                { type: "h5p", library: "H5P.MultiChoice 1.16" },
                { type: "h5p", library: "H5P.Summary 1.10" },
                { type: "h5p", library: "H5P.SpeakTheWordsSet 1.3" },
                { type: "learningapps", module: "Pairmatching" },
                { type: "learningapps", module: "TimelineAxis" },
                { type: "learningapps", module: "Grouping" },
                { type: "learningapps", module: "WriteAnswerCards" },
                { type: "learningapps", module: "Qcm" }
            ],
            "ANALYZE": [
                { type: "h5p", library: "H5P.SortParagraphs 1.3" }, // Good for analysis/order
                { type: "learningapps", module: "Ordering" } // Good for analysis
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
                const subChapterRequests = []; // Accumulate requests for this sub-chapter

                for (const level of subChapter.bloom_taxonomy || []) {
                    console.log(`  Processing Bloom Level ${level.level}: ${level.name}`);
                    for (const moduleObj of level.modules || []) {
                        // Selection logic: Pick a specific implementation from the group
                        const groupName = moduleObj.module_group;
                        const groupOptions = MODULE_GROUPS[groupName] || MODULE_GROUPS["CHOICE"];

                        // Pick a random implementation from the group for variety
                        const selection = groupOptions[Math.floor(Math.random() * groupOptions.length)];

                        // We only support 'h5p' types for the Template approach effectively right now
                        // If it's learningapps, we might skip or try to iframe it? 
                        // For now, let's prioritize H5P types if possible or fallback.
                        // The template engine handles H5P types.

                        // Prepare the request for the Template Engine
                        // We need to map the 'selection.library' (e.g. H5P.MultiChoice 1.16) to the engine's expected 'type'
                        // The engine handles fuzzy matching, so 'MultiChoice' is fine.

                        let typeKey = selection.library || selection.module;
                        // specific fix for commonly used keys
                        if (groupName === 'CHOICE') typeKey = 'MultiChoice';
                        if (groupName === 'BLANKS') typeKey = 'Blanks';
                        if (groupName === 'WRITING') typeKey = 'Essay';
                        if (groupName === 'MEMORY_CARDS') typeKey = 'Dialogcards';

                        const generationPrompt = moduleObj.prompt || moduleObj.objective;
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
