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
            title: params.metadata?.title || "Generated Content",
            language: "fr",
            mainLibrary: mainMachineName,
            license: "U",
            defaultLanguage: "fr",
            embedTypes: ["div"],
            preloadedDependencies: uniqueDeps
        };

        await fs.writeJson(path.join(outputDir, 'h5p.json'), h5pJson);

        console.log(`Generated content at ${outputDir}`);
        return { path: outputDir, folder: timestamp, id: timestamp };
    }
}
