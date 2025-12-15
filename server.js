const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const LIBRARIES_DIR = path.join(__dirname, 'libraries');
const CONTENT_DIR = path.join(__dirname, 'content');

// Helper to find library folder
async function findLibraryFolder(machineName, major, minor) {
    // Try exact match first: MachineName-Major.Minor
    const exactName = `${machineName}-${major}.${minor}`;
    const exactPath = path.join(LIBRARIES_DIR, exactName);
    if (await fs.pathExists(exactPath)) {
        return exactPath;
    }

    // Try without hyphen? (Unlikely for H5P)
    // Try finding any folder starting with MachineName-Major.Minor
    // (Sometimes patch version is included in folder name? No, usually not in H5P standard structure here)
    return null;
}

// Helper to get dependencies recursively
async function getDependencies(machineName, major, minor, loadedDeps = new Set()) {
    const key = `${machineName}-${major}.${minor}`;
    if (loadedDeps.has(key)) return [];
    loadedDeps.add(key);

    const libFolder = await findLibraryFolder(machineName, major, minor);
    if (!libFolder) {
        console.warn(`Library not found: ${key}`);
        // If not found, we can't get its dependencies, but we should still list it if it was requested?
        // But if we can't find it, we can't read library.json.
        // We'll return it as a dependency anyway so it appears in h5p.json
        return [{
            machineName,
            majorVersion: major,
            minorVersion: minor
        }];
    }

    const libraryJsonPath = path.join(libFolder, 'library.json');
    if (!await fs.pathExists(libraryJsonPath)) {
        return [{
            machineName,
            majorVersion: major,
            minorVersion: minor
        }];
    }

    const libraryJson = await fs.readJson(libraryJsonPath);
    let deps = [];

    // Add self
    deps.push({
        machineName: libraryJson.machineName,
        majorVersion: libraryJson.majorVersion,
        minorVersion: libraryJson.minorVersion
    });

    // Preloaded dependencies
    if (libraryJson.preloadedDependencies) {
        for (const dep of libraryJson.preloadedDependencies) {
            const subDeps = await getDependencies(dep.machineName, dep.majorVersion, dep.minorVersion, loadedDeps);
            deps = deps.concat(subDeps);
        }
    }

    return deps;
}

// Recursive scanner for "library" field in content params
function findLibrariesInContent(obj, found = []) {
    if (!obj || typeof obj !== 'object') return found;

    if (obj.library && typeof obj.library === 'string') {
        // Format: "H5P.MultiChoice 1.16"
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
    const mainDeps = await getDependencies(mainMachineName, mainMajor, mainMinor, loadedDeps);
    allDeps = allDeps.concat(mainDeps);

    // Content deps
    const contentLibs = findLibrariesInContent(params);
    console.log(`Found content libraries:`, contentLibs);
    for (const lib of contentLibs) {
        const subDeps = await getDependencies(lib.machineName, lib.majorVersion, lib.minorVersion, loadedDeps);
        allDeps = allDeps.concat(subDeps);
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
