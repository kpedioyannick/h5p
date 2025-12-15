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
        .filter((file: string) => file.endsWith('.ts') && file !== 'EXAMPLE.ts')
        .map((file: string) => file.replace('.ts', ''));
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
      const scenarioPath = join(
        __dirname,
        '..',
        'scenarios',
        platform,
        `${moduleName}.ts`
      );
      return existsSync(scenarioPath);
    } catch {
      return false;
    }
  }

  /**
   * Obtient le chemin complet d'un scénario
   */
  getScenarioPath(platform: Platform, moduleName: string): string {
    return join(
      __dirname,
      '..',
      'scenarios',
      platform,
      `${moduleName}.ts`
    );
  }
}
