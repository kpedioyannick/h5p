const fs = require('fs-extra');
const path = require('path');
const TEMPLATES = require('../config/h5pTemplates');

// Configuration paths
const H5P_CONTENT_DIR = process.env.H5P_CONTENT_PATH;
const H5P_LIBRARIES_DIR = process.env.H5P_LIBRARIES_PATH;

const LIBRARY_NAMES_FR = {
    "H5P.SingleChoiceSet": "Choix Unique",
    "H5P.MultiChoice": "QCM",
    "H5P.TrueFalse": "Vrai ou Faux",
    "H5P.DragText": "Texte à Trous (Glisser)",
    "H5P.Blanks": "Texte à Trous (Saisir)",
    "H5P.MarkTheWords": "Surligner les Mots",
    "H5P.Dialogcards": "Cartes de Dialogue",
    "H5P.Summary": "Résumé",
    "H5P.Questionnaire": "Questionnaire",
    "H5P.Accordion": "Accordéon",
    "H5P.Timeline": "Frise Chronologique",
    "H5P.IFrameEmbed": "Contenu Externe",
    "H5P.GuessTheAnswer": "Deviner la Réponse",
    "H5P.ImageHotspots": "Image Interactive",
    "H5P.SortParagraphs": "Trier les Paragraphes",
    "H5P.ImageSlider": "Carrousel d'Images",
    "H5P.AudioRecorder": "Enregistreur Audio",
    "H5P.Essay": "Dissertation",
    "H5P.CoursePresentation": "Présentation de Cours",
    "H5P.QuestionSet": "Quiz (Jeu de Questions)"
};

class H5PGenerator {

    constructor() {
        // Ensure directories exist
        fs.ensureDirSync(H5P_CONTENT_DIR);
    }

    // Helper to find library folder with semantic versioning
    async findLibraryFolder(machineName, major, minor) {
        // 1. Try exact match first
        const exactName = `${machineName}-${major}.${minor}`;
        const exactPath = path.join(H5P_LIBRARIES_DIR, exactName);
        if (await fs.pathExists(exactPath)) {
            return exactPath;
        }

        // 2. Search for compatible versions (Same Major, Minor >= requested)
        try {
            const files = await fs.readdir(H5P_LIBRARIES_DIR);
            const candidates = [];

            for (const file of files) {
                if (file.startsWith(`${machineName}-${major}.`)) {
                    const parts = file.split('-');
                    const versionParts = parts[parts.length - 1].split('.');
                    if (versionParts.length < 2) continue;

                    const fileMajor = parseInt(versionParts[0]);
                    const fileMinor = parseInt(versionParts[1]);

                    if (fileMajor === major && fileMinor >= minor) {
                        candidates.push({
                            folder: file,
                            minor: fileMinor,
                            path: path.join(H5P_LIBRARIES_DIR, file)
                        });
                    }
                }
            }

            if (candidates.length > 0) {
                candidates.sort((a, b) => b.minor - a.minor);
                return candidates[0].path;
            }
        } catch (err) {
            console.error('Error searching for libraries:', err);
        }

        return null;
    }

    async getDependencies(machineName, major, minor, loadedDeps = new Set()) {
        const depKey = `${machineName}-${major}.${minor}`;
        if (loadedDeps.has(depKey)) {
            return [];
        }
        loadedDeps.add(depKey);

        const libraryDir = await this.findLibraryFolder(machineName, major, minor);
        if (!libraryDir) {
            console.warn(`Library not found: ${machineName} ${major}.${minor}`);
            return [];
        }

        const libraryJsonPath = path.join(libraryDir, 'library.json');
        if (!await fs.pathExists(libraryJsonPath)) {
            return [];
        }

        const libraryData = await fs.readJson(libraryJsonPath);
        let dependencies = [];

        if (libraryData.preloadedDependencies) {
            for (const dep of libraryData.preloadedDependencies) {
                dependencies.push(dep);
                const subDeps = await this.getDependencies(dep.machineName, dep.majorVersion, dep.minorVersion, loadedDeps);
                dependencies = dependencies.concat(subDeps);
            }
        }

        if (libraryData.editorDependencies) {
            for (const dep of libraryData.editorDependencies) {
                dependencies.push(dep);
                const subDeps = await this.getDependencies(dep.machineName, dep.majorVersion, dep.minorVersion, loadedDeps);
                dependencies = dependencies.concat(subDeps);
            }
        }

        return dependencies;
    }

    findLibrariesInContent(obj, found = []) {
        if (!obj || typeof obj !== 'object') return found;

        if (obj.library && typeof obj.library === 'string') {
            const parts = obj.library.split(' ');
            if (parts.length === 2) {
                const name = parts[0];
                const versionParts = parts[1].split('.');
                if (versionParts.length >= 2) {
                    found.push({
                        machineName: name,
                        majorVersion: parseInt(versionParts[0]),
                        minorVersion: parseInt(versionParts[1])
                    });
                }
            }
        }

        for (const key in obj) {
            this.findLibrariesInContent(obj[key], found);
        }
        return found;
    }

    async generate(library, params) {
        if (!library || !params) {
            throw new Error('Missing library or params');
        }

        let mainMachineName, mainMajor, mainMinor;
        if (library.includes(' ')) {
            const parts = library.split(' ');
            mainMachineName = parts[0];
            const v = parts[1].split('.');
            mainMajor = parseInt(v[0]);
            mainMinor = parseInt(v[1]);
        } else {
            throw new Error('Library must include version (e.g. "H5P.QuestionSet 1.20")');
        }

        const timestamp = Date.now().toString();
        const outputDir = path.join(H5P_CONTENT_DIR, timestamp);

        await fs.ensureDir(outputDir);
        await fs.writeJson(path.join(outputDir, 'content.json'), params);

        const loadedDeps = new Set();
        let allDeps = [];

        // Add main library itself
        allDeps.push({
            machineName: mainMachineName,
            majorVersion: mainMajor,
            minorVersion: mainMinor
        });

        const mainDeps = await this.getDependencies(mainMachineName, mainMajor, mainMinor, loadedDeps);
        allDeps = allDeps.concat(mainDeps);

        const contentLibs = this.findLibrariesInContent(params);
        for (const lib of contentLibs) {
            allDeps.push(lib);
            const subDeps = await this.getDependencies(lib.machineName, lib.majorVersion, lib.minorVersion, loadedDeps);
            allDeps = allDeps.concat(subDeps);
        }

        const uniqueDeps = [];
        const seen = new Set();
        for (const dep of allDeps) {
            const key = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueDeps.push(dep);
            }
        }

        const h5pJson = {
            title: params.metadata?.title || "Activité",
            language: "fr",
            mainLibrary: mainMachineName,
            license: "U",
            defaultLanguage: "fr",
            embedTypes: ["div"],
            preloadedDependencies: uniqueDeps,
            extraTitle: params.metadata?.title || "Activité"
        };

        await fs.writeJson(path.join(outputDir, 'h5p.json'), h5pJson);

        const registryPath = path.resolve(__dirname, '../libraryRegistry.json');
        let shortName = mainMachineName.toLowerCase().replace('.', '-');

        try {
            if (await fs.pathExists(registryPath)) {
                const registry = await fs.readJson(registryPath);
                if (registry[mainMachineName] && registry[mainMachineName].shortName) {
                    shortName = registry[mainMachineName].shortName;
                }
            }
        } catch (e) {
            console.error('Error reading library registry:', e);
        }

        const baseUrl = process.env.H5P_LINK || process.env.H5P_BASE_URL || 'http://localhost:8080';
        const url = `${baseUrl}/view/${shortName}/${timestamp}`;

        return { path: outputDir, folder: timestamp, id: timestamp, url };
    }

    async generateAI(openai, library, topic, count = 3) {





        const libraryBase = library.split(' ')[0];
        const templateConfig = TEMPLATES[libraryBase];

        let prompt;
        if (templateConfig) {
            prompt = `You are a strict JSON template filler.
            GOAL: Fill the JSON template below with content about "${topic}".
            
            CRITICAL: You MUST generate EXACTLY ${count} distinct items in the primary array.
            
            RULES:
            1. You MUST use the exact structure definitions below.
            2. The Root Object MUST ONLY have keys matching the template.
            3. Fill the values based on "${topic}".
            4. "answers" MUST be a simple array of objects for MultiChoice (text and correct keys).
            5. All content MUST be in FRENCH.
            6. Do NOT wrap the result in "settings" or "params".
            TEMPLATE: ${JSON.stringify(templateConfig.definition)}`;
        } else {
            prompt = `Generate H5P content parameters (JSON) for "${library}" about "${topic}". Provide EXACTLY ${count} questions/items if applicable. Output ONLY valid JSON. All text in French.`;
        }

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });

        let contentParams = JSON.parse(completion.choices[0].message.content);

        // Sanitization
        if (contentParams.aiParams) contentParams = contentParams.aiParams;
        if (contentParams.params) contentParams = contentParams.params;
        if (contentParams.settings) contentParams = contentParams.settings;
        if (contentParams.content && !contentParams.questions && !contentParams.choices && !contentParams.essay) {
            contentParams = contentParams.content;
        }

        const results = [];
        let itemsToGenerate = [];
        const isCollection = templateConfig && templateConfig.type === 'collection';

        if (isCollection) {
            itemsToGenerate = [contentParams];
        } else {
            const arrayKeys = ['questions', 'dialogs', 'cards', 'choices', 'sentences', 'paragraphs', 'text'];
            let foundArrayKey = null;
            for (const key of arrayKeys) {
                if (Array.isArray(contentParams[key])) {
                    foundArrayKey = key;
                    break;
                }
            }

            if (foundArrayKey) {
                itemsToGenerate = contentParams[foundArrayKey].map(item => ({ [foundArrayKey]: [item] }));
            } else if (contentParams.essay) {
                itemsToGenerate = [{ essay: contentParams.essay }];
            } else {
                itemsToGenerate = [contentParams];
            }
        }

        for (const itemParams of itemsToGenerate) {
            let finalParams = itemParams;
            if (templateConfig && templateConfig.mapping) {
                try {
                    finalParams = templateConfig.customMapping ?
                        templateConfig.customMapping(itemParams) :
                        templateConfig.mapping(itemParams);
                } catch (e) {
                    console.error('Mapping error:', e);
                }
            }
            if (!finalParams.metadata) finalParams.metadata = {};
            if (!finalParams.metadata.title) finalParams.metadata.title = topic;

            const result = await this.generate(library, finalParams);
            results.push(result);
        }

        return { success: true, count: results.length, results, url: results[0]?.url };
    }

    async generateFromTemplate(requests, title) {
        const { H5PTemplateEngine } = require('./h5pTemplateEngine');
        const engine = new H5PTemplateEngine();
        await engine.loadMasterTemplate();

        // Generate the H5P.Column content JSON (which contains the sub-modules)
        const columnParams = await engine.generateContent(requests);

        // Ensure metadata title is set
        if (!columnParams.metadata) columnParams.metadata = {};
        columnParams.metadata.title = title;

        // Use the existing generate method to package it standardly
        // The main library is H5P.Column 1.18 (as per template)
        return this.generate('H5P.Column 1.18', columnParams);
    }

    async generateInteractiveBook(modules, baseUrl = '', title = '') {
        const chapters = [];
        const supportedLibraries = [
            'H5P.Accordion', 'H5P.Agamotto', 'H5P.Audio', 'H5P.AudioRecorder', 'H5P.Blanks', 'H5P.Chart', 'H5P.Collage',
            'H5P.CoursePresentation', 'H5P.Dialogcards', 'H5P.DocumentationTool', 'H5P.DragQuestion',
            'H5P.DragText', 'H5P.Essay', 'H5P.GuessTheAnswer', 'H5P.Table', 'H5P.IFrameEmbed',
            'H5P.Image', 'H5P.ImageHotspots', 'H5P.ImageHotspotQuestion', 'H5P.ImageSlider',
            'H5P.InteractiveVideo', 'H5P.Link', 'H5P.MarkTheWords', 'H5P.MemoryGame',
            'H5P.MultiChoice', 'H5P.Questionnaire', 'H5P.QuestionSet', 'H5P.SingleChoiceSet',
            'H5P.Summary', 'H5P.Timeline', 'H5P.TrueFalse', 'H5P.Video'
        ];

        const laTypeMap = {
            'Qcm': 'QCM',
            'Fillblanks': 'Texte à trous',
            'Grouping': 'Regroupement',
            'Hangman': 'Pendu',
            'HorseRace': 'Course de chevaux',
            'Millionaire': 'Qui veut gagner des millions',
            'Ordering': 'Classement',
            'Pairmatching': 'Paires',
            'WriteAnswerCards': 'Cartes éclairs',
            'TextInputQuiz': 'Quiz texte'
        };

        for (const module of modules) {
            let chapterContent = null;
            let displayTitle = module.title || '';

            if (module.type === 'h5p') {
                try {
                    const contentDir = path.join(H5P_CONTENT_DIR, module.id);
                    if (await fs.pathExists(path.join(contentDir, 'h5p.json'))) {
                        const h5pJson = await fs.readJson(path.join(contentDir, 'h5p.json'));
                        const contentJson = await fs.readJson(path.join(contentDir, 'content.json'));
                        const mainLib = h5pJson.mainLibrary;
                        const libShort = mainLib.replace('H5P.', '');

                        displayTitle = LIBRARY_NAMES_FR[mainLib] || module.title || h5pJson.title || `H5P ${libShort}`;

                        if (supportedLibraries.includes(mainLib)) {
                            chapterContent = {
                                library: `${mainLib} ${h5pJson.preloadedDependencies.find(d => d.machineName === mainLib).majorVersion}.${h5pJson.preloadedDependencies.find(d => d.machineName === mainLib).minorVersion}`,
                                params: contentJson,
                                metadata: { title: displayTitle }
                            };
                        } else {
                            // Resolve slug
                            let slug = mainLib.toLowerCase().replace('.', '-');
                            // Start simplistic. Ideally check registry like parcours.js does.
                            // But usually H5P.FooBar -> h5p-foobar works.

                            chapterContent = {
                                library: 'H5P.IFrameEmbed 1.0',
                                params: {
                                    source: `${baseUrl}/view/${slug}/${module.id}`,
                                    width: "100%",
                                    minWidth: "300px",
                                    height: "800px",
                                    resizeSupported: false
                                },
                                metadata: { title: displayTitle }
                            };
                        }
                    }
                } catch (e) {
                    console.error(`Error processing H5P module ${module.id}:`, e);
                }
            } else if (module.type === 'learningapps') {
                const laName = laTypeMap[module.id] || module.id || 'Activité';
                displayTitle = module.title || laName;
                chapterContent = {
                    library: 'H5P.IFrameEmbed 1.0',
                    params: { source: `https://learningapps.org/watch?v=${module.id}`, width: "100%", minWidth: "300px", height: "800px", resizeSupported: false },
                    metadata: { title: displayTitle }
                };
            } else if (module.type === 'revealjs' || module.type === 'course') {
                displayTitle = "Cours Interactif";
                const revealUrl = module.id.startsWith('http') ? module.id : `${baseUrl}/course/view/${module.id}`;
                chapterContent = {
                    library: 'H5P.IFrameEmbed 1.0',
                    params: { source: revealUrl, width: "100%", minWidth: "300px", height: "800px", resizeSupported: false },
                    metadata: { title: displayTitle }
                };
            }

            if (chapterContent) {
                chapters.push({
                    library: 'H5P.Column 1.18',
                    params: {
                        content: [{
                            content: chapterContent,
                            useSeparator: 'auto',
                            subContentId: `col-item-${module.id}`.replace(/[^a-z0-9]/gi, '-')
                        }]
                    },
                    subContentId: `chapter-${module.id}`.replace(/[^a-z0-9]/gi, '-'),
                    metadata: { title: displayTitle }
                });
            }
        }

        const bookParams = {
            chapters,
            behaviour: { defaultTableOfContents: true, progressIndicators: true, displaySummary: true },
            metadata: { title: title || "Parcours d'apprentissage" }
        };
        return this.generate('H5P.InteractiveBook 1.11', bookParams);
    }
}

module.exports = { H5PGenerator };
