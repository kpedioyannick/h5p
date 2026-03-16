const fs = require('fs-extra');
const path = require('path');

class H5PTemplateEngine {
    constructor() {
        this.masterContentPath = path.join(__dirname, '../templates/h5p/column/content.json');
        this.masterH5PPath = path.join(__dirname, '../templates/h5p/column/h5p.json');
        this.archetypes = {};
        this.masterTemplate = null;
    }

    async loadMasterTemplate() {
        if (!await fs.pathExists(this.masterContentPath)) {
            throw new Error(`Master template not found at ${this.masterContentPath}`);
        }
        this.masterTemplate = await fs.readJson(this.masterContentPath);

        // Index archetypes by library name (simple detection)
        // We look at the 'content' array of the column
        const columnContent = this.masterTemplate.content;
        if (!Array.isArray(columnContent)) {
            throw new Error('Master template is not a valid H5P Column (missing content array)');
        }

        columnContent.forEach(item => {
            const lib = item.content.library;
            if (lib) {
                // Key = "H5P.MultiChoice" (without version for easier matching, or full string)
                // Let's use the full library string but offer lookup helpers
                const libBase = lib.split(' ')[0];
                this.archetypes[libBase] = item;
                // Also store by full lib string just in case
                this.archetypes[lib] = item;
            }
        });

        console.log(`[H5PTemplateEngine] Loaded archetypes: ${Object.keys(this.archetypes).join(', ')}`);
    }

    /**
     * Generate a new content.json based on requests
     * @param {Array} requests - [{ type: 'H5P.MultiChoice', count: 2, params: {...} }]
     */
    async generateContent(requests) {
        if (!this.masterTemplate) await this.loadMasterTemplate();

        const newContent = [];

        for (const req of requests) {
            // Find archetype
            // req.type can be "H5P.MultiChoice" or partial
            let archetype = this.archetypes[req.type];

            // Try fuzzy match if not found directly
            if (!archetype) {
                const key = Object.keys(this.archetypes).find(k => k.includes(req.type));
                if (key) archetype = this.archetypes[key];
            }

            if (!archetype) {
                console.warn(`[H5PTemplateEngine] No archetype found for type: ${req.type}`);
                continue;
            }

            for (let i = 0; i < (req.count || 1); i++) {
                // Deep clone
                const clone = JSON.parse(JSON.stringify(archetype));

                // Generate a new unique subContentId
                if (clone.content.subContentId) {
                    clone.content.subContentId = 'gen-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                }

                // Inject Data (Params)
                if (req.data && req.data[i]) {
                    const p = req.data[i];
                    const lib = clone.content.library;

                    // Common Metadata
                    if (p.title) {
                        try { clone.content.metadata.title = p.title; } catch (e) { }
                        if (clone.content.params.metadata) clone.content.params.metadata.title = p.title;
                    }

                    // --- Specific Library Mappers ---

                    // 1. MultiChoice (QCM)
                    if (lib.includes('H5P.MultiChoice')) {
                        if (p.question) clone.content.params.question = `<p>${p.question}</p>`;
                        if (p.answers && Array.isArray(p.answers)) {
                            // Map simple structure [{text, correct}] to H5P structure
                            clone.content.params.answers = p.answers.map(ans => ({
                                correct: ans.correct || false,
                                tipsAndFeedback: { tip: "", chosenFeedback: "", notChosenFeedback: "" },
                                text: `<div>${ans.text}</div>`
                            }));
                        }
                    }

                    // 2. TrueFalse
                    else if (lib.includes('H5P.TrueFalse')) {
                        if (p.question) clone.content.params.question = `<p>${p.question}</p>`;
                        if (p.correct !== undefined) clone.content.params.correct = p.correct ? "true" : "false";
                    }

                    // 3. Blanks (Fill in the Blanks)
                    else if (lib.includes('H5P.Blanks')) {
                        // Takes text like "Paris is the capital of *France*."
                        if (p.text) {
                            clone.content.params.questions = [`<p>${p.text}</p>`];
                        } else if (p.question) {
                            // Fallback if strictly question provided
                            clone.content.params.questions = [`<p>${p.question} *réponse*.</p>`];
                        }
                    }

                    // 4. DialogCards
                    else if (lib.includes('H5P.Dialogcards')) {
                        if (p.title) clone.content.params.title = `<p>${p.title}</p>`;
                        if (p.dialogs && Array.isArray(p.dialogs)) {
                            clone.content.params.dialogs = p.dialogs.map(d => ({
                                text: `<p style="text-align:center;">${d.text}</p>`,
                                answer: `<p style="text-align:center;">${d.answer}</p>`,
                                tips: {}
                            }));
                        }
                    }

                    // 5. DragText
                    else if (lib.includes('H5P.DragText')) {
                        if (p.taskDescription) clone.content.params.taskDescription = p.taskDescription;
                        if (p.text) clone.content.params.textField = p.text; // "Drop *draggable* here."
                    }

                    // 6. Summary
                    else if (lib.includes('H5P.Summary')) {
                        if (p.intro) clone.content.params.intro = `<p>${p.intro}</p>`;
                        // Summaries is array of objects { summary: [ "Correct", "Wrong", "Wrong"] }
                        if (p.summaries && Array.isArray(p.summaries)) {
                            clone.content.params.summaries = p.summaries.map(s => ({
                                summary: s.slice(0, 3).map(stmt => `<p>${stmt}</p>`), // Ensure formatting
                                tip: ""
                            }));
                        }
                    }

                    // 7. SingleChoiceSet (Question Set-like)
                    else if (lib.includes('H5P.SingleChoiceSet')) {
                        if (p.choices && Array.isArray(p.choices)) {
                            clone.content.params.choices = p.choices.map(c => ({
                                question: `<p>${c.question}</p>`,
                                answers: c.answers.map(a => `<p>${a}</p>`) // First is correct in SingleChoiceSet
                            }));
                        }
                    }

                    // 8. GuessTheAnswer
                    else if (lib.includes('H5P.GuessTheAnswer')) {
                        if (p.taskDescription) clone.content.params.taskDescription = `<p>${p.taskDescription}</p>`;
                        if (p.solutionText) clone.content.params.solutionText = p.solutionText;
                        // Media handling is complex, skip for now or use default
                    }

                    // 9. Essay
                    else if (lib.includes('H5P.Essay')) {
                        if (p.taskDescription) clone.content.params.taskDescription = `<p>${p.taskDescription}</p>`;
                        if (p.solution) clone.content.params.solution.sample = `<div>${p.solution}</div>`;
                    }

                    // 10. MarkTheWords
                    else if (lib.includes('H5P.MarkTheWords')) {
                        if (p.taskDescription) clone.content.params.taskDescription = `<p>${p.taskDescription}</p>`;
                        if (p.text) clone.content.params.textField = `<p>${p.text}</p>`; // "Click *correct* words."
                    }

                    // 11. Timeline
                    else if (lib.includes('H5P.Timeline')) {
                        // Complex structure, usually minimal header
                        if (p.headline) clone.content.params.timeline.headline = p.headline;
                    }
                }

                newContent.push(clone);
            }
        }

        // Return the full structure (Column) with the new content array
        // We clone the master template structure to keep global settings (title, etc)
        // BUT we replace the 'content' array
        const finalJson = JSON.parse(JSON.stringify(this.masterTemplate));
        finalJson.content = newContent;

        return finalJson;
    }

    async loadBookTemplate() {
        const bookPath = path.join(__dirname, '../templates/h5p/interactiveBook/content.json');
        if (!await fs.pathExists(bookPath)) {
            throw new Error(`Book template not found at ${bookPath}`);
        }
        this.bookTemplate = await fs.readJson(bookPath);
    }

    /**
     * Generate an Interactive Book
     * @param {Array} chapters - [{ title: 'Chapter 1', modules: [ { type: 'MultiChoice', ... } ] }]
     */
    async generateBook(chapters) {
        if (!this.bookTemplate) await this.loadBookTemplate();
        if (!this.masterTemplate) await this.loadMasterTemplate();

        // 1. Prepare Base Book
        const newBook = JSON.parse(JSON.stringify(this.bookTemplate));
        newBook.chapters = []; // Clear example chapters

        // 2. Get Chapter Archetype (from template or default Column)
        // The template should have at least one chapter which is a Column
        const chapterArchetype = this.bookTemplate.chapters[0];
        if (!chapterArchetype) throw new Error("Book template must have at least one chapter to use as archetype.");

        // 3. Build Chapters
        for (const chapData of chapters) {
            const newChap = JSON.parse(JSON.stringify(chapterArchetype));

            // Set ID and Title
            newChap.subContentId = 'chap-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            if (newChap.metadata) newChap.metadata.title = chapData.title;
            // Also some books use params.title? Interactive Book chapters are Columns, title is in metadata usually.

            // Generate content for this chapter (List of sub-modules)
            // We reuse generateContent logic but we only need the ARRAY of items, not the full Column wrapper
            // So we call generateContent which returns a Column structure { content: [items], ... }
            // and we extract .content

            const columnResult = await this.generateContent(chapData.modules);
            newChap.params.content = columnResult.content;

            newBook.chapters.push(newChap);
        }

        return newBook;
    }
}

module.exports = { H5PTemplateEngine };
