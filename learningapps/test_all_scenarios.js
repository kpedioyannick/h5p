
const scenarios = [
    {
        module: 'Ordering',
        title: 'Test Ordering Debug',
        params: {
            task: 'Order numbers',
            items: [{ content: '1' }, { content: '2' }, { content: '3' }]
        }
    }
];

async function testAll() {
    console.log('🚀 Starting Debug Test (Ordering)...\n');

    for (const scenario of scenarios) {
        try {
            console.log(`👉 Testing ${scenario.module}...`);
            const res = await fetch('http://localhost:3000/api/content/learningapps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenario)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                console.log(`✅ ${scenario.module}: Success -> ${data.iframeUrl}`);
            } else {
                console.error(`❌ ${scenario.module}: Failed`, data.error);
            }
        } catch (e) {
            console.error(`❌ ${scenario.module}: Error`, e.message);
        }
    }
}

testAll();
