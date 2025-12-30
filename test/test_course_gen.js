const axios = require('axios');

async function testCourseGeneration() {
    try {
        console.log('🚀 Testing AI Course Generation...');

        const response = await axios.post('http://localhost:3000/course/generate', {
            classroom: "6ème",
            subject: "Mathématiques",
            chapter: "Les fractions",
            subChapter: "Simplification",
            type: "course",
            contexte: "Cours ludique pour des élèves de 11-12 ans."
        });

        if (response.data.success) {
            console.log('✅ Success!');
            console.log(`Title: ${response.data.title}`);
            console.log(`Course ID: ${response.data.courseId}`);
            console.log(`URL: http://localhost:3000${response.data.url}`);
        } else {
            console.error('❌ Failed:', response.data);
        }
    } catch (err) {
        console.error('❌ Error:', err.response ? err.response.data : err.message);
    }
}

testCourseGeneration();
