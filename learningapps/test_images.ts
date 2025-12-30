import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScenarioExecutor } from './src/services/ScenarioExecutor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runImageTest() {
    const executor = new ScenarioExecutor();

    console.log('🚀 Génération d\'un quiz avec images (WriteAnswerCards)...');

    const params = {
        title: "Quiz Fruits et Légumes (Images)",
        task: "Identifiez le fruit ou le légume sur l'image.",
        cards: [
            {
                content: {
                    type: "image",
                    image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/800px-Red_Apple.jpg",
                    hint: "C'est rouge et croquant"
                },
                solution: "Pomme"
            },
            {
                content: {
                    type: "image",
                    image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Single.jpg/800px-Banana-Single.jpg",
                    hint: "C'est jaune et courbé"
                },
                solution: "Banane"
            },
            {
                content: {
                    type: "image",
                    image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Tomato.png/800px-Tomato.png",
                    hint: "Souvent utilisé dans la salade"
                },
                solution: "Tomate"
            }
        ]
    };

    const result = await executor.executeScenario('learningapps', 'WriteAnswerCards', params);

    if (result.success) {
        console.log(`\n✅ Succès !`);
        console.log(`🔗 URL : ${result.iframeUrl}`);
        console.log(`🆔 App ID : ${result.appId}`);
    } else {
        console.error(`\n❌ Échec : ${result.error}`);
    }
}

runImageTest();
