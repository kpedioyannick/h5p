// Service pour charger les scénarios depuis les fichiers

import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Platform } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ScenarioLoader {
  /**
   * Liste tous les scénarios disponibles pour une plateforme
   */
  listScenarios(platform: Platform): string[] {
    try {
      const scenariosDir = join(
        __dirname,
        '..',
        'scenarios',
        platform
      );

      const files = readdirSync(scenariosDir);

      return files
        .filter((file: string) => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts') && file !== 'EXAMPLE.ts' && file !== 'EXAMPLE.js')
        .map((file: string) => file.replace('.ts', '').replace('.js', ''));
    } catch (error) {
      console.warn(`Could not list scenarios for ${platform}:`, error);
      return [];
    }
  }

  /**
   * Vérifie si un scénario existe (insensible à la casse)
   */
  scenarioExists(platform: Platform, moduleName: string): boolean {
    const scenarios = this.listScenarios(platform);
    return scenarios.some(s => s.toLowerCase() === moduleName.toLowerCase());
  }

  /**
   * Obtient le chemin complet d'un scénario (insensible à la casse)
   */
  getScenarioPath(platform: Platform, moduleName: string): string {
    const scenarios = this.listScenarios(platform);
    const actualName = scenarios.find(s => s.toLowerCase() === moduleName.toLowerCase());

    if (!actualName) {
      throw new Error(`Scenario ${moduleName} not found`);
    }

    const tsPath = join(__dirname, '..', 'scenarios', platform, `${actualName}.ts`);
    const jsPath = join(__dirname, '..', 'scenarios', platform, `${actualName}.js`);
    return existsSync(tsPath) ? tsPath : jsPath;
  }
}
