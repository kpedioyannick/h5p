
async function generateAdditionsContent() {
    const baseUrl = 'http://localhost:3000';
    const topic = 'additions';
    const count = 3;

    console.log(`🚀 Starting AI Generation for topic: "${topic}"...\n`);

    // 1. Generate H5P MultiChoice
    try {
        console.log('👉 Generating H5P MultiChoice...');
        const res = await fetch(`${baseUrl}/api/h5p/generate-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                library: 'H5P.MultiChoice 1.16',
                topic: topic,
                count: count
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ H5P Success:', data.path);
        } else {
            console.error('❌ H5P Failed:', data.error || data);
        }
    } catch (e) {
        console.error('❌ H5P Error:', e.message);
    }

    // 2. Generate LearningApps Qcm
    try {
        console.log('\n👉 Generating LearningApps Qcm...');
        const res = await fetch(`${baseUrl}/api/content/learningapps/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: 'Qcm',
                topic: topic,
                count: count
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ LearningApps Success:', data.iframeUrl);
        } else {
            console.error('❌ LearningApps Failed:', data.error || data);
        }
    } catch (e) {
        console.error('❌ LearningApps Error:', e.message);
    }
}

generateAdditionsContent();
