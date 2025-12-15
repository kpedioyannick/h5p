import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Course de chevaux" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.help (optionnel) : Texte d'aide
 *   - params.questions (requis) : Tableau de questions
 *     - content : Contenu de la question (avec type: 'text' | 'image' | 'speech' | 'audio' | 'video')
 *       - text : Texte de la question
 *       - hint : Indice
 *       - type : Type de contenu
 *       - image_url : URL de l'image (si type='image')
 *     - answers : Tableau de réponses (2 réponses par question)
 *       - content : Contenu de la réponse (avec type: 'text' | 'image' | 'speech' | 'audio' | 'video')
 *       - is_correct : true/false pour marquer la réponse comme correcte
 */
export default async function createHorseRace(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  await page.locator('div').filter({ hasText: 'Course de chevaux' }).nth(5).click();
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  const questions = (params.questions || []) as Array<{
    content?: { text?: string; hint?: string; type?: string; image_url?: string; audio_url?: string; video_url?: string };
    question?: string; // Alias
    answers: Array<{
      content?: { text?: string; hint?: string; type?: string; image_url?: string; audio_url?: string; video_url?: string };
      is_correct: boolean;
    }> | string[]; // Alias (array of correct answers)
    wrongAnswers?: string[]; // Alias (array of wrong answers)
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
      let qContent = question.content;
      if (!qContent && question.question) {
        qContent = { text: question.question, type: 'text' };
      } else if (qContent && (qContent as any).content) {
        // Handle nested content object if present
        if (typeof (qContent as any).content === 'string') {
          qContent = { ...qContent, text: (qContent as any).content };
        } else {
          qContent = { ...qContent, ...(qContent as any).content };
        }
      }

      if (qContent) {
        await setContentElement(page, `q${questionNum}`, {
          type: (qContent.type || 'text') as any,
          text: qContent.text,
          hint: qContent.hint,
          image_url: qContent.image_url,
          audio_url: qContent.audio_url,
          video_url: qContent.video_url
        }, {
          useButtonText: true,
          buttonPrefix: `q${questionNum}_buttons`
        });
      }

      // Remplir les réponses (2 par question)
      let answersList: Array<{ content: any, is_correct: boolean }> = [];

      if (question.answers && typeof question.answers[0] === 'string') {
        // Format simplifié: answers = ['Correct'], wrongAnswers = ['Wrong']
        const correct = (question.answers as string[]).map(a => ({ content: { text: a, type: 'text' }, is_correct: true }));
        const wrong = (question.wrongAnswers || []).map(a => ({ content: { text: a, type: 'text' }, is_correct: false }));
        answersList = [...correct, ...wrong];
      } else if (question.answers) {
        answersList = question.answers as any;
      }

      if (answersList.length > 0) {
        for (let aIndex = 0; aIndex < Math.min(answersList.length, 2); aIndex++) {
          const answer = answersList[aIndex];
          const answerNum = aIndex + 1;

          let aContent = answer.content;
          if (aContent && (aContent as any).content) {
            if (typeof (aContent as any).content === 'string') {
              aContent = { ...aContent, text: (aContent as any).content };
            } else {
              aContent = { ...aContent, ...(aContent as any).content };
            }
          }

          await setContentElement(page, `a${questionNum}_${answerNum}`, {
            type: (aContent?.type || 'text') as any,
            text: aContent?.text,
            hint: aContent?.hint,
            image_url: aContent?.image_url,
            audio_url: aContent?.audio_url,
            video_url: aContent?.video_url
          }, {
            useButtonText: true,
            buttonPrefix: `a${questionNum}_${answerNum}_buttons`
          });

          // Marquer la réponse comme correcte si nécessaire
          if (answer.is_correct) {
            try {
              await page.locator(`#a${questionNum}_${answerNum}_right`).click({ timeout: 2000 });
            } catch {
              console.log(`Note: Could not mark answer ${answerNum} as correct for question ${questionNum}`);
            }
          }
        }
      }
    }
  }

  if (params.help) {
    await page.locator('#LearningApp_help').fill(params.help as string);
  }

  // Afficher un aperçu (optionnel)
  if (params.preview !== false) {
    await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  }

  // Sauvegarder
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // Attendre la redirection vers la page de l'app créée
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

