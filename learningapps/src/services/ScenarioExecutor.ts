// Service pour exécuter les scénarios Playwright enregistrés

import { chromium, Browser, Page } from 'playwright';
import { ScenarioParams, ScenarioResult } from '../types/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { ScenarioLoader } from './ScenarioLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ScenarioExecutor {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Exécute un scénario Playwright depuis un fichier TypeScript
   */
  async executeScenario(
    platform: 'learningapps',
    moduleName: string,
    params: ScenarioParams
  ): Promise<ScenarioResult> {
    try {
      // Lancer le navigateur en mode headed (visible)
      this.browser = await chromium.launch({
        headless: false,
        slowMo: 100 // Ralentir pour voir les actions
      });

      this.page = await this.browser.newPage();

      // Charger et exécuter le scénario depuis le fichier
      const loader = new ScenarioLoader();
      const scenarioPath = loader.getScenarioPath(platform, moduleName);
      
      // Convertir le chemin en URL pour l'import dynamique
      // Avec tsx, on peut importer directement des fichiers .ts
      const scenarioUrl = pathToFileURL(scenarioPath).href;
      
      try {
        // Utiliser dynamic import pour charger le module TypeScript
        // tsx permet d'importer directement des fichiers .ts
        const scenarioModule = await import(scenarioUrl);
        
        // Chercher la fonction exportée (peut être nommée différemment)
        const scenarioFunction = scenarioModule.default || 
                                 scenarioModule[`create${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`] ||
                                 scenarioModule[moduleName] ||
                                 Object.values(scenarioModule).find(
                                   (val: unknown) => typeof val === 'function'
                                 ) as ((page: Page, params: ScenarioParams) => Promise<void>);

        if (!scenarioFunction || typeof scenarioFunction !== 'function') {
          throw new Error(
            `No valid scenario function found in ${moduleName}.ts. ` +
            `Make sure to export default a function with signature: (page: Page, params: ScenarioParams) => Promise<void>`
          );
        }

        // Exécuter le scénario
        await scenarioFunction(this.page, params);
      } catch (importError) {
        const errorMessage = importError instanceof Error ? importError.message : String(importError);
        throw new Error(
          `Could not load scenario ${moduleName} from ${scenarioPath}. ` +
          `Make sure the file exists and exports a default function. ` +
          `Error: ${errorMessage}`
        );
      }

      // Attendre un peu pour que la page se stabilise
      await this.page.waitForTimeout(2000);

      // Récupérer l'URL résultante
      const resultUrl = this.page.url();
      
      // Extraire l'ID de l'app si possible (pour LearningApps)
      // L'URL peut être soit /display?v=... soit /{id}
      let appId: string | undefined;
      const displayMatch = resultUrl.match(/[?&]v=([^&]+)/);
      const idMatch = resultUrl.match(/\/(\d+)$/);
      appId = displayMatch ? displayMatch[1] : (idMatch ? idMatch[1] : undefined);

      // Construire l'URL d'iframe
      let iframeUrl = resultUrl;
      if (platform === 'learningapps' && appId) {
        const { LEARNINGAPPS_BASE_URL } = await import('../config/constants.js');
        iframeUrl = `${LEARNINGAPPS_BASE_URL}watch?v=${appId}`;
      }

      return {
        success: true,
        iframeUrl,
        appId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Erreur lors de l\'exécution du scénario:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      // Fermer le navigateur
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    }
  }

  /**
   * Obtient la page actuelle (pour utilisation dans les scénarios)
   */
  getPage(): Page | null {
    return this.page;
  }
}

