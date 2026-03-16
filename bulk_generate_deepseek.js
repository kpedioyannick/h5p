import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001';

// List of modules to test based on scenarios directory
const modules = [
    'Qcm',
    'Millionaire',
    'Fillblanks',
    'Hangman',
    'Grouping',
    'Pairmatching',
    'Ordering',
    'TextInputQuiz',
    'HorseRace',
    'SortingPuzzle',
    'TimelineAxis',
    'WriteAnswerCards',
    'FillTable'
];

const topic = "Les grandes inventions de l'histoire et leur impact sur la société moderne";

async function testModule(moduleName) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`📡 Testing module: ${moduleName}`);
    console.log(`---------------------------------------------------------`);
    
    try {
        const start = Date.now();
        const response = await axios.post(`${BASE_URL}/api/content/learningapps/ai`, {
            module: moduleName,
            topic: topic,
            count: 3
        }, {
            timeout: 120000 // 2 minutes timeout for AI + Playwright
        });
        
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        
        if (response.data.success) {
            console.log(`✅ SUCCESS: ${moduleName}`);
            console.log(`🔗 URL: ${response.data.iframeUrl}`);
            console.log(`🆔 AppId: ${response.data.appId}`);
            console.log(`⏱️ Duration: ${duration}s`);
            return { module: moduleName, success: true, url: response.data.iframeUrl, appId: response.data.appId };
        } else {
            console.log(`❌ FAILED: ${moduleName}`);
            console.log(`📦 Error: ${response.data.error}`);
            console.log(`📝 Details: ${response.data.details || 'N/A'}`);
            return { module: moduleName, success: false, error: response.data.error };
        }
    } catch (error) {
        console.log(`❌ ERROR calling API for ${moduleName}:`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Body:`, error.response.data);
        } else {
            console.log(`   Message: ${error.message}`);
        }
        return { module: moduleName, success: false, error: error.message };
    }
}

async function runAllTests() {
    console.log(`🚀 Starting Bulk Generation with DeepSeek`);
    console.log(`📍 API Base: ${BASE_URL}`);
    console.log(`📚 Topic: ${topic}`);
    console.log(`📦 Modules to test: ${modules.length}\n`);

    const results = [];
    
    for (const moduleName of modules) {
        const result = await testModule(moduleName);
        results.push(result);
        
        // Wait 5 seconds between tests to avoid rate limiting or browser crashes
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log(`\n=========================================================`);
    console.log(`📊 FINAL REPORT`);
    console.log(`=========================================================`);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (failed.length > 0) {
        console.log(`\nFailed modules: ${failed.map(f => f.module).join(', ')}`);
    }
    
    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to test_results.json`);
}

runAllTests().catch(console.error);
