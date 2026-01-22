import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement, setSuccessMessage } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un QCM sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre du quiz
 *   - params.task (optionnel) : Description de la tâche
 *   - params.globalElement (optionnel) : Élément global (texte, image, etc.)
 *   - params.questions (requis) : Tableau de questions
 * 
 * Note: Les identifiants de connexion sont lus depuis les variables d'environnement
 * LEARNINGAPPS_EMAIL et LEARNINGAPPS_PASSWORD dans le fichier .env
 *     - question_text : Texte de la question
 *     - question_type (optionnel) : 'text' | 'image' | 'speech' | 'audio' | 'video' (défaut: 'text')
 *     - question_hint (optionnel) : Indice pour la question
 *     - answers : Tableau de réponses
 *       - answer_text : Texte de la réponse (selon le type)
 *       - answer_hint (optionnel) : Indice pour la réponse
 *       - is_correct : true/false
 *       - type (optionnel) : 'text' | 'image' | 'speech' | 'audio' | 'video' (défaut: 'text')
 *       - image_url (optionnel) : URL de l'image si type='image'
 *       - video_url (optionnel) : URL de la vidéo si type='video'
 *       - audio_url (optionnel) : URL de l'audio si type='audio'
 */
export default async function createQCM(page: Page, params: ScenarioParams) {
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);

  // 4. Sélectionner QCM
  await page.locator('div').filter({ hasText: 'QCM' }).nth(5).click();

  // 5. Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // 6. Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // 7. Remplir la tâche si fournie
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // 8. Remplir l'élément global si fourni
  if (params.globalElement) {
    await page.locator('#globalelement_btn3').click();
    await page.locator('#globalelement_text').fill(params.globalElement as string);
  }

  // 9. Remplir les questions
  const questions = params.questions as Array<{
    question_text: string;
    question_hint?: string;
    answers: Array<{
      answer_text?: string;
      answer_hint?: string;
      is_correct: boolean;
      type?: 'text' | 'image' | 'audio';
    }>;
  }>;

  if (questions && questions.length > 0) {
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const question = questions[qIndex];
      const questionNum = qIndex + 1;

      // Si ce n'est pas la première question, ajouter une nouvelle question
      if (qIndex > 0) {
        await page.getByRole('button', { name: ' Ajouter une nouvelle question' }).click();
        await page.waitForTimeout(500);
      }

      // Remplir la question selon son type
      const questionType = (question as any).question_type || 'text';

      await setContentElement(page, `question${questionNum}`, {
        type: questionType as any,
        text: question.question_text,
        hint: question.question_hint,
        image_url: (question as any).image_url,
        audio_url: (question as any).audio_url,
        video_url: (question as any).video_url
      });

      // Remplir les réponses
      if (question.answers && question.answers.length > 0) {
        for (let aIndex = 0; aIndex < question.answers.length; aIndex++) {
          const answer = question.answers[aIndex];
          const answerNum = aIndex + 1;

          // Si ce n'est pas la première réponse, ajouter une nouvelle option
          if (aIndex > 0) {
            // Utiliser le sélecteur spécifique pour cette question
            await page.locator(`#addNewListElementBtn_answers${questionNum}`).click();
            await page.waitForTimeout(500);
          }

          // Gérer le type de réponse
          const answerType = (answer.type as string) || 'text';

          await setContentElement(page, `answer${questionNum}_${answerNum}`, {
            type: answerType as any,
            text: answer.answer_text,
            hint: answer.answer_hint,
            image_url: (answer as any).image_url,
            audio_url: (answer as any).audio_url,
            video_url: (answer as any).video_url
          });

          // Cocher si correct
          if (answer.is_correct) {
            await page.locator(`#right${questionNum}_${answerNum}_btn`).click();
          }
        }
      }
    }
  }

  // Remplir le message de succès
  await setSuccessMessage(page, params.successMessage as string);

  // 10. Cliquer sur "Évaluation à la fin" (optionnel, peut être paramétré)
  if (params.evaluationAtEnd !== false) {
    await page.getByRole('button', { name: 'Évaluation à la fin' }).click();
  }

  // 11. Afficher un aperçu (optionnel)
  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  const previewFrame = page.locator('iframe').contentFrame();
  if (previewFrame) {
    const innerFrame = previewFrame.locator('#frame').contentFrame();
    if (innerFrame) {
      await innerFrame.getByRole('button', { name: 'OK' }).click();
    }
  }

  // 12. Sauvegarder
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // 13. Attendre la redirection vers la page de l'app créée
  // L'URL peut être soit /display?v=... soit /{id}
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

