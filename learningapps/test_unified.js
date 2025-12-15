
async function testUnified() {
    const baseUrl = 'http://localhost:3000';

    console.log('🧪 Starting Unified Tests...\n');

    // 1. Test H5P Manual Generation
    try {
        console.log('👉 Testing H5P Manual Generation...');
        const res = await fetch(`${baseUrl}/api/h5p/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                library: 'H5P.TrueFalse 1.8',
                params: {
                    question: "<p>Is this working?</p>",
                    correct: "true"
                }
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ H5P Manual: Success', data.path);
        } else {
            console.error('❌ H5P Manual: Failed', data);
        }
    } catch (e) {
        console.error('❌ H5P Manual: Error', e.message);
    }

    // 2. Test H5P AI Generation
    try {
        console.log('\n👉 Testing H5P AI Generation...');
        const res = await fetch(`${baseUrl}/api/h5p/generate-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                library: 'H5P.MultiChoice 1.16',
                topic: 'Space',
                count: 2
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ H5P AI: Success', data.path);
        } else {
            console.log('⚠️ H5P AI: Expected Failure (No Key)', data.error);
        }
    } catch (e) {
        console.error('❌ H5P AI: Error', e.message);
    }

    // 3. Test LearningApps Manual Generation
    try {
        console.log('\n👉 Testing LearningApps Manual Generation...');
        const res = await fetch(`${baseUrl}/api/content/learningapps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: 'Qcm',
                title: 'Unified Test QCM',
                params: {
                    task: 'Test Task',
                    questions: [{ question_text: 'Q1', answers: [{ answer_text: 'A1', is_correct: true }] }]
                }
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ LearningApps Manual: Success', data.iframeUrl);
        } else {
            console.error('❌ LearningApps Manual: Failed', data);
        }
    } catch (e) {
        console.error('❌ LearningApps Manual: Error', e.message);
    }

    // 4. Test LearningApps AI Generation
    try {
        console.log('\n👉 Testing LearningApps AI Generation...');
        const res = await fetch(`${baseUrl}/api/content/learningapps/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: 'Qcm',
                topic: 'Math',
                count: 2
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ LearningApps AI: Success', data.iframeUrl);
        } else {
            console.log('⚠️ LearningApps AI: Expected Failure (No Key)', data.error);
        }
    } catch (e) {
        console.error('❌ LearningApps AI: Error', e.message);
    }
}

testUnified();
