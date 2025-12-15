
async function testPlanningAPI() {
    const baseUrl = 'http://localhost:3000';

    console.log('🧪 Testing Learning Plan Generation API...\n');

    const scenarios = [
        {
            name: 'Course - Additions (Beginner)',
            data: {
                topic: 'additions',
                level: 'beginner',
                category: 'course'
            }
        },
        {
            name: 'Entrainement - Multiplications (Intermediate)',
            data: {
                topic: 'multiplications',
                level: 'intermediate',
                category: 'entrainement'
            }
        },
        {
            name: 'Revision - French Grammar (Advanced)',
            data: {
                topic: 'French grammar',
                level: 'advanced',
                category: 'revision'
            }
        }
    ];

    for (const scenario of scenarios) {
        try {
            console.log(`\n👉 Testing: ${scenario.name}`);
            console.log(`   Topic: ${scenario.data.topic}, Level: ${scenario.data.level}, Category: ${scenario.data.category}`);

            const res = await fetch(`${baseUrl}/api/planning/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenario.data)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                console.log(`   ✅ Success! Generated ${data.totalModules} modules:`);
                data.modules.forEach((module, index) => {
                    console.log(`      ${index + 1}. [${module.type.toUpperCase()}] ${module.instruction}`);
                    console.log(`         ${module.description}`);
                    if (module.type === 'h5p') {
                        console.log(`         Library: ${module.library}, Count: ${module.count}`);
                    } else {
                        console.log(`         Module: ${module.module}, Count: ${module.count}`);
                    }
                });
            } else {
                console.error(`   ❌ Failed:`, data.error || data);
            }
        } catch (e) {
            console.error(`   ❌ Error:`, e.message);
        }
    }
}

testPlanningAPI();
