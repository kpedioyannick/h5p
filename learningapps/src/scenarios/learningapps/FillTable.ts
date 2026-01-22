import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setSuccessMessage, setContentElement } from '../../services/learningapps/helpers.js';

declare const document: any;

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

  // DEBUG: Inspecter les IDs disponibles
  console.log('DEBUG: Finding potential table cell IDs...');
  const els = await page.locator('input, textarea, button, div[id^="content"]').all();
  for (const el of els.slice(0, 5)) {
    const id = await el.getAttribute('id');
    const tag = await el.evaluate(e => e.tagName);
    console.log(`DEBUG: ID=${id}, Tag=${tag}`);
  }


  const table = (params.table || { rows: (params as any).rows }) as {
    rows: Array<{ cells?: string[], items?: string[] }>;
  };

  if (table && table.rows && table.rows.length > 0) {
    // Remplir la première cellule (header ou première ligne)
    const firstRowData = table.rows[0];
    const firstRowCells = firstRowData.cells || firstRowData.items || [];

    if (firstRowCells.length > 0) {
      const cellContent = firstRowCells[0];
      const text = typeof cellContent === 'string' ? cellContent : (cellContent as any).text || '';
      await page.evaluate(({ id, val }) => {
        const el = (document as any).getElementById(id);
        if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }, { id: 'content_1_1', val: text });
    }

    // Ajouter des colonnes si nécessaire
    const maxCols = Math.max(...table.rows.map(r => (r.cells || r.items || []).length));
    for (let col = 2; col <= maxCols; col++) {
      await page.getByRole('button', { name: ' Ajouter une colonne' }).click();
      await page.waitForTimeout(300);

      // Remplir l'en-tête de la nouvelle colonne si présent
      if (firstRowCells[col - 1]) {
        const cellContent = firstRowCells[col - 1];
        const text = typeof cellContent === 'string' ? cellContent : (cellContent as any).text || '';
        const cellId = `content_1_${col}`;
        await page.evaluate(({ id, val }) => {
          const el = (document as any).getElementById(id);
          if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
        }, { id: cellId, val: text });
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
          const cellContent = cells[col - 1];
          const text = typeof cellContent === 'string' ? cellContent : (cellContent as any).text || '';

          try {
            // Utiliser l'ID direct content_{row}_{col}
            // Force fill hidden inputs/textareas using JS for body cells
            const cellId = `content_${row}_${col}`;
            await page.evaluate(({ id, val }) => {
              const el = (document as any).getElementById(id);
              if (el) {
                el.value = val;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('input', { bubbles: true }));
                // Trigger AppCreator if needed
                if (el.onchange) (el as any).onchange(new Event('change'));
              } else {
                throw new Error(`Element #${id} not found`);
              }
            }, { id: cellId, val: text });
          } catch (e) {
            console.log(`Warning: Could not fill cell at row ${row}, col ${col}`, e);
          }
        }
      }
    }
  }

  // Remplir le message de succès
  await setSuccessMessage(page, params.successMessage as string);

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

