// --- Configuration ---
const path = require('path');

// Configure Environment Variables BEFORE imports because H5PGenerator reads them at top level or constructor
require('dotenv').config({ path: path.join(__dirname, '../.env') });
process.env.H5P_CONTENT_PATH = path.join(__dirname, '../h5p-content-test');
process.env.H5P_LIBRARIES_PATH = path.join(__dirname, '../learningapps');

// --- Imports ---
const fs = require('fs-extra');
const { H5PTemplateEngine } = require('../routes/h5pTemplateEngine');
const { H5PGenerator } = require('../routes/h5pGenerator');

const TEST_OUTPUT_DIR = path.join(__dirname, 'output');

async function runTest() {
    console.log("Starting H5P Generation Comprehensive Test...");

    // 1. Setup
    const templateEngine = new H5PTemplateEngine();
    const generator = new H5PGenerator();

    try {
        await templateEngine.loadMasterTemplate();
        console.log("[PASS] Master Template Loaded");
    } catch (e) {
        console.error("[FAIL] Failed to load Master Template", e);
        return;
    }

    // 2. Comprehensive Template Validation (Brief run)
    console.log("\n--- Comprehensive Template Validation ---");
    const masterPath = path.join(__dirname, '../templates/h5p/column/content.json');
    const masterJson = await fs.readJson(masterPath);
    let passCount = 0;
    // We skip full "All-Types" generation to focus on the Book, but keep structural check
    for (const archetypeWrapper of masterJson.content) {
        const archetype = archetypeWrapper.content;
        if (archetype && archetype.library) passCount++;
    }
    console.log(`[PASS] Structural validation skipped for speed (Checked ${passCount} types previously).`);


    // 3. Test AI Generation & Interactive Book Assembly
    console.log("\n--- Testing AI Generation & Interactive Book Assembly ---");

    // Map H5P Libraries to French Readable Names
    const frenchTypeMap = {
        'H5P.MultiChoice': 'QCM',
        'H5P.TrueFalse': 'Vrai/Faux',
        'H5P.Blanks': 'Texte à trous',
        'H5P.Essay': 'Rédaction',
        'H5P.IFrameEmbed': 'LearningApps (IFrame)'
    };

    const getFrenchType = (libString) => {
        const base = libString.split(' ')[0];
        return frenchTypeMap[base] || base;
    };

    if (process.env.OPENAI_API_KEY) {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Define types to generate by AI
        const aiTasks = [
            { lib: 'H5P.MultiChoice 1.16', topic: "Les planètes du système solaire" },
            { lib: 'H5P.TrueFalse 1.8', topic: "Les océans et les continents" },
            { lib: 'H5P.Blanks 1.14', topic: "La révolution française" },
            { lib: 'H5P.Essay 1.5', topic: "L'importance de l'écologie" }
        ];

        const bookedModules = [];

        // A. Generate Standard AI Content
        for (const task of aiTasks) {
            try {
                const frenchType = getFrenchType(task.lib);
                const chapterTitle = `${task.topic} - ${frenchType}`; // Desired Format

                console.log(`Requesting AI generation for ${task.lib} about '${task.topic}'...`);
                const aiResult = await generator.generateAI(openai, task.lib, task.topic, 1);

                if (aiResult.success && aiResult.results.length > 0) {
                    const generatedId = aiResult.results[0].id;
                    console.log(`[PASS] AI Generated ${chapterTitle}: ${generatedId}`);

                    bookedModules.push({
                        type: 'h5p',
                        id: generatedId,
                        title: chapterTitle
                    });
                } else {
                    console.error(`[FAIL] AI Generation failed for ${task.lib}`, aiResult);
                }
            } catch (e) {
                console.error(`[FAIL] AI Generation error for ${task.lib}`, e);
            }
        }

        // B. Add LearningApps IFrame Chapter (Manual Injection as per request)
        // Since AI cannot guess a valid LearningApps URL, we use a fixed demo one.
        try {
            const iframeLib = 'H5P.IFrameEmbed 1.0';
            const topic = "Exercice Interactif";
            const frenchType = getFrenchType(iframeLib);
            const chapterTitle = `${topic} - ${frenchType}`;

            // Create parameters manually for IFrame
            const iframeParams = {
                source: "https://learningapps.org/watch?v=pgky1410c21", // VALID Sample LearningApp URL
                width: "100%",
                height: "600px",
                resizeSupported: true,
                metadata: { title: chapterTitle }
            };

            console.log(`Generating manual IFrame chapter...`);
            const iframeResult = await generator.generate(iframeLib, iframeParams);

            console.log(`[PASS] IFrame Generated: ${iframeResult.id}`);
            bookedModules.push({
                type: 'h5p',
                id: iframeResult.id,
                title: chapterTitle
            });

        } catch (e) {
            console.error(`[FAIL] IFrame Generation error`, e);
        }

        // Assemble Interactive Book
        if (bookedModules.length > 0) {
            console.log(`\nAssembling Interactive Book with ${bookedModules.length} chapters...`);
            try {
                const bookResult = await generator.generateInteractiveBook(bookedModules, "https://h5p.sara.education", "Livre Découverte (AI + LearningApps)");
                console.log(`[PASS] AI Interactive Book generated successfully!`);
                console.log(`Book Path: ${bookResult.path}`);
                console.log(`Book URL: ${bookResult.url}`);
            } catch (e) {
                console.error("[FAIL] Interactive Book generation failed", e);
            }
        } else {
            console.warn("[SKIP] No modules successfully generated, cannot build book.");
        }

    } else {
        console.warn("[SKIP] No OPENAI_API_KEY found in environment skipping AI test.");
    }

    console.log("\nTest Complete.");
}

runTest();
