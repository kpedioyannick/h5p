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

  // Naviguer directement vers le template "Quiz avec saisie de texte"
  await page.goto('https://learningapps.org/create?new=74');

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche (Consigne)
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

      // Remplir la question (utilise setContentElement pour gérer Texte, Image, etc.)
      if (question.question) {
        // Dans ce module, les IDs pour setContentElement sont "content1", "content2", ...
        await setContentElement(page, `content${questionNum}`, {
          type: (question.question.type || 'text') as any,
          text: question.question.text,
          hint: question.question.hint,
          image_url: question.question.image_url
        });
      }

      // Remplir la réponse (Solution)
      if (question.answer) {
        await page.locator(`#solution${questionNum}`).fill(question.answer);
      }
    }
  }

  // Réglages (Settings)
  const toggleSetting = async (inputId: string, btnId: string, desiredValue: boolean) => {
    try {
      const currentValue = await page.locator(inputId).inputValue();
      const isChecked = currentValue === 'true';
      if (isChecked !== desiredValue) {
        await page.locator(btnId).click();
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.warn(`[TextInputQuiz] Could not toggle setting ${btnId}`);
    }
  };

  // Saisie sensible à la casse
  await toggleSetting('#casesense', '#casesense_btn', params.case_sensitive === true);

  // La saisie doit seulement contenir la réponse (Contenu partiel)
  await toggleSetting('#partof', '#partof_btn', params.partialMatch === true);

  // Ordre aléatoire
  await toggleSetting('#randomOrder', '#randomOrder_btn', params.randomOrder === true);

  // Afficher l'aide après 3 erreurs
  await toggleSetting('#useHelp', '#useHelp_btn', params.showHelp === true);

  // Feedback final
  if (params.feedback) {
    await page.locator('#feedback').fill(params.feedback as string);
  }

  // Aide (Indice global)
  if (params.help || params.indice) {
    const helpText = (params.help || params.indice) as string;
    await page.locator('#LearningApp_help').fill(helpText);
  }

  // Aperçu
  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();

  try {
    const previewFrame = page.locator('iframe').contentFrame();
    if (previewFrame) {
      const innerFrame = previewFrame.locator('#frame').contentFrame();
      if (innerFrame) {
        await innerFrame.getByRole('button', { name: 'OK' }).click({ timeout: 5000 });
      }
    }
  } catch (err) {
    console.warn('[TextInputQuiz] Preview OK button not found or timed out.');
  }

  // Enregistrer
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // Attendre la redirection
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

