import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Quiz avec saisie de texte" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.questions (requis) : Tableau de questions
 *     - question : Question (avec type: 'text' | 'image' | 'speech' | 'audio' | 'video')
 *       - text : Texte de la question
 *       - hint : Indice
 *       - type : Type de contenu
 *       - image_url : URL de l'image (si type='image')
 *     - answer (requis) : Réponse attendue (texte)
 *     - feedbackOk (optionnel) : Feedback si réponse correcte
 *     - feedbackBad (optionnel) : Feedback si réponse incorrecte
 */
export default async function createTextInputQuiz(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  await page.locator('div').filter({ hasText: 'Quiz avec saisie de texte' }).nth(5).click();

  // Gérer la popup si elle apparaît
  try {
    const popupFrame = page.locator('iframe').contentFrame();
    if (popupFrame) {
      const innerPopupFrame = popupFrame.locator('#frame').contentFrame();
      if (innerPopupFrame) {
        // Prioritize closing FeedbackPanel if it covers TaskPanel
        try {
          await innerPopupFrame.locator('#AppClientFeedbackPanel').getByRole('button', { name: 'OK' }).click({ timeout: 2000, force: true });
          await page.waitForTimeout(500);
        } catch (e) { /* ignore */ }

        try {
          await innerPopupFrame.locator('#AppClientTaskPanel').getByRole('button', { name: 'OK' }).click({ timeout: 3000, force: true });
        } catch (e) { /* ignore */ }
      }
    }
  } catch {
    // Popup non présente, continuer
  }

  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  const questions = params.questions as Array<{
    question: { text?: string; hint?: string; type?: string; image_url?: string };
    answer: string;
    feedbackOk?: string;
    feedbackBad?: string;
  }>;

  if (questions && questions.length > 0) {
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const question = questions[qIndex];
      const questionNum = qIndex + 1;

      if (qIndex > 0) {
        await page.getByRole('button', { name: ' ajouter un élément' }).click();
        await page.waitForTimeout(500);
      }

      // Remplir la question
      if (question.question) {
        await setContentElement(page, `question${questionNum}`, {
          type: (question.question.type || 'text') as any,
          text: question.question.text,
          hint: question.question.hint,
          image_url: question.question.image_url
        });
      }

      // Remplir la réponse
      if (question.answer) {
        await page.locator(`#answer${questionNum}`).fill(question.answer);
      }

      // Remplir les feedbacks
      if (question.feedbackOk) {
        await page.locator(`#feedback${questionNum}ok`).fill(question.feedbackOk);
      }
      if (question.feedbackBad) {
        await page.locator(`#feedback${questionNum}bad`).fill(question.feedbackBad);
      }
    }
  }

  // 11. Afficher un aperçu (optionnel)
  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  const previewFrame = page.locator('iframe').contentFrame();
  if (previewFrame) {
    const innerFrame = previewFrame.locator('#frame').contentFrame();
    if (innerFrame) {
      await innerFrame.locator('#AppClientTaskPanel').getByRole('button', { name: 'OK' }).click({ force: true });
    }
  }

  // 12. Sauvegarder
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // 13. Attendre la redirection vers la page de l'app créée
  // L'URL peut être soit /display?v=... soit /{id}
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });

}
