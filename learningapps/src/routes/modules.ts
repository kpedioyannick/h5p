// Routes API pour lister les modules disponibles

import { Router, Request, Response } from 'express';
import { ScenarioLoader } from '../services/ScenarioLoader.js';

const router = Router();
const scenarioLoader = new ScenarioLoader();

/**
 * GET /api/modules/learningapps
 * Liste tous les modules LearningApps disponibles (scénarios enregistrés)
 */
router.get('/learningapps', (req: Request, res: Response) => {
  try {
    const modules = scenarioLoader.listScenarios('learningapps');
    
    res.json({
      platform: 'learningapps',
      count: modules.length,
      modules: modules.map(name => ({
        name,
        label: name, // TODO: Ajouter un fichier de configuration pour les labels
        description: `Scénario enregistré pour ${name}`
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list LearningApps modules',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/modules
 * Liste tous les providers et leurs modules
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const learningAppsModules = scenarioLoader.listScenarios('learningapps');

    res.json({
      providers: [
        {
          name: 'learningapps',
          label: 'LearningApps',
          moduleCount: learningAppsModules.length
        }
      ],
      totalModules: learningAppsModules.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list modules',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

