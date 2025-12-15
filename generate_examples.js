const axios = require('axios');

const API_URL = 'http://localhost:3000/api/h5p/generate';

const examples = [
    {
        name: 'Fill in the Blanks',
        library: 'H5P.Blanks 1.14',
        params: {
            text: "<p>Oslo est la capitale de la *Norvège:C'est un pays scandinave*.</p>",
            questions: ["<p>Oslo est la capitale de la *Norvège:C'est un pays scandinave*.</p>"],
            overallFeedback: [{ from: 0, to: 100 }]
        }
    },
    {
        name: 'Dialog Cards',
        library: 'H5P.Dialogcards 1.9',
        params: {
            title: "Apprentissage des langues",
            dialogs: [
                {
                    text: "Hello",
                    answer: "Bonjour",
                    tips: {
                        text: "Salutation courante",
                        answer: "En français"
                    }
                },
                {
                    text: "Goodbye",
                    answer: "Au revoir",
                    tips: {
                        text: "Pour partir",
                        answer: "En deux mots"
                    }
                }
            ]
        }
    },
    {
        name: 'Essay',
        library: 'H5P.Essay 1.5',
        params: {
            taskDescription: "<p>Décrivez l'intrigue de Hamlet.</p>",
            solution: {
                sample: "Hamlet est une tragédie..."
            },
            keywords: [
                { keyword: "Hamlet", options: { points: 1, occurrences: 1 } }
            ]
        }
    },
    {
        name: 'Flashcards',
        library: 'H5P.Flashcards 1.7',
        params: {
            cards: [
                {
                    text: "Cat",
                    answer: "Chat",
                    tip: "Animal domestique qui miaule"
                },
                {
                    text: "Dog",
                    answer: "Chien",
                    tip: "Animal domestique qui aboie"
                }
            ]
        }
    },
    {
        name: 'Guess the Answer',
        library: 'H5P.GuessTheAnswer 1.5',
        params: {
            taskDescription: "Qu'est-ce que c'est ?",
            solutionLabel: "Cliquez pour voir la réponse",
            solutionText: "C'est un mystère."
        }
    },
    {
        name: 'Question Set',
        library: 'H5P.QuestionSet 1.20',
        params: {
            questions: [
                {
                    library: "H5P.TrueFalse 1.8",
                    params: {
                        question: "<p>La terre est plate.</p>",
                        correct: "false",
                        behaviour: {
                            enableRetry: true
                        },
                        confirmCheck: {
                            header: "Terminer ?",
                            body: "Êtes-vous sûr de vouloir terminer ?",
                            cancelLabel: "Annuler",
                            confirmLabel: "Terminer"
                        }
                    }
                },
                {
                    library: "H5P.MultiChoice 1.16",
                    params: {
                        question: "<p>Quelle est la couleur du ciel ?</p>",
                        answers: [
                            {
                                text: "Bleu",
                                correct: true,
                                tipsAndFeedback: { tip: "Regarde en haut !" }
                            },
                            {
                                text: "Vert",
                                correct: false,
                                tipsAndFeedback: { tip: "C'est la couleur de l'herbe." }
                            }
                        ]
                    }
                }
            ]
        }
    },
    {
        name: 'Summary',
        library: 'H5P.Summary 1.10',
        params: {
            summaries: [
                {
                    subContentId: "summary-1",
                    tips: ["Ceci est un indice pour le résumé"],
                    summary: ["<p>Déclaration correcte</p>", "<p>Déclaration incorrecte</p>"]
                }
            ]
        }
    },
    {
        name: 'Speak the Words Set',
        library: 'H5P.SpeakTheWordsSet 1.3',
        params: {
            questions: [
                {
                    library: "H5P.SpeakTheWords 1.3",
                    params: {
                        question: "<p>Dites 'Bonjour'</p>",
                        acceptedAnswers: ["Bonjour"]
                    }
                }
            ]
        }
    },
    {
        name: 'Course Presentation',
        library: 'H5P.CoursePresentation 1.26',
        params: {
            presentation: {
                slides: [
                    {
                        elements: [
                            {
                                x: 10, y: 10, width: 80, height: 10,
                                action: {
                                    library: "H5P.AdvancedText 1.1",
                                    params: { text: "<p>Bienvenue dans le cours</p>" },
                                    subContentId: "text-1",
                                    metadata: { contentType: "Text", title: "Texte" }
                                }
                            }
                        ]
                    }
                ]
            }
        }
    },
    {
        name: 'Memory Game',
        library: 'H5P.MemoryGame 1.3',
        params: {
            cards: [
                {
                    image: { path: "image.png", mime: "image/png" },
                    match: { path: "image.png", mime: "image/png" }
                }
            ]
        }
    },
    {
        name: 'Drag Text',
        library: 'H5P.DragText 1.10',
        params: {
            textField: "<p>Oslo est la capitale de la *Norvège:Pays scandinave*.</p>",
            taskDescription: "Glissez les mots"
        }
    },
    {
        name: 'Iframe Embed',
        library: 'H5P.IFrameEmbed 1.0',
        params: {
            width: "500px",
            height: "500px",
            source: "https://example.com"
        }
    },
    {
        name: 'Questionnaire',
        library: 'H5P.Questionnaire 1.3',
        params: {
            questionnaireElements: [
                {
                    libraryGroup: {
                        library: "H5P.SimpleMultiChoice 1.1",
                        params: {
                            question: "Quelle est votre couleur préférée ?",
                            alternatives: [
                                { text: "Rouge" },
                                { text: "Bleu" }
                            ]
                        }
                    },
                    requiredField: true
                }
            ]
        }
    },
    {
        name: 'Sort Paragraphs',
        library: 'H5P.SortParagraphs 0.11',
        params: {
            taskDescription: "Triez les paragraphes",
            paragraphs: ["Premier", "Deuxième", "Troisième"]
        }
    },
    {
        name: 'Timeline',
        library: 'H5P.Timeline 1.1',
        params: {
            timeline: {
                headline: "Histoire du temps",
                defaultZoomLevel: 0,
                date: [
                    {
                        startDate: "2000,1,1",
                        headline: "Le commencement",
                        text: "<p>Début de la chronologie</p>",
                        asset: {
                            media: "https://example.com/image.jpg",
                            caption: "Une image"
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'True False',
        library: 'H5P.TrueFalse 1.8',
        params: {
            question: "<p>Est-ce que cela fonctionne ?</p>",
            correct: "true"
        }
    },
    {
        name: 'Drag Question',
        library: 'H5P.DragQuestion 1.14',
        params: {
            question: {
                settings: {
                    size: { width: 500, height: 300 },
                    background: { path: "background.jpg", mime: "image/jpeg" }
                },
                task: {
                    elements: [
                        {
                            x: 10, y: 10, width: 100, height: 50,
                            dropZones: ["0"],
                            type: {
                                library: "H5P.AdvancedText 1.1",
                                params: { text: "<p>Élément à glisser</p>" },
                                subContentId: "drag-1",
                                metadata: { contentType: "Text", title: "Texte" }
                            }
                        }
                    ],
                    dropZones: [
                        {
                            x: 200, y: 10, width: 100, height: 50,
                            label: "Zone de dépôt",
                            showLabel: true,
                            correctElements: ["0"],
                            tipsAndFeedback: {
                                tip: "Déposez l'élément ici"
                            }
                        }
                    ]
                }
            }
        }
    },
    {
        name: 'Column',
        library: 'H5P.Column 1.18',
        params: {
            content: [
                {
                    content: {
                        library: "H5P.AdvancedText 1.1",
                        params: { text: "<p>Ceci est un texte dans une colonne</p>" },
                        subContentId: "col-text-1",
                        metadata: { contentType: "Text", title: "Texte" }
                    }
                },
                {
                    content: {
                        library: "H5P.TrueFalse 1.8",
                        params: {
                            question: "<p>Est-ce une colonne ?</p>",
                            correct: "true"
                        },
                        subContentId: "col-tf-1",
                        metadata: { contentType: "True/False Question", title: "Vrai/Faux" }
                    }
                }
            ]
        }
    },
    {
        name: 'Interactive Book',
        library: 'H5P.InteractiveBook 1.11',
        params: {
            bookTitle: "Mon Livre Interactif",
            chapters: [
                {
                    subContentId: "chapter-1",
                    title: "Chapitre 1",
                    params: {
                        content: [
                            {
                                content: {
                                    library: "H5P.AdvancedText 1.1",
                                    params: { text: "<p>Bienvenue dans le chapitre 1</p>" },
                                    subContentId: "ib-text-1",
                                    metadata: { contentType: "Text", title: "Texte" }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }
];

async function generateAll() {
    console.log(`Starting generation of ${examples.length} examples...`);

    for (const ex of examples) {
        try {
            console.log(`Generating ${ex.name} (${ex.library})...`);
            const response = await axios.post(API_URL, {
                library: ex.library,
                params: ex.params
            });

            if (response.data.success) {
                console.log(`✅ Success: ${ex.name} -> ${response.data.path}`);
            } else {
                console.error(`❌ Failed: ${ex.name}`, response.data);
            }
        } catch (error) {
            console.error(`❌ Error generating ${ex.name}:`, error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
    }
}

generateAll();
