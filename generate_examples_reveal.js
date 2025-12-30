const axios = require('axios');

async function generateExamples() {
    try {
        console.log('🚀 Génération des exemples de cours...');

        // 1. Exemple Maths
        console.log('\n--- Exemple 1: Mathématiques (Théorème de Pythagore) ---');
        const mathResponse = await axios.post('http://localhost:3000/course/generate', {
            classroom: "4ème",
            subject: "Mathématiques",
            chapter: "Géométrie",
            subChapter: "Théorème de Pythagore",
            type: "course",
            contexte: "Introduction visuelle avec démonstration géométrique."
        });

        if (mathResponse.data.success) {
            console.log(`✅ Maths: http://localhost:3000${mathResponse.data.url}`);
        }

        // 2. Exemple SVT
        console.log('\n--- Exemple 2: SVT (La Cellule) ---');
        const svtResponse = await axios.post('http://localhost:3000/course/generate', {
            classroom: "6ème",
            subject: "SVT",
            chapter: "Le vivant",
            subChapter: "La cellule : unité du vivant",
            type: "course",
            contexte: "Découverte des composants de la cellule avec schémas."
        });

        if (svtResponse.data.success) {
            console.log(`✅ SVT: http://localhost:3000${svtResponse.data.url}`);
        }

    } catch (err) {
        console.error('❌ Erreur:', err.response ? err.response.data : err.message);
    }
}

generateExamples();
