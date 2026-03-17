// Routes API pour créer du contenu via scénarios

import { Router, Request, Response } from 'express';
import { ScenarioLoader } from '../services/ScenarioLoader.js';
import { ScenarioExecutor } from '../services/ScenarioExecutor.js';
import { CreateContentRequest, CreateContentResponse } from '../types/index.js';
import OpenAI from 'openai';

const router = Router();
const scenarioLoader = new ScenarioLoader();
const scenarioExecutor = new ScenarioExecutor();

// Lazy-load OpenAI client to ensure environment variables are loaded first
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (openai === null && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized for LearningApps routes');
  }
  return openai;
}

/**
 * Génère le code embed HTML
 */
function generateEmbedCode(iframeUrl: string): string {
  const escapedUrl = iframeUrl.replace(/"/g, '&quot;');
  return `<iframe src="${escapedUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
}

/**
 * POST /api/content/learningapps
 * Crée du contenu LearningApps via scénario enregistré
 */
router.post('/learningapps', async (req: Request, res: Response) => {
  const body = req.body as CreateContentRequest;
  const { module: moduleName, title, params } = body;

  if (!moduleName || !title) {
    const response: CreateContentResponse = {
      success: false,
      error: 'Missing required fields: module, title'
    };
    return res.status(400).json(response);
  }

  try {
    console.log(`\n🚀 Création LearningApps: ${moduleName} - "${title}"`);

    // Vérifier que le scénario existe
    if (!scenarioLoader.scenarioExists('learningapps', moduleName)) {
      const response: CreateContentResponse = {
        success: false,
        error: `Module '${moduleName}' not found. Available modules: ${scenarioLoader.listScenarios('learningapps').join(', ')}`
      };
      return res.status(404).json(response);
    }

    // Exécuter le scénario avec les paramètres
    const result = await scenarioExecutor.executeScenario('learningapps', moduleName, {
      title,
      ...params
    });

    if (!result.success) {
      const response: CreateContentResponse = {
        success: false,
        error: 'Content creation failed',
        details: result.error
      };
      return res.status(500).json(response);
    }

    const response: CreateContentResponse = {
      success: true,
      moduleType: 'learningapps',
      module: moduleName,
      title,
      iframeUrl: `${process.env.LEARNINGAPPS_BASE_URL || 'https://learningapps.org'}/display?v=${result.appId}`,
      embedCode: generateEmbedCode(`${process.env.LEARNINGAPPS_BASE_URL || 'https://learningapps.org'}/display?v=${result.appId}`),
      appId: result.appId
    };

    return res.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erreur:', errorMessage);

    const response: CreateContentResponse = {
      success: false,
      error: 'Content creation failed',
      details: errorMessage
    };
    return res.status(500).json(response);
  }
});


/**
 * POST /api/content/learningapps/ai
 * Crée du contenu LearningApps via IA
 */
router.post('/learningapps/ai', async (req: Request, res: Response) => {
  try {
    console.log('Received LearningApps AI generation request');

    const openaiClient = getOpenAI();
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server.' });
    }

    const { module: moduleName, topic, count = 5 } = req.body;

    if (!moduleName || !topic) {
      return res.status(400).json({ error: 'Missing module or topic' });
    }

    // Vérifier que le scénario existe
    if (!scenarioLoader.scenarioExists('learningapps', moduleName)) {
      return res.status(404).json({ error: `Module '${moduleName}' not found.` });
    }

    const prompt = `
    Generate a JSON object for LearningApps scenario parameters for the module "${moduleName}".
    The content should be about "${topic}".
    
    The output must be ONLY a JSON object with a 'results' key containing an array of ${count} activity parameter objects.
    Each object must match the structure required by the scenario.
    Do not include markdown formatting or explanations.
    
    For ALL modules, you can optionally include:
    "successMessage": "Message de félicitations (ex: Bravo !)"
    "help": "Indice général (ex: Utilise tes doigts)"

    Specific schemas:

    For "Qcm":
    {
      "title": "Title in French",
      "task": "Task description in French",
      "questions": [
        {
          "question_text": "Question in French",
          "answers": [
            { "answer_text": "Answer 1", "is_correct": true },
            { "answer_text": "Answer 2", "is_correct": false }
          ]
        }
      ]
    }
    
    For "Fillblanks":
    {
      "title": "Title in French",
      "task": "Task description in French",
      "clozetext": "Text with holes like -1- and -2-.",
      "clozes": [
        { "answer": "Answer 1" },
        { "answer": "Answer 2" }
      ]
    }
    
    For "Millionaire":
    {
      "title": "Title in French",
      "task": "Task description in French",
      "levels": [
        // MUST generate exactly 6 levels (increasing difficulty)
        {
          "question": { "text": "Question Level 1 (Easy)", "type": "text" },
          "answers": ["Correct", "Wrong", "Wrong", "Wrong"]
        },
        ... (exactly 6 levels total)
      ]
    }
    // The 'levels' array MUST contain exactly 6 objects.

    For "GrilleCorrespondance":
    {
      "title": "Titre",
      "task": "Consigne",
      "rows": [
        [
          { "type": "text", "text": "Élément 1" },
          { "type": "text", "text": "Correspondance 1" }
        ],
        [
          { "type": "text", "text": "Élément 2" },
          { "type": "text", "text": "Correspondance 2" }
        ]
      ]
    }

    For "HorseRace":
    {
      "title": "Titre",
      "task": "Consigne",
      "questions": [
        // MUST generate at least 5 questions for this module to be playable
        {
          "question": "Question texte",
          "answers": [
            { "content": { "text": "Réponse correcte", "type": "text" }, "is_correct": true },
            { "content": { "text": "Réponse incorrecte", "type": "text" }, "is_correct": false }
          ]
        },
        ... (at least 5 questions total)
      ]
    }

    For "Grouping":
    {
      "title": "Titre",
      "task": "Consigne",
      "clusters": [
        { "name": "Groupe 1", "items": ["Item A", "Item B"] },
        { "name": "Groupe 2", "items": ["Item C"] }
      ]
    }
    
    For "Ordering":
    {
      "title": "Titre",
      "task": "Consigne",
      "items": [
        { "text": "Étape 1" },
        { "text": "Étape 2" },
        { "text": "Étape 3" }
      ]
    }

    For "Pairmatching":
    {
      "title": "Titre",
      "task": "Consigne",
      "pairs": [
        { "v1": { "text": "A" }, "v2": { "text": "B" } },
        { "v1": { "text": "C" }, "v2": { "text": "D" } }
      ]
    }

    For "Hangman":
    {
      "title": "Titre",
      "task": "Consigne",
      "words": [
        { "word": "BANANE", "hint": { "text": "Fruit jaune" } },
        { "word": "AVION", "hint": { "text": "Vole dans le ciel" } }
      ]
    }
    
    For "WriteAnswerCards":
    {
      "title": "Titre",
      "task": "Consigne",
      "cards": [
        { "question": "Capitale France ?", "solution": "Paris" },
        { "question": "2 + 2 ?", "solution": "4" }
      ]
    }

    For "FillTable":
    {
      "title": "Titre",
      "task": "Consigne",
      "table": {
        "rows": [
          { "cells": ["En-tête 1", "En-tête 2"] },
          { "cells": ["Donnée 1", "Donnée 2"] }
        ]
      }
    }

    Ensure all text is in French.
    Generate appropriate content for the requested module.
    `;

    const completion = await openaiClient.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const aiData = JSON.parse(completion.choices[0].message.content || '{}');
    let activityParamsList = [];

    if (aiData.results && Array.isArray(aiData.results)) {
      activityParamsList = aiData.results;
    } else {
      activityParamsList = [aiData];
    }

    console.log(`AI generated ${activityParamsList.length} items for ${moduleName}`);

    const finalResults = [];
    for (const [index, params] of activityParamsList.entries()) {
      console.log(`Executing scenario for item ${index + 1}/${activityParamsList.length}`);
      try {
        const result = await scenarioExecutor.executeScenario('learningapps', moduleName, params);
        if (result.success) {
          finalResults.push({
            success: true,
            moduleType: 'learningapps',
            module: moduleName,
            title: params.title || topic,
            iframeUrl: result.iframeUrl,
            embedCode: result.iframeUrl ? generateEmbedCode(result.iframeUrl) : undefined,
            appId: result.appId,
            aiParams: params
          });
        } else {
          finalResults.push({ success: false, error: result.error, params });
        }
      } catch (err) {
        finalResults.push({ success: false, error: String(err), params });
      }
    }

    return res.json({
      success: true,
      count: finalResults.length,
      results: finalResults
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('AI Generation Error:', errorMessage);
    return res.status(500).json({ error: errorMessage });
  }
});

export default router;

