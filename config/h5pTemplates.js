// H5P Templates for AI Generation
// Derived from sarah_backend/src/Enum/ModuleType.php

const TEMPLATES = {
    // H5P.Essay
    "H5P.Essay": {
        "type": "single",
        "definition": {
            "questions": [
                {
                    "question": "Énoncé de la question (peut contenir HTML)",
                    "placeholderText": "Texte indicatif pour la réponse",
                    "answer": "Exemple de réponse attendue (solution)"
                }
            ]
        },
        "mapping": (data) => {
            const q = data.questions[0];
            return {
                "taskDescription": q.question,
                "placeholder": q.placeholderText || "",
                "solution": {
                    "introduction": "Voici une réponse modèle :",
                    "sample": q.answer || ""
                },
                "behaviour": {
                    "minimumLength": 0,
                    "inputFieldSize": 10,
                    "enableRetry": true,
                    "ignoreScoring": false
                }
            };
        }
    },

    // H5P.MultiChoice
    "H5P.MultiChoice": {
        "type": "single",
        "definition": {
            "questions": [
                {
                    "question": "Énoncé de la question",
                    "answers": [
                        {
                            "text": "Texte de la réponse",
                            "correct": true, // boolean
                            "feedback": "Feedback si choisi"
                        }
                    ]
                }
            ]
        },
        "mapping": (data) => {
            // Safety check
            if (!data.questions || !data.questions[0]) {
                throw new Error("Missing 'questions' array in AI data");
            }
            const q = data.questions[0];


            return {
                "question": q.question || "Question ?",
                "answers": (q.answers || []).map((a, index) => {
                    // Handle string answers (AI often assumes this format)
                    if (typeof a === 'string') {
                        const isCorrect = (q.correctIndex !== undefined && q.correctIndex === index);
                        return {
                            "text": "<div>" + a + "</div>",
                            "correct": isCorrect,
                            "tipsAndFeedback": {
                                "chosenFeedback": "",
                                "notChosenFeedback": ""
                            }
                        };
                    }
                    // Handle object answers (Template format)
                    return {
                        "text": "<div>" + (a.text || "") + "</div>",
                        "correct": a.correct === true,
                        "tipsAndFeedback": {
                            "chosenFeedback": a.feedback || a.tipsAndFeedback?.chosenFeedback || "",
                            "notChosenFeedback": ""
                        }
                    };
                }),
                "behaviour": {
                    "enableRetry": true,
                    "enableSolutionsButton": true,
                    "enableCheckButton": true,
                    "type": "auto",
                    "singlePoint": false,
                    "randomAnswers": true,
                    "showSolutionsRequiresInput": true
                },
                "UI": {
                    "checkAnswerButton": "Vérifier",
                    "submitAnswerButton": "Soumettre",
                    "showSolutionButton": "Voir solution",
                    "tryAgainButton": "Recommencer",
                    "tipsLabel": "Indice",
                    "scoreBarLabel": "Score : :num sur :total points",
                    "tipAvailable": "Indice disponible",
                    "feedbackAvailable": "Feedback disponible",
                    "readFeedback": "Lire commentaire",
                    "wrongAnswer": "Mauvaise réponse",
                    "correctAnswer": "Bonne réponse",
                    "shouldCheck": "Devrait avoir été coché",
                    "shouldNotCheck": "N'aurait pas dû être coché",
                    "noInput": "Veuillez répondre avant de voir la solution",
                    "a11yCheck": "Vérifier les réponses.",
                    "a11yShowSolution": "Voir la solution.",
                    "a11yRetry": "Recommencer l'exercice."
                },
                "confirmCheck": {
                    "header": "Fini ?",
                    "body": "Êtes-vous sûr de vouloir finir ?",
                    "cancelLabel": "Annuler",
                    "confirmLabel": "Finir"
                },
                "confirmRetry": {
                    "header": "Recommencer ?",
                    "body": "Êtes-vous sûr de vouloir recommencer ?",
                    "cancelLabel": "Annuler",
                    "confirmLabel": "Confirmer"
                }
            };
        }
    },

    // H5P.Blanks (Fill in the Blanks)
    "H5P.Blanks": {
        "type": "single", // Usually one task, though it has multiple holes
        "definition": {
            "instruction": "Consigne claire pour l'élève",
            "text": [
                "Texte avec les mots à trouver entre *astérisques* (ex: La *capitale* de la France est *Paris*)."
            ]
        },
        "mapping": (data) => {
            return {
                "questions": Array.isArray(data.text) ? data.text : [data.text],
                "text": "Consigne : " + (data.instruction || "Remplissez les trous."), // H5P Blanks uses "text" for instruction sometimes or separate field
                // H5P.Blanks 1.14 structure:
                // { questions: ["Line 1", "Line 2"], userAnswers: [], ... }
                // Actually usually: { "questions": ["<p>Text *blank*</p>"], "media": {...} }
                // Let's stick to standard params
            };
        },
        "customMapping": (data) => {
            // Function to generate full H5P params
            return {
                "questions": Array.isArray(data.text) ? data.text : [data.text],
                "showSolutions": "Show solution",
                "tryAgain": "Try again",
                "text": data.instruction || "Remplissez les trous dans le texte ci-dessous."
            };
        }
    },

    // H5P.TrueFalse
    "H5P.TrueFalse": {
        "type": "single",
        "definition": {
            "questions": [
                {
                    "question": "Affirmation à vérifier",
                    "correct": true // boolean (true = Vrai, false = Faux)
                }
            ]
        },
        "mapping": (data) => {
            const q = data.questions[0];
            return {
                "question": q.question,
                "correct": q.correct ? "true" : "false", // H5P uses string "true"/"false" often, or boolean? Check lib.
                // Usually H5P.TrueFalse uses "correct" as "true" or "false" string in older versions, checking 1.8 implies boolean likely ok or specific logic.
                // Let's assume boolean for now, fix if needed.
                "behaviour": {
                    "enableRetry": true,
                    "enableSolutionsButton": true,
                    "confirmCheck": false
                }
            };
        }
    },

    // H5P.MarkTheWords
    "H5P.MarkTheWords": {
        "type": "single",
        "definition": {
            "taskDescription": "Déscription de la tâche: Cliquez sur les verbes...",
            "textField": "Le chat *mange* la souris.\nIl *dort* sur le canapé."
        },
        "mapping": (data) => {
            return {
                "taskDescription": data.taskDescription || "Cliquez sur les mots corrects.",
                "textField": data.textField || "Texte ici...",
                "behaviour": {
                    "enableRetry": true,
                    "enableSolutionsButton": true
                }
            };
        }
    },

    // H5P.QuestionSet 1.20
    "H5P.QuestionSet": {
        "type": "collection",
        "definition": {
            "introduction": {
                "showIntroPage": true,
                "title": "Titre du Quiz",
                "introduction": "Bienvenue dans ce quiz."
            },
            "questions": [
                {
                    "library": "H5P.MultiChoice 1.16",
                    "params": {
                        "question": "Question...",
                        "answers": [{ "text": "Reponse", "correct": true }]
                    }
                }
            ]
        },
        "mapping": (data) => {
            // Complex mapping: The AI might return a list of questions directly.
            // Ideally we iterate and map each sub-question.
            // For now, simple pass-through or basic structure.
            return {
                "questions": data.questions || [],
                "progressType": "byQuestion"
            };
        }
    },

    // H5P.DragText 1.10 (ModuleType.DRAG_WORDS)
    "H5P.DragText": {
        "type": "single",
        "definition": {
            "taskDescription": "Glissez les mots dans les trous.",
            "textField": "Paris est la *capitale* de la *France*."
        },
        "mapping": (data) => {
            return {
                "taskDescription": data.taskDescription || "Glissez les mots corrects.",
                "textField": data.textField || "Texte...",
                "behaviour": {
                    "enableRetry": true,
                    "enableSolutionsButton": true,
                    "instantFeedback": false
                }
            };
        }
    },

    // H5P.Dialogcards 1.9
    "H5P.Dialogcards": {
        "type": "collection",
        "definition": {
            "title": "Titre",
            "description": "Description",
            "dialogs": [
                {
                    "text": "Face avant (Question)",
                    "answer": "Face arrière (Réponse)",
                    "tips": { "front": "Indice avant" }
                }
            ]
        },
        "mapping": (data) => {
            return {
                "title": data.title || "Cartes de dialogue",
                "description": data.description || "",
                "dialogs": (data.dialogs || []).map(d => ({
                    "text": d.text,
                    "answer": d.answer,
                    "tips": d.tips || {}
                }))
            };
        }
    },

    // H5P.Flashcards 1.5
    "H5P.Flashcards": {
        "type": "collection",
        "definition": {
            "cards": [
                {
                    "text": "Question",
                    "answer": "Réponse",
                    "tip": "Indice"
                }
            ]
        },
        "mapping": (data) => {
            return {
                "cards": (data.cards || []).map(c => ({
                    "text": c.text,
                    "answer": c.answer,
                    "tip": c.tip || ""
                }))
            };
        }
    },

    // H5P.SpeakTheWordsSet 1.3
    "H5P.SpeakTheWordsSet": {
        "type": "collection",
        "definition": {
            "introduction": {
                "introductionTitle": "Titre",
                "introductionText": "Intro..."
            },
            "questions": [
                {
                    "question": "Question orale",
                    "acceptedAnswers": ["Réponse 1", "Réponse 2"]
                }
            ]
        },
        "mapping": (data) => {
            return {
                "questions": (data.questions || []).map(q => ({
                    "library": "H5P.SpeakTheWords 1.3", // It wraps standard SpeakTheWords
                    "params": {
                        "question": q.question,
                        "acceptedAnswers": q.acceptedAnswers || []
                    }
                }))
            };
        }
    },

    // H5P.SingleChoiceSet 1.11
    "H5P.SingleChoiceSet": {
        "type": "collection",
        "definition": {
            "choices": [
                {
                    "question": "Question ?",
                    "answers": ["Bonne réponse", "Mauvaise 1", "Mauvaise 2"]
                }
            ]
        },
        "mapping": (data) => {
            return {
                "choices": (data.choices || []).map(c => {
                    let answers = c.answers || [];
                    // If answers are objects (AI output), normalize to strings and ensure correct is first
                    if (answers.length > 0 && typeof answers[0] === 'object') {
                        // Sort so that 'correct: true' comes first
                        answers.sort((a, b) => (b.correct === true ? 1 : -1));
                        answers = answers.map(a => a.text || "");
                    }

                    // Wrap in HTML <p> if not present (heuristic)
                    answers = answers.map(a => a.trim().startsWith('<p>') ? a : `<p>${a}</p>`);

                    return {
                        "question": c.question.startsWith('<p>') ? c.question : `<p>${c.question}</p>`,
                        "answers": answers
                    };
                })
            };
        }
    },

    // H5P.Timeline 1.1
    "H5P.Timeline": {
        "type": "collection",
        "definition": {
            "timeline": {
                "headline": "Titre Frise",
                "defaultZoomLevel": "1",
                "date": [
                    {
                        "startDate": "2023,01,01",
                        "headline": "Événement 1",
                        "text": "Description..."
                    }
                ]
            }
        },
        "mapping": (data) => {
            return {
                "timeline": data.timeline || {}
            };
        }
    },

    // H5P.SortParagraphs 0.11
    "H5P.SortParagraphs": {
        "type": "collection",
        "definition": {
            "taskDescription": "Remettez dans l'ordre",
            "paragraphs": ["Paragraphe 1", "Paragraphe 2"]
        },
        "mapping": (data) => {
            return {
                "taskDescription": data.taskDescription || "Triez les paragraphes.",
                "paragraphs": data.paragraphs || []
            };
        }
    },

    // H5P.Dictation 1.0 (Note: Requires audio usually, text-only verification might be limited)
    "H5P.Dictation": {
        "type": "collection",
        "definition": {
            "sentenceDescription": "Écoutez et écrivez",
            "sentences": [
                {
                    "text": "Phrase à écrire",
                    "description": "Description (facultative)"
                }
            ]
        },
        "mapping": (data) => {
            return {
                "sentences": (data.sentences || []).map(s => ({
                    "text": s.text,
                    "description": s.description || ""
                    // Audio missing
                }))
            };
        }
    },

    // H5P.InteractiveBook 1.4
    "H5P.InteractiveBook": {
        "type": "collection",
        "definition": {
            "title": "Titre du livre",
            "chapters": [
                {
                    "title": "Chapitre 1",
                    "params": { "content": [] }
                }
            ]
        },
        "mapping": (data) => {
            return {
                "bookTitle": data.title || "Livre interactif",
                "chapters": data.chapters || []
            };
        }
    },

    // H5P.IFrameEmbed 1.0
    "H5P.IFrameEmbed": {
        "type": "single",
        "definition": {
            "title": "Title",
            "src": "https://example.com/page",
            "width": "100%",
            "height": "600px"
        },
        "mapping": (data) => {
            return {
                "source": data.iframe?.src || data.src || "about:blank",
                "width": "100%",
                "minWidth": "300px",
                "height": data.iframe?.height || "600px",
                "resizeSupported": false
            };
        }
    },

    // H5P.Summary 1.10
    "H5P.Summary": {
        "type": "collection",
        "definition": {
            "intro": "Introduction text",
            "summaries": [
                {
                    "summary": ["Correct statement", "Wrong statement"],
                    "tip": "Optional tip"
                }
            ]
        },
        "mapping": (data) => {
            return {
                "intro": data.intro || "Choose the correct statement.",
                "summaries": (data.summaries || []).map(s => ({
                    "summary": (s.summary || []).map(text => text.startsWith('<p>') ? text : `<p>${text}</p>`),
                    "tip": s.tip || ""
                }))
            };
        }
    },

    // H5P.Questionnaire 1.3
    "H5P.Questionnaire": {
        "type": "collection",
        "definition": {
            "questions": [
                {
                    "type": "SimpleMultiChoice",
                    "question": "Question/Label",
                    "alternatives": ["Yes", "No"],
                    "required": false
                }
            ]
        },
        "mapping": (data) => {
            return {
                "questionnaireElements": (data.questions || []).map(q => {
                    // Default to SimpleMultiChoice for checked items
                    const isMulti = q.alternatives && q.alternatives.length > 0;
                    if (isMulti) {
                        return {
                            "library": {
                                "library": "H5P.SimpleMultiChoice 1.1",
                                "params": {
                                    "question": q.question || "Question?",
                                    "alternatives": (q.alternatives || ["Yes", "No"]).map(a => ({
                                        "text": a,
                                        "feedback": { "chosenFeedback": "", "notChosenFeedback": "" }
                                    })),
                                    "inputType": "checkbox"
                                },
                                "metadata": { "contentType": "Simple Multi Choice", "title": "Simple Multi Choice", "license": "U" }
                            },
                            "requiredField": q.required || false
                        };
                    } else {
                        // Assumption: Open ended if no alternatives
                        return {
                            "library": {
                                "library": "H5P.OpenEndedQuestion 1.0",
                                "params": {
                                    "question": q.question || "Question?",
                                    "placeholderText": "Your answer...",
                                    "inputRows": "1"
                                },
                                "metadata": { "contentType": "Open Ended Question", "title": "Open Ended Question", "license": "U" }
                            },
                            "requiredField": q.required || false
                        };
                    }
                }),
                "successScreenOptions": {
                    "enableSuccessScreen": true,
                    "successMessage": "You have completed the questionnaire."
                }
            };
        }
    },

    // H5P.Accordion 1.0
    "H5P.Accordion": {
        "type": "collection",
        "definition": {
            "panels": [
                {
                    "title": "Title",
                    "content": "Content text"
                }
            ]
        },
        "mapping": (data) => {
            return {
                "panels": (data.panels || []).map(p => ({
                    "title": p.title || "Title",
                    "content": {
                        "params": {
                            "text": (p.content || "").startsWith('<') ? p.content : `<p>${p.content}</p>`
                        },
                        "library": "H5P.AdvancedText 1.1",
                        "metadata": { "contentType": "Text", "title": "Text", "license": "U" },
                        "subContentId": "sub-" + Math.random().toString(36).substr(2, 9)
                    }
                }))
            };
        }
    },

    // H5P.GuessTheAnswer 1.5
    "H5P.GuessTheAnswer": {
        "type": "single",
        "definition": {
            "taskDescription": "Question",
            "solutionText": "The answer"
        },
        "mapping": (data) => {
            let sol = data.solutionText || "Answer";
            if (typeof sol === 'object') {
                // Formatting helper for complex AI output
                const format = (obj) => {
                    if (Array.isArray(obj)) return `<ul>${obj.map(i => `<li>${format(i)}</li>`).join('')}</ul>`;
                    if (typeof obj === 'object' && obj !== null) {
                        return `<ul>${Object.entries(obj).map(([k, v]) => `<li><b>${k}:</b> ${format(v)}</li>`).join('')}</ul>`;
                    }
                    return String(obj);
                };
                sol = format(sol);
            }

            return {
                "taskDescription": (data.taskDescription || "Question?").startsWith('<') ? data.taskDescription : `<p>${data.taskDescription}</p>`,
                "solutionLabel": "Click to see answer",
                "solutionText": sol,
                "media": { "params": {} }
            };
        }
    }
};

module.exports = TEMPLATES;
