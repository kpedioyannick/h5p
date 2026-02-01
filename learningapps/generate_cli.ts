
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { ScenarioExecutor } from './src/services/ScenarioExecutor.js';
import { ScenarioLoader } from './src/services/ScenarioLoader.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const scenarioExecutor = new ScenarioExecutor();
const scenarioLoader = new ScenarioLoader();

// Redirect console.log to stderr to avoid polluting stdout (which is used for JSON output)
const originalLog = console.log;
console.log = console.error;

// Read input from stdin
const chunks: Buffer[] = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const { module: moduleName, prompt: topic, count = 1 } = input;

    if (!moduleName || !topic) {
      console.error(JSON.stringify({ error: 'Missing module or prompt' }));
      process.exit(1);
    }

    // Initialize OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error(JSON.stringify({ error: 'OPENAI_API_KEY not found' }));
      process.exit(1);
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1. Generate Parameters via OpenAI
    const aiPrompt = `
    Generate a JSON object for LearningApps scenario parameters for the module "${moduleName}".
    The content should be about "${topic}".
    
    The output must be ONLY a JSON object with a 'results' key containing an array of ${count} activity parameter objects.
    Each object must match the structure required by the scenario.
    Do not include markdown formatting or explanations.
    
    Specific schemas:
    
    - Qcm (QCM / Quiz):
      { "title": "...", "task": "...", "questions": [{ "question_text": "...", "answers": [{ "answer_text": "...", "is_correct": true }] }] }
      
    - Fillblanks (Texte à trous):
      { "title": "...", "task": "...", "clozetext": "Le -1- mange la -2-.", "clozes": [{ "answer": "chat" }, { "answer": "souris" }] }
      
    - Pairmatching (Paires):
      { "title": "...", "task": "...", "pairs": [{ "v1": { "text": "..." }, "v2": { "text": "..." } }] }
      
    - Grouping (Regroupement):
      { "title": "...", "task": "...", "clusters": [{ "name": "...", "items": ["Item1", "Item2"] }] }
      
    - Ordering (Classement / Ordre):
      { "title": "...", "task": "...", "items": [{ "text": "Step 1" }, { "text": "Step 2" }] }
      
    - Millionaire (Qui veut gagner des millions):
      { "title": "...", "task": "...", "levels": [ { "question": { "text": "...", "type": "text" }, "answers": ["Correct", "Wrong1", "Wrong2", "Wrong3"] } ] (Exactly 6 levels) }
      
    - HorseRace (Course de chevaux):
      { "title": "...", "task": "...", "questions": [{ "question": "...", "answers": [{ "content": { "text": "..." }, "is_correct": true }] }] } (Generate at least 10 questions)
      
    - Hangman (Pendu):
      { "title": "...", "task": "...", "words": [{ "word": "BANANE", "hint": { "text": "Fruit" } }] }
      
    - WriteAnswerCards (Cartes de réponse):
      { "title": "...", "task": "...", "cards": [{ "question": "...", "solution": "..." }] }
      
    - FillTable (Tableau à compléter):
      { "title": "...", "task": "...", "table": { "rows": [{ "cells": ["Header1", "Header2"] }, { "cells": ["Data1", "Data2"] }] } }
      
    - GrilleCorrespondance (Grille de correspondance):
      { "title": "...", "task": "...", "rows": [ [{ "text": "Item1" }, { "text": "Match1" }] ] }
      
    - ImagePlacement (Placement sur image):
      { "title": "...", "task": "...", "image": "URL_OR_KEY", "points": [{ "x": 10, "y": 20, "content": { "text": "Label" } }] } (Note: Needs specific image handling usually, but generic for now)
      
    - SortingPuzzle (Puzzle de tri):
      { "title": "...", "task": "...", "groups": [{ "name": "Group1", "items": [{ "text": "Item" }] }] }
      
    - TextInputQuiz (Quiz saisie):
      { "title": "...", "task": "...", "questions": [{ "question": "...", "answer": "..." }] }
      
    - TimelineAxis (Axe chronologique):
      { "title": "...", "task": "...", "items": [{ "date": "1990", "content": { "text": "Event" } }] }
      
    - VideoInsertions (Vidéo interactive):
      { "title": "...", "task": "...", "video": "YOUTUBE_URL", "events": [{ "time": "0:10", "content": { "text": "Info" } }] }
    
    Ensure all text is in French.
    If the module is not listed above, infer a reasonable structure based on the name.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: aiPrompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const aiData = JSON.parse(content);
    let paramsList = aiData.results || [aiData];
    // Ensure we respect the count if AI messed up
    if (paramsList.length > count) paramsList = paramsList.slice(0, count);

    // 2. Execute Scenarios
    const results = [];
    for (const params of paramsList) {
      // Fallback title if AI missed it
      if (!params.title) params.title = topic;

      const result = await scenarioExecutor.executeScenario('learningapps', moduleName, params);
      if (result.success) {
        results.push({
          lien: result.iframeUrl,
          id: result.appId || 'unknown',
          titre: params.title
        });
      } else {
        // If failed, we sadly return nothing or error? 
        // The user wants a strict array. Let's log stderr and skip or return error object?
        // User wants strict array of good results.
        console.error(`Failed to generate item: ${result.error}`);
      }
    }

    originalLog(JSON.stringify(results));
    process.exit(0);

  } catch (err: any) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
});
