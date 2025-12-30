import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScenarioExecutor } from './src/services/ScenarioExecutor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTests() {
    const executor = new ScenarioExecutor();

    console.log('🚀 Démarrage des tests LearningApps...');

    // 1. Test WriteAnswerCards
    console.log('\n--- Test 1: WriteAnswerCards (Vocabulaire) ---');
    const params1 = {
        title: "Vocabulaire Animaux (Test)",
        task: "Écrivez la traduction anglaise de l'animal affiché.",
        cards: [
            { question: "Le Chat", solution: "cat" },
            { question: "Le Chien", solution: "dog" }
        ]
    };

    const result1 = await executor.executeScenario('learningapps', 'WriteAnswerCards', params1);
    if (result1.success) {
        console.log(`✅ Succès WriteAnswerCards: ${result1.iframeUrl}`);
    } else {
        console.error(`❌ Échec WriteAnswerCards: ${result1.error}`);
    }

    // 2. Test TextInputQuiz
    console.log('\n--- Test 2: TextInputQuiz (Géographie) ---');
    const params2 = {
        title: "Quiz Géo Rapide (Test)",
        task: "Répondez aux questions suivantes.",
        questions: [
            {
                question: { text: "Quelle est la capitale de l'Italie ?", type: "text" },
                answer: "Rome"
            }
        ]
    };

    const result2 = await executor.executeScenario('learningapps', 'TextInputQuiz', params2);
    if (result2.success) {
        console.log(`✅ Succès TextInputQuiz: ${result2.iframeUrl}`);
    } else {
        console.error(`❌ Échec TextInputQuiz: ${result2.error}`);
    }
}

runTests();
