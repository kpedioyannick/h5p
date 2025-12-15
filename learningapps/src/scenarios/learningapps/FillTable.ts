import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Compléter/remplir un tableau" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.table (requis) : Tableau de données
 *     - rows : Tableau de lignes
 *       - cells : Tableau de cellules (colonnes)
 */
export default async function createFillTable(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  await page.locator('div').filter({ hasText: 'Compléter/remplir un tableau' }).nth(5).click();
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  const table = (params.table || { rows: (params as any).rows }) as {
    rows: Array<{ cells?: string[], items?: string[] }>;
  };

  if (table && table.rows && table.rows.length > 0) {
    // Remplir la première cellule (header ou première ligne)
    const firstRowData = table.rows[0];
    const firstRowCells = firstRowData.cells || firstRowData.items || [];

    if (firstRowCells.length > 0) {
      await page.locator('#content_1_1').fill(firstRowCells[0] || '');
    }

    // Ajouter des colonnes si nécessaire
    const maxCols = Math.max(...table.rows.map(r => (r.cells || r.items || []).length));
    for (let col = 2; col <= maxCols; col++) {
      await page.getByRole('button', { name: ' Ajouter une colonne' }).click();
      await page.waitForTimeout(300);

      // Remplir l'en-tête de la nouvelle colonne si présent
      if (firstRowCells[col - 1]) {
        await page.locator(`#content_1_${col}`).fill(firstRowCells[col - 1]);
      }
    }

    // Ajouter des lignes et remplir
    for (let row = 2; row <= table.rows.length; row++) {
      await page.getByRole('button', { name: ' Ajouter une ligne' }).click();
      await page.waitForTimeout(500);

      const rowData = table.rows[row - 1];
      const cells = rowData.cells || rowData.items || [];

      if (cells) {
        for (let col = 1; col <= cells.length; col++) {
          // Attendre que l'élément soit visible avant de le remplir
          const cellLocator = page.locator(`#content_${row}_${col}`);
          // Utiliser une attente plus robuste
          try {
            await cellLocator.waitFor({ state: 'visible', timeout: 5000 });
            await cellLocator.fill(cells[col - 1] || '');
          } catch (e) {
            console.log(`Warning: Could not fill cell at row ${row}, col ${col}`);
          }
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

