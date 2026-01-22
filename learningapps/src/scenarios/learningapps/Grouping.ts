import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement, setSuccessMessage } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Regroupement" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.help (optionnel) : Texte d'aide
 *   - params.successMessage (optionnel) : Message de succès
 *   - params.clusters (requis) : Tableau de groupes
 *     - name : Nom du groupe (avec type: 'text' | 'image' | 'speech' | 'audio' | 'video')
 *       - text : Texte (si type='text')
 *       - hint : Indice
 *       - image_url : URL de l'image (si type='image')
 *     - items : Tableau d'éléments dans ce groupe
 *       - text : Texte (si type='text')
 *       - hint : Indice
 *       - type : 'text' | 'image' | 'speech' | 'audio' | 'video'
 *       - image_url : URL de l'image (si type='image')
 */
export default async function createGrouping(page: Page, params: ScenarioParams) {
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);

  // Sélectionner "Regroupement"
  await page.locator('div').filter({ hasText: 'Regroupement' }).nth(5).click();

  // Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche si fournie
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Remplir les groupes (clusters)
  const clusters = (params.clusters || (params as any).groups) as Array<{
    name: { text?: string; hint?: string; type?: string; image_url?: string } | string;
    items: Array<{ text?: string; hint?: string; type?: string; image_url?: string } | string>;
  }>;

  if (clusters && clusters.length > 0) {
    for (let cIndex = 0; cIndex < clusters.length; cIndex++) {
      const cluster = clusters[cIndex];
      const clusterNum = cIndex + 1;

      // Remplir le nom du groupe (cluster)
      // Helper to process content
      const processContent = (item: any) => {
        if (!item) return undefined;
        let content = item;
        if ((item as any).content) {
          if (typeof (item as any).content === 'string') {
            content = { ...item, text: (item as any).content };
          } else {
            content = { ...item, ...(item as any).content };
          }
        }
        return content;
      };

      // Remplir le nom du groupe (cluster)
      if (cluster.name) {
        let clusterName = typeof cluster.name === 'string' ? { text: cluster.name, type: 'text' } : cluster.name;
        clusterName = processContent(clusterName);

        // Si c'est une image et que ce n'est pas le premier cluster, vider d'abord
        if (clusterName.type === 'image' && cIndex > 0) {
          await page.locator(`#cluster${clusterNum}_clearBtn`).click();
        }

        await setContentElement(page, `cluster${clusterNum}`, {
          type: (clusterName.type || 'text') as any,
          text: clusterName.text,
          hint: (clusterName as any).hint,
          image_url: (clusterName as any).image_url,
          audio_url: (clusterName as any).audio_url,
          video_url: (clusterName as any).video_url
        });

        // Remplir les items du groupe
        if (cluster.items && cluster.items.length > 0) {
          for (let iIndex = 0; iIndex < cluster.items.length; iIndex++) {
            const item = cluster.items[iIndex];
            const itemNum = iIndex + 1;

            // Si ce n'est pas le premier item, ajouter un nouvel élément
            if (iIndex > 0) {
              await page.locator(`#addNewListElementBtn_clusteritems${clusterNum}`).click();
              await page.waitForTimeout(500);
            }

            // Remplir l'item selon son type
            let itemObj = typeof item === 'string' ? { text: item, type: 'text' } : item;
            itemObj = processContent(itemObj);

            await setContentElement(page, `v${clusterNum}_${itemNum}`, {
              type: (itemObj.type || 'text') as any,
              text: itemObj.text,
              hint: (itemObj as any).hint,
              image_url: (itemObj as any).image_url,
              audio_url: (itemObj as any).audio_url,
              video_url: (itemObj as any).video_url
            }, {
              useButtonText: true,
              buttonPrefix: `v${clusterNum}_${itemNum}_buttons`
            });
          }
        }
      }
    }
  }

  // Remplir le texte d'aide si fourni
  if (params.help) {
    await page.locator('#LearningApp_help').fill(params.help as string);
  }

  // Remplir le message de succès
  await setSuccessMessage(page, params.successMessage as string);

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

  // Attendre la redirection vers la page de l'app créée
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

