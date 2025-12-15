
const scenarios = [
    {
        module: 'FillTable',
        title: 'Test FillTable Debug',
        params: {
            task: 'Fill the table',
            table: {
                rows: [
                    { cells: ['Header 1', 'Header 2'] },
                    { cells: ['Row 1 Col 1', 'Row 1 Col 2'] }
                ]
            }
        }
    },
    {
        module: 'Ordering',
        title: 'Test Ordering Debug',
        params: {
            task: 'Order numbers',
            items: [{ content: '1', type: 'text' }, { content: '2', type: 'text' }, { content: '3', type: 'text' }]
        }
    },
    {
        module: 'HorseRace',
        title: 'Test HorseRace Debug',
        params: {
            task: 'Win the race',
            questions: [
                {
                    content: { text: 'Q1', type: 'text' },
                    answers: [
                        { content: { text: 'Correct', type: 'text' }, is_correct: true },
                        { content: { text: 'Wrong', type: 'text' }, is_correct: false }
                    ]
                }
            ]
        }
    },
    {
        module: 'Pairmatching',
        title: 'Test Pairmatching Debug',
        params: {
            task: 'Match pairs',
            pairs: [
                {
                    v1: { text: 'A', type: 'text' },
                    v2: { text: 'B', type: 'text' }
                }
            ]
        }
    },
    {
        module: 'TimelineAxis',
        title: 'Test TimelineAxis Debug',
        params: {
            task: 'Place on timeline',
            items: [
                { text: 'Event 1', type: 'text', position: 1000 },
                { text: 'Event 2', type: 'text', position: 2000 }
            ]
        }
    },
    {
        module: 'Grouping',
        title: 'Test Grouping Debug',
        params: {
            task: 'Group items',
            clusters: [
                {
                    name: { text: 'Group 1', type: 'text' },
                    items: [{ text: 'Item 1', type: 'text' }]
                },
                {
                    name: { text: 'Group 2', type: 'text' },
                    items: [{ text: 'Item 2', type: 'text' }]
                }
            ]
        }
    },
    {
        module: 'WriteAnswerCards',
        title: 'Test WriteAnswerCards Debug',
        params: {
            task: 'Write answers',
            cards: [
                {
                    content: { text: 'Question 1', type: 'text' },
                    solution: 'Answer 1'
                }
            ]
        }
    }
];

async function testAll() {
    console.log('🚀 Starting Debug Test for All Scenarios...\n');

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
                console.error(`❌ ${scenario.module}: Failed`, data.error || data);
            }
        } catch (e) {
            console.error(`❌ ${scenario.module}: Error`, e.message);
        }
    }
}

testAll();
