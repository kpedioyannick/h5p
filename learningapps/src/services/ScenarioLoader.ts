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
   * Vérifie si un scénario existe
   */
  scenarioExists(platform: Platform, moduleName: string): boolean {
    try {
      const tsPath = join(__dirname, '..', 'scenarios', platform, `${moduleName}.ts`);
      const jsPath = join(__dirname, '..', 'scenarios', platform, `${moduleName}.js`);
      return existsSync(tsPath) || existsSync(jsPath);
    } catch {
      return false;
    }
  }

  /**
   * Obtient le chemin complet d'un scénario
   */
  getScenarioPath(platform: Platform, moduleName: string): string {
    const tsPath = join(__dirname, '..', 'scenarios', platform, `${moduleName}.ts`);
    const jsPath = join(__dirname, '..', 'scenarios', platform, `${moduleName}.js`);
    return existsSync(tsPath) ? tsPath : jsPath;
  }
}
