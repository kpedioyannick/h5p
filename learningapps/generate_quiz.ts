import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { ScenarioExecutor } from './src/services/ScenarioExecutor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function generateQuiz() {
    try {
        console.log('🚀 Starting LearningApps Quiz Generation...');

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY not found in .env');
        }

        const openai = new OpenAI({ apiKey });
        const topic = "Culture Générale";
        const moduleName = "Qcm";

        console.log(`🤖 Generating content for topic: "${topic}" using AI...`);

        const prompt = `
    Generate a JSON object for LearningApps scenario parameters for the module "Qcm".
    The content should be about "${topic}".
    
    The output must be ONLY valid JSON matching the structure required by the scenario.
    Do not include markdown formatting or explanations.
    
    Structure:
    {
      "title": "Title in French",
      "task": "Task description in French",
      "questions": [
        {
          "question_text": "Question in French",
          "answers": [
            { "answer_text": "Answer 1", "is_correct": true },
            { "answer_text": "Answer 2", "is_correct": false },
            { "answer_text": "Answer 3", "is_correct": false },
            { "answer_text": "Answer 4", "is_correct": false }
          ]
        }
      ]
    }
    
    Generate 5 questions. Ensure all text is in French.
    `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('No content received from OpenAI');
        }

        const params = JSON.parse(content);
        console.log('✅ AI generated params successfully.');

        console.log('🌐 Executing LearningApps scenario (Playwright)...');
        const executor = new ScenarioExecutor();
        const result = await executor.executeScenario('learningapps', moduleName, params);

        if (result.success) {
            console.log('\n✨ Success!');
            console.log(`🔗 URL: ${result.iframeUrl}`);
            console.log(`🆔 App ID: ${result.appId}`);
        } else {
            console.error('\n❌ Failed:', result.error);
        }

    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    }
}

generateQuiz();
