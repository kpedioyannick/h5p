// Routes API pour créer du contenu via scénarios

import { Router, Request, Response } from 'express';
import { ScenarioLoader } from '../services/ScenarioLoader.js';
import { ScenarioExecutor } from '../services/ScenarioExecutor.js';
import { CreateContentRequest, CreateContentResponse } from '../types/index.js';
import OpenAI from 'openai';

const router = Router();
const scenarioLoader = new ScenarioLoader();
const scenarioExecutor = new ScenarioExecutor();

const SARA_API_BASE_URL = 'https://sara.education';

/**
 * Envoie les métadonnées du module créé à sara.education (si subchapterSlug est fourni)
 */
async function notifySaraEducation(
  subchapterSlug: string,
  outputPath: string,
  type: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const url = `${SARA_API_BASE_URL}/api/learnings-apps`;
  const body = {
    outputPath,
    subchapterSlug,
    type,
    content: { metadata }
  };

  console.log(`[Sara] Calling ${url} for slug: ${subchapterSlug}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json() as Record<string, unknown>;
    console.log(`[Sara] Response (${res.status}):`, JSON.stringify(data));
  } catch (err) {
    console.error(`[Sara] Failed to notify sara.education:`, err instanceof Error ? err.message : err);
  }
}

// Lazy-load AI client
let aiClient: OpenAI | null = null;
let aiProvider: 'openai' | 'deepseek' = 'openai';

function getAIClient(): OpenAI | null {
  if (aiClient === null) {
    if (process.env.DEEPSEEK_API_KEY) {
      aiClient = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      });
      aiProvider = 'deepseek';
      console.log('✅ DeepSeek client initialized for LearningApps routes');
    } else if (process.env.OPENAI_API_KEY) {
      aiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      aiProvider = 'openai';
      console.log('✅ OpenAI client initialized for LearningApps routes');
    }
  }
  return aiClient;
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
 * Si le body contient `subchapterSlug`, notifie sara.education après la création.
 */
router.post('/learningapps', async (req: Request, res: Response) => {
  const body = req.body as CreateContentRequest & { subchapterSlug?: string; metadata?: Record<string, unknown> };
  const { module: moduleName, title, params, subchapterSlug, metadata: extraMetadata } = body;

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

    const displayUrl = `${process.env.LEARNINGAPPS_BASE_URL || 'https://learningapps.org'}/display?v=${result.appId}`;
    const response: CreateContentResponse = {
      success: true,
      moduleType: 'learningapps',
      module: moduleName,
      title,
      iframeUrl: displayUrl,
      embedCode: generateEmbedCode(displayUrl),
      appId: result.appId
    };

    // Si subchapterSlug est fourni, notifier sara.education avant de répondre
    if (subchapterSlug) {
      console.log(`[Sara] subchapterSlug detected: "${subchapterSlug}". Notifying sara.education...`);
      // Fusionner les métadonnées de la réponse avec les métadonnées du body si fournies
      const mergedMetadata = {
        ...(response as unknown as Record<string, unknown>),
        ...(extraMetadata || {})
      };
      await notifySaraEducation(
        subchapterSlug,
        displayUrl,
        'learningapps',
        mergedMetadata
      );
    }

    console.log(`[API] Sending success response for ${moduleName}: ${result.appId}`);
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

    const aiClient = getAIClient();
    if (!aiClient) {
      return res.status(500).json({ error: 'AI API key (OpenAI or DeepSeek) not configured on server.' });
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
    
    The output must be ONLY valid JSON matching the structure required by the scenario.
    Do not include markdown formatting or explanations.
    
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
        {
          "question": { "text": "Question Level 1", "type": "text" },
          "answers": ["Correct", "Wrong", "Wrong", "Wrong"]
        }
      ]
    }

    Ensure all text is in French.
    Generate appropriate content for the requested module.
    `;

    const model = aiProvider === 'deepseek' 
      ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat') 
      : 'gpt-4o-mini';

    const completion = await aiClient.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: model,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const params = JSON.parse(content);
    console.log('AI generated params:', JSON.stringify(params, null, 2));

    // Exécuter le scénario avec les paramètres générés
    const result = await scenarioExecutor.executeScenario('learningapps', moduleName, params);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Content creation failed',
        details: result.error
      });
    }

    console.log(`[API/AI] Sending success response for AI ${moduleName}: ${result.appId}`);
    return res.json({
      success: true,
      moduleType: 'learningapps',
      module: moduleName,
      title: params.title,
      iframeUrl: result.iframeUrl,
      embedCode: result.iframeUrl ? generateEmbedCode(result.iframeUrl) : undefined,
      appId: result.appId,
      aiParams: params
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('AI Generation Error:', errorMessage);
    return res.status(500).json({ error: errorMessage });
  }
});

export default router;

