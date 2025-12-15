import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Jeu du millionnaire" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.levels (requis) : Tableau de niveaux (1 à 6)
 *     - question : Question du niveau
 *       - text : Texte de la question
 *       - type : 'text' | 'image' | 'speech' | 'audio' | 'video'
 *     - answers : Tableau de 4 réponses (texte)
 */
export default async function createMillionaire(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  await page.locator('div').filter({ hasText: 'Jeu du millionnaire' }).nth(5).click();
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  const levels = params.levels as Array<{
    question: { text?: string; type?: string };
    answers: string[];
  }>;

  if (levels && levels.length > 0) {
    for (let lIndex = 0; lIndex < Math.min(levels.length, 6); lIndex++) {
      const level = levels[lIndex];
      const levelNum = lIndex + 1;

      // Remplir la question
      if (level.question) {
        const questionType = level.question.type || 'text';
        if (questionType === 'text') {
          await page.locator(`#level${levelNum}_q1_text`).fill(level.question.text || '');
        } else {
          // Pour les autres types, utiliser mediacontent
          await page.locator(`#level${levelNum}_q1_mediacontent`).getByRole('textbox').fill(level.question.text || '');
        }
      }

      // Remplir les 4 réponses
      if (level.answers && level.answers.length > 0) {
        for (let aIndex = 0; aIndex < Math.min(level.answers.length, 4); aIndex++) {
          const answer = level.answers[aIndex];
          await page.locator(`textarea[name="level${levelNum}_a1_${aIndex + 1}"]`).fill(answer);
        }
      }
    }
  }

  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  const previewFrame = page.locator('iframe').contentFrame();
  if (previewFrame) {
    const innerFrame = previewFrame.locator('#frame').contentFrame();
    if (innerFrame) {
      await innerFrame.getByRole('button', { name: 'OK' }).click();
    }
  }

  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

