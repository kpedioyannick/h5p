import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Texte à trous" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.titel (optionnel) : En-tête 1 (avec type: 'text' | 'image' | 'speech' | 'audio' | 'video')
 *   - params.untertitel (optionnel) : En-tête 2 (avec type: 'text' | 'image' | 'speech' | 'audio' | 'video')
 *   - params.clozetext (requis) : Texte avec des trous (utiliser -1-, -2-, -3- pour les trous)
 *   - params.clozes (requis) : Tableau des réponses pour chaque trou
 *     - answer : Réponse pour le trou
 */
export default async function createFillblanks(page: Page, params: ScenarioParams) {
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);

  // Sélectionner "Texte à trous"
  await page.locator('div').filter({ hasText: 'Texte à trous' }).nth(5).click();

  // Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche si fournie
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Remplir l'en-tête 1 (titel) selon son type
  if (params.titel) {
    const titel = params.titel as { text?: string; hint?: string; type?: string; image_url?: string; audio_url?: string; video_url?: string };
    await setContentElement(page, 'titel', {
      type: (titel.type || 'text') as any,
      text: titel.text,
      hint: titel.hint,
      image_url: titel.image_url,
      audio_url: titel.audio_url,
      video_url: titel.video_url
    });
  }

  // Remplir l'en-tête 2 (untertitel) selon son type
  if (params.untertitel) {
    const untertitel = params.untertitel as { text?: string; hint?: string; type?: string; image_url?: string; audio_url?: string; video_url?: string };
    await setContentElement(page, 'untertitel', {
      type: (untertitel.type || 'text') as any,
      text: untertitel.text,
      hint: untertitel.hint,
      image_url: untertitel.image_url,
      audio_url: untertitel.audio_url,
      video_url: untertitel.video_url
    });
  }

  // Remplir le texte à trous
  const clozetext = params.clozetext as string;
  if (!clozetext) {
    throw new Error('clozetext is required');
  }
  
  await page.locator('#clozetext').fill(clozetext);

  // Remplir les réponses pour chaque trou
  const clozes = params.clozes as Array<{ answer: string }>;
  if (clozes && clozes.length > 0) {
    for (let i = 0; i < clozes.length; i++) {
      const cloze = clozes[i];
      const clozeIndex = i + 1;
      
      // Si ce n'est pas le premier trou, ajouter un élément
      if (i > 0) {
        await page.getByRole('button', { name: ' ajouter un élément' }).click();
        await page.waitForTimeout(500);
      }
      
      // Remplir la réponse
      await page.locator(`#cloze${clozeIndex}`).fill(cloze.answer);
    }
  }

  // Afficher un aperçu
  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  const previewFrame = page.locator('iframe').contentFrame();
  if (previewFrame) {
    const innerFrame = previewFrame.locator('#frame').contentFrame();
    if (innerFrame) {
      await innerFrame.getByRole('button', { name: 'OK' }).click();
    }
  }

  // Sauvegarder
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // Gérer la popup de confirmation si elle apparaît
  try {
    const confirmFrame = page.locator('#frame').contentFrame();
    if (confirmFrame) {
      const innerConfirmFrame = confirmFrame.locator('#frame').contentFrame();
      if (innerConfirmFrame) {
        await innerConfirmFrame.getByRole('button', { name: 'OK' }).click({ timeout: 3000 });
      }
    }
  } catch {
    // Popup non présente, continuer
  }

  // Attendre la redirection vers la page de l'app créée
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

