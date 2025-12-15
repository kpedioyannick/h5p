
async function testMillionaire() {
    try {
        console.log('Testing Millionaire creation...');
        const response = await fetch('http://localhost:3000/api/content/learningapps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: 'Millionaire',
                title: 'Test Millionaire Automation',
                params: {
                    task: 'Win the million!',
                    levels: [
                        {
                            question: { text: 'Easy Question', type: 'text' },
                            answers: ['Correct', 'Wrong', 'Wrong', 'Wrong']
                        },
                        {
                            question: { text: 'Hard Question', type: 'text' },
                            answers: ['Correct', 'Wrong', 'Wrong', 'Wrong']
                        }
                    ]
                }
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('✅ Success:', data);
        } else {
            console.error('❌ Failed:', data);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testMillionaire();
