const axios = require('axios');

const API_URL = 'http://localhost:3000/api/h5p/generate-ai';

async function testAI() {
    try {
        console.log('Testing AI generation for H5P.MultiChoice...');
        const response = await axios.post(API_URL, {
            library: 'H5P.MultiChoice 1.16',
            topic: 'Les capitales européennes',
            count: 2
        });

        if (response.data.success) {
            console.log('✅ Success!');
            console.log('Path:', response.data.path);
            console.log('AI Params:', JSON.stringify(response.data.aiParams, null, 2));
        } else {
            console.error('❌ Failed:', response.data);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testAI();
