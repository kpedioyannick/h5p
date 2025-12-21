const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Static files for H5P content and libraries are served by the external H5P server (port 8080)


const LIBRARIES_DIR = path.join(__dirname, 'libraries');
const CONTENT_DIR = path.join(__dirname, 'content');

// Helper to find library folder with semantic versioning
async function findLibraryFolder(machineName, major, minor) {
    // 1. Try exact match first
    const exactName = `${machineName}-${major}.${minor}`;
    const exactPath = path.join(LIBRARIES_DIR, exactName);
    if (await fs.pathExists(exactPath)) {
        return exactPath;
    }

    // 2. Search for compatible versions (Same Major, Minor >= requested)
    try {
        const files = await fs.readdir(LIBRARIES_DIR);
        const candidates = [];

        for (const file of files) {
            if (file.startsWith(`${machineName}-${major}.`)) {
                const parts = file.split('-');
                const versionParts = parts[parts.length - 1].split('.');
                const fileMajor = parseInt(versionParts[0]);
                const fileMinor = parseInt(versionParts[1]);

                if (fileMajor === major && fileMinor >= minor) {
                    candidates.push({
                        folder: file,
                        minor: fileMinor,
                        path: path.join(LIBRARIES_DIR, file)
                    });
                }
            }
        }

        if (candidates.length > 0) {
            // Sort by minor version descending to get the latest compatible
            candidates.sort((a, b) => b.minor - a.minor);
            console.log(`Resolved ${machineName} ${major}.${minor} to ${candidates[0].folder}`);
            return candidates[0].path;
        }
    } catch (err) {
        console.error('Error searching for libraries:', err);
    }

    return null;
}

// Helper to get dependencies recursively and collect assets
async function getDependencies(machineName, major, minor, loadedDeps = new Set()) {
    const key = `${machineName}-${major}.${minor}`;
    if (loadedDeps.has(key)) return { deps: [], scripts: [], styles: [] };
    loadedDeps.add(key);

    const libFolder = await findLibraryFolder(machineName, major, minor);
    if (!libFolder) {
        console.warn(`Library not found: ${key}`);
        return {
            deps: [{ machineName, majorVersion: major, minorVersion: minor }],
            scripts: [],
            styles: []
        };
    }

    const libraryJsonPath = path.join(libFolder, 'library.json');
    if (!await fs.pathExists(libraryJsonPath)) {
        return {
            deps: [{ machineName, majorVersion: major, minorVersion: minor }],
            scripts: [],
            styles: []
        };
    }

    const libraryJson = await fs.readJson(libraryJsonPath);
    let deps = [];
    let scripts = [];
    let styles = [];

    // Add self
    deps.push({
        machineName: libraryJson.machineName,
        majorVersion: libraryJson.majorVersion,
        minorVersion: libraryJson.minorVersion
    });

    // Add own scripts and styles
    const libUrlPrefix = `/libraries/${path.basename(libFolder)}`;

    if (libraryJson.preloadedJs) {
        libraryJson.preloadedJs.forEach(js => {
            scripts.push(`${libUrlPrefix}/${js.path}`);
        });
    }
    if (libraryJson.preloadedCss) {
        libraryJson.preloadedCss.forEach(css => {
            styles.push(`${libUrlPrefix}/${css.path}`);
        });
    }

    // Preloaded dependencies
    if (libraryJson.preloadedDependencies) {
        for (const dep of libraryJson.preloadedDependencies) {
            const result = await getDependencies(dep.machineName, dep.majorVersion, dep.minorVersion, loadedDeps);
            deps = deps.concat(result.deps);
            scripts = scripts.concat(result.scripts);
            styles = styles.concat(result.styles);
        }
    }

    return { deps, scripts, styles };
}

// Recursive scanner for "library" field in content params
function findLibrariesInContent(obj, found = []) {
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
        findLibrariesInContent(obj[key], found);
    }
    return found;
}

// Route /api/h5p/play/:id removed (handled by external server)

const OpenAI = require('openai');

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
} else {
    console.warn("OPENAI_API_KEY not set. AI generation route will fail.");
}

// Core H5P Generation Logic
async function generateH5PContent(library, params) {
    if (!library || !params) {
        throw new Error('Missing library or params');
    }

    // Parse main library version
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

    const timestamp = Date.now();
    const outputDir = path.join(CONTENT_DIR, `${timestamp}`);

    await fs.ensureDir(outputDir);

    // 1. Write content.json
    await fs.writeJson(path.join(outputDir, 'content.json'), params);

    // 2. Calculate dependencies
    const loadedDeps = new Set();
    let allDeps = [];

    // Main library deps
    console.log(`Resolving dependencies for ${mainMachineName} ${mainMajor}.${mainMinor}`);
    const mainDepsResult = await getDependencies(mainMachineName, mainMajor, mainMinor, loadedDeps);
    allDeps = allDeps.concat(mainDepsResult.deps);

    // Content deps
    const contentLibs = findLibrariesInContent(params);
    console.log(`Found content libraries:`, contentLibs);
    for (const lib of contentLibs) {
        const subDepsResult = await getDependencies(lib.machineName, lib.majorVersion, lib.minorVersion, loadedDeps);
        allDeps = allDeps.concat(subDepsResult.deps);
    }

    // Deduplicate
    const uniqueDeps = [];
    const seen = new Set();
    for (const dep of allDeps) {
        const key = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueDeps.push(dep);
        }
    }

    // 3. Write h5p.json
    const h5pJson = {
        title: params.metadata?.title || "Generated Content",
        language: "fr",
        mainLibrary: mainMachineName,
        license: "U",
        defaultLanguage: "fr",
        embedTypes: ["div"],
        preloadedDependencies: uniqueDeps
    };

    await fs.writeJson(path.join(outputDir, 'h5p.json'), h5pJson);

    console.log(`Generated content at ${outputDir}`);
    return { path: outputDir, folder: `${timestamp}`, id: `${timestamp}` };
}

app.post('/api/h5p/generate', async (req, res) => {
    try {
        console.log('Received generation request');
        const { library, params } = req.body;
        const result = await generateH5PContent(library, params);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/h5p/generate-ai', async (req, res) => {
    try {
        console.log('Received AI generation request');

        if (!openai) {
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

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const contentParams = JSON.parse(completion.choices[0].message.content);
        console.log('AI generated params:', JSON.stringify(contentParams, null, 2));

        const result = await generateH5PContent(library, contentParams);
        res.json({ success: true, ...result, aiParams: contentParams });

    } catch (err) {
        console.error('AI Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route /content/:id removed (handled by external server)

// GET /parcours - Learning path route with Reveal.js
const parcoursRoutes = require('./routes/parcours');
app.use('/parcours', parcoursRoutes);

// POST /api/planning - Learning plan generation
const planningRoutes = require('./routes/planning');
app.use('/api/planning', planningRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
