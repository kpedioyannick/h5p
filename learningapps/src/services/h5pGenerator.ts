import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration paths (can be overridden by env vars)
const H5P_CONTENT_DIR = process.env.H5P_CONTENT_PATH || path.resolve(__dirname, '../../../content');
const H5P_LIBRARIES_DIR = process.env.H5P_LIBRARIES_PATH || path.resolve(__dirname, '../../../libraries');

interface LibraryDependency {
    machineName: string;
    majorVersion: number;
    minorVersion: number;
}

interface H5PContentResult {
    path: string;
    folder: string;
    id: string;
    iframeUrl: string;
}

export class H5PGenerator {

    constructor() {
        // Ensure directories exist
        fs.ensureDirSync(H5P_CONTENT_DIR);
        // Libraries dir should already exist and be populated
    }

    private async getDependencies(machineName: string, major: number, minor: number, loadedDeps = new Set<string>()): Promise<LibraryDependency[]> {
        const depKey = `${machineName}-${major}.${minor}`;
        if (loadedDeps.has(depKey)) {
            return [];
        }
        loadedDeps.add(depKey);

        const libraryDir = path.join(H5P_LIBRARIES_DIR, `${machineName}-${major}.${minor}`);
        const libraryJsonPath = path.join(libraryDir, 'library.json');

        if (!await fs.pathExists(libraryJsonPath)) {
            console.warn(`Library not found: ${machineName} ${major}.${minor}`);
            return [];
        }

        const libraryData = await fs.readJson(libraryJsonPath);
        let dependencies: LibraryDependency[] = [];

        if (libraryData.preloadedDependencies) {
            for (const dep of libraryData.preloadedDependencies) {
                dependencies.push(dep);
                const subDeps = await this.getDependencies(dep.machineName, dep.majorVersion, dep.minorVersion, loadedDeps);
                dependencies = dependencies.concat(subDeps);
            }
        }

        if (libraryData.editorDependencies) {
            for (const dep of libraryData.editorDependencies) {
                dependencies.push(dep);
                const subDeps = await this.getDependencies(dep.machineName, dep.majorVersion, dep.minorVersion, loadedDeps);
                dependencies = dependencies.concat(subDeps);
            }
        }

        return dependencies;
    }

    private findLibrariesInContent(obj: any, found: LibraryDependency[] = []): LibraryDependency[] {
        if (!obj || typeof obj !== 'object') return found;

        if (obj.library && typeof obj.library === 'string') {
            // Format: "H5P.MultiChoice 1.16"
            const parts = obj.library.split(' ');
            if (parts.length === 2) {
                const name = parts[0];
                const versionParts = parts[1].split('.');
                if (versionParts.length >= 2) {
                    found.push({
                        machineName: name,
                        majorVersion: parseInt(versionParts[0]),
                        minorVersion: parseInt(versionParts[1])
                    });
                }
            }
        }

        for (const key in obj) {
            this.findLibrariesInContent(obj[key], found);
        }
        return found;
    }

    public async generate(library: string, params: any): Promise<H5PContentResult> {
        if (!library || !params) {
            throw new Error('Missing library or params');
        }

        // Parse main library version
        let mainMachineName, mainMajor, mainMinor;
        if (library.includes(' ')) {
            const parts = library.split(' ');
            mainMachineName = parts[0];
            const v = parts[1].split('.');
            mainMajor = parseInt(v[0]);
            mainMinor = parseInt(v[1]);
        } else {
            throw new Error('Library must include version (e.g. "H5P.QuestionSet 1.20")');
        }

        const timestamp = Date.now().toString();
        const outputDir = path.join(H5P_CONTENT_DIR, timestamp);

        await fs.ensureDir(outputDir);

        // 1. Write content.json
        await fs.writeJson(path.join(outputDir, 'content.json'), params);

        // 2. Calculate dependencies
        const loadedDeps = new Set<string>();
        let allDeps: LibraryDependency[] = [];

        // Main library deps
        console.log(`Resolving dependencies for ${mainMachineName} ${mainMajor}.${mainMinor}`);
        const mainDeps = await this.getDependencies(mainMachineName, mainMajor, mainMinor, loadedDeps);
        allDeps = allDeps.concat(mainDeps);

        // Content deps
        const contentLibs = this.findLibrariesInContent(params);
        console.log(`Found content libraries:`, contentLibs);
        for (const lib of contentLibs) {
            // Add the library itself
            //allDeps.push(lib);
            const subDeps = await this.getDependencies(lib.machineName, lib.majorVersion, lib.minorVersion, loadedDeps);
            allDeps = allDeps.concat(subDeps);
        }

        // Deduplicate
        const uniqueDeps: LibraryDependency[] = [];
        const seen = new Set<string>();
        for (const dep of allDeps) {
            const key = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueDeps.push(dep);
            }
        }

        // 3. Write h5p.json
        const h5pJson = {
            title: params.metadata?.title || "Activité",
            language: "fr",
            mainLibrary: mainMachineName,
            license: "U",
            defaultLanguage: "fr",
            embedTypes: ["div"],
            preloadedDependencies: uniqueDeps,
            extraTitle: params.metadata?.title || "Activité"
        };

        await fs.writeJson(path.join(outputDir, 'h5p.json'), h5pJson);

        // 4. Generate Iframe URL
        // Read library registry to find shortName
        const registryPath = path.resolve(__dirname, '../../../libraryRegistry.json');
        let shortName = mainMachineName.toLowerCase().replace('.', '-'); // Default fallback

        try {
            if (await fs.pathExists(registryPath)) {
                const registry = await fs.readJson(registryPath);
                // Registry keys are like "H5P.Blanks"
                if (registry[mainMachineName] && registry[mainMachineName].shortName) {
                    shortName = registry[mainMachineName].shortName;
                }
            } else {
                console.warn(`Library registry not found at ${registryPath}, using fallback shortName: ${shortName}`);
            }
        } catch (e) {
            console.error('Error reading library registry:', e);
        }

        const baseUrl = process.env.H5P_BASE_URL || 'http://localhost:8080';
        const iframeUrl = `${baseUrl}/view/${shortName}/${timestamp}`;

        console.log(`Generated content at ${outputDir}`);
        return { path: outputDir, folder: timestamp, id: timestamp, iframeUrl };
    }
    public async generateInteractiveBook(modules: { type: string, id: string, title?: string }[], bookTitle?: string): Promise<H5PContentResult> {
        const chapters: any[] = [];
        const timestamp = Date.now().toString();
        const outputDir = path.join(H5P_CONTENT_DIR, timestamp);

        // Supported libraries for H5P.Column (used in Interactive Book chapters)
        // Based on H5P.Column semantics
        const supportedLibraries = [
            'H5P.Accordion', 'H5P.Agamotto', 'H5P.Audio', 'H5P.Blanks', 'H5P.Chart', 'H5P.Collage',
            'H5P.CoursePresentation', 'H5P.Dialogcards', 'H5P.DocumentationTool', 'H5P.DragQuestion',
            'H5P.DragText', 'H5P.Essay', 'H5P.GuessTheAnswer', 'H5P.Table', 'H5P.IFrameEmbed',
            'H5P.Image', 'H5P.ImageHotspots', 'H5P.ImageHotspotQuestion', 'H5P.ImageSlider',
            'H5P.InteractiveVideo', 'H5P.Link', 'H5P.MarkTheWords', 'H5P.MemoryGame',
            'H5P.MultiChoice', 'H5P.Questionnaire', 'H5P.QuestionSet', 'H5P.SingleChoiceSet',
            'H5P.Summary', 'H5P.Timeline', 'H5P.TrueFalse', 'H5P.Video'
        ];

        for (const module of modules) {
            let chapterContent: any = null;
            let title = module.title || `Module ${module.type}`;

            if (module.type === 'h5p') {
                try {
                    const contentDir = path.join(H5P_CONTENT_DIR, module.id);
                    if (await fs.pathExists(path.join(contentDir, 'h5p.json'))) {
                        const h5pJson = await fs.readJson(path.join(contentDir, 'h5p.json'));
                        const contentJson = await fs.readJson(path.join(contentDir, 'content.json'));
                        const mainLib = h5pJson.mainLibrary; // e.g., "H5P.MultiChoice"

                        title = module.title || h5pJson.title || title;

                        if (supportedLibraries.includes(mainLib)) {
                            // Native integration
                            chapterContent = {
                                library: `${mainLib} ${h5pJson.preloadedDependencies.find((d: any) => d.machineName === mainLib).majorVersion}.${h5pJson.preloadedDependencies.find((d: any) => d.machineName === mainLib).minorVersion}`,
                                params: contentJson,
                                subContentId: module.id,
                                metadata: { title: title }
                            };
                        } else {
                            // Fallback to IFrameEmbed
                            // We need to resolve the slug for the URL
                            const registryPath = path.resolve(__dirname, '../../../libraryRegistry.json');
                            let slug = mainLib.toLowerCase().replace('.', '-');
                            if (await fs.pathExists(registryPath)) {
                                const registry = await fs.readJson(registryPath);
                                if (registry[mainLib] && registry[mainLib].shortName) {
                                    slug = registry[mainLib].shortName;
                                }
                            }
                            const baseUrl = process.env.H5P_BASE_URL || 'http://localhost:8080';
                            const iframeUrl = `${baseUrl}/view/${slug}/${module.id}`;

                            chapterContent = {
                                library: 'H5P.IFrameEmbed 1.0',
                                params: {
                                    source: iframeUrl,
                                    width: "100%",
                                    height: "600px",
                                    resizeSupported: false
                                },
                                subContentId: `iframe-${module.id}`,
                                metadata: { title: title }
                            };
                        }
                    }
                } catch (e) {
                    console.error(`Error processing H5P module ${module.id}:`, e);
                }
            } else if (module.type === 'learningapps') {
                // LearningApps -> IFrameEmbed
                title = module.title || `Exercice: ${module.id}`;
                const learningAppsUrl = process.env.LEARNINGAPPS_BASE_URL ? `${process.env.LEARNINGAPPS_BASE_URL}/display?v=${module.id}` : `https://learningapps.org/display?v=${module.id}`;

                chapterContent = {
                    library: 'H5P.IFrameEmbed 1.0',
                    params: {
                        source: learningAppsUrl,
                        width: "100%",
                        height: "600px",
                        resizeSupported: false
                    },
                    subContentId: `la-${module.id}`,
                    metadata: { title: title }
                };
            }

            if (chapterContent) {
                chapters.push({
                    chapter: {
                        library: 'H5P.Column 1.18',
                        params: {
                            content: [{
                                content: chapterContent,
                                useSeparator: 'auto'
                            }]
                        },
                        subContentId: `chapter-${chapters.length}`,
                        metadata: { title: title }
                    }
                });
            }
        }

        // Construct Interactive Book content
        const bookParams = {
            chapters: chapters,
            behaviour: {
                defaultTableOfContents: true,
                progressIndicators: true,
                displaySummary: true
            },
            metadata: { title: bookTitle || "Parcours d'apprentissage" }
        };

        // Generate the book
        return this.generate('H5P.InteractiveBook 1.11', bookParams);
    }
}
