import { test, expect } from '@playwright/test';

test.describe('FrameNote Studio E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Load bundled sample image
    const sampleBtn = page.getByRole('button', { name: /try sample/i });
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // Verify screenshot is decoded and loaded into the workspace
    const baseImg = page.locator('.fn-base-image');
    await expect(baseImg).toBeVisible();
    await expect(page.locator('.fn-statusbar')).toContainText('1200 × 760 px');
  });

  test('1. loads sample image correctly', async ({ page }) => {
    await expect(page.locator('.fn-base-image')).toBeVisible();
    await expect(page.locator('.fn-svg-overlay')).toBeVisible();
    await expect(page.locator('.fn-statusbar')).toContainText('0 annotations');
  });

  test('2. draws a rectangle annotation in image coordinates', async ({ page }) => {
    // Select Rectangle Tool
    const rectTool = page.getByRole('radio', { name: /rectangle/i });
    await rectTool.click();

    const svg = page.locator('.fn-svg-overlay');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Drag to draw a rectangle
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 });
    await page.mouse.up();

    // Verify rectangle annotation was added
    const annotationGroups = page.locator('.fn-annotation-group');
    await expect(annotationGroups).toHaveCount(1);
    await expect(page.locator('.fn-statusbar')).toContainText('1 annotation');
  });

  test('3. draws a directional arrow annotation', async ({ page }) => {
    // Select Arrow Tool
    const arrowTool = page.getByRole('radio', { name: /arrow/i });
    await arrowTool.click();

    const svg = page.locator('.fn-svg-overlay');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Drag to draw an arrow
    await page.mouse.move(box.x + 200, box.y + 150);
    await page.mouse.down();
    await page.mouse.move(box.x + 350, box.y + 280, { steps: 5 });
    await page.mouse.up();

    // Verify arrow annotation was added
    const annotationGroups = page.locator('.fn-annotation-group');
    await expect(annotationGroups).toHaveCount(1);
    await expect(page.locator('.fn-statusbar')).toContainText('1 annotation');
  });

  test('4. creates and edits a numbered comment pin in board and sidebar', async ({ page }) => {
    // Select Comment Pin Tool
    const pinTool = page.getByRole('radio', { name: /comment pin/i });
    await pinTool.click();

    const svg = page.locator('.fn-svg-overlay');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Click to drop Pin #1
    await page.mouse.click(box.x + 300, box.y + 200);

    // Verify pin is rendered in SVG
    const annotationGroups = page.locator('.fn-annotation-group');
    await expect(annotationGroups).toHaveCount(1);

    // Verify corresponding comment card in sidebar
    const commentCard = page.locator('.fn-comment-card');
    await expect(commentCard).toHaveCount(1);
    await expect(commentCard).toContainText('Feedback #1');

    // Type comment text into textarea
    const textarea = commentCard.locator('.fn-comment-textarea');
    await textarea.fill('Update CTA button font weight');
    await textarea.press('Control+Enter');

    // Verify text is persisted in sidebar
    await expect(textarea).toHaveValue('Update CTA button font weight');
  });

  test('5. moves and deletes an annotation using the Select tool and keyboard', async ({ page }) => {
    // 1. Draw a rectangle first
    await page.getByRole('radio', { name: /rectangle/i }).click();
    const svg = page.locator('.fn-svg-overlay');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 220, box.y + 180, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('.fn-annotation-group')).toHaveCount(1);

    // 2. Select tool
    await page.getByRole('radio', { name: /select/i }).click();

    // 3. Move annotation by dragging
    await page.mouse.move(box.x + 150, box.y + 140);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 190, { steps: 5 });
    await page.mouse.up();

    // 4. Delete annotation with Delete/Backspace key
    await page.keyboard.press('Delete');

    // Verify annotation was removed
    await expect(page.locator('.fn-annotation-group')).toHaveCount(0);
    await expect(page.locator('.fn-statusbar')).toContainText('0 annotations');
  });

  test('6. performs undo and redo for document actions', async ({ page }) => {
    // 1. Draw a rectangle
    await page.getByRole('radio', { name: /rectangle/i }).click();
    const svg = page.locator('.fn-svg-overlay');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 220, box.y + 180, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('.fn-annotation-group')).toHaveCount(1);

    // 2. Undo via status bar button
    const undoBtn = page.getByRole('button', { name: /undo/i });
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();

    // Verify annotation removed by undo
    await expect(page.locator('.fn-annotation-group')).toHaveCount(0);

    // 3. Redo via status bar button
    const redoBtn = page.getByRole('button', { name: /redo/i });
    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();

    // Verify annotation restored by redo
    await expect(page.locator('.fn-annotation-group')).toHaveCount(1);
  });

  test('7. zooms viewport without mutating or drifting saved image-space coordinates', async ({ page }) => {
    // 1. Place a pin at specific image coordinates
    await page.getByRole('radio', { name: /comment pin/i }).click();
    const svg = page.locator('.fn-svg-overlay');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.click(box.x + 250, box.y + 200);

    // Inspect pin's SVG circle cx, cy in image space
    const pinCircle = page.locator('.fn-annotation-group circle').nth(1); // visible circle
    const initialCx = await pinCircle.getAttribute('cx');
    const initialCy = await pinCircle.getAttribute('cy');
    expect(initialCx).not.toBeNull();
    expect(initialCy).not.toBeNull();

    // 2. Click Zoom In button in status bar multiple times
    const zoomInBtn = page.getByRole('button', { name: /zoom in/i });
    await zoomInBtn.click();
    await zoomInBtn.click();

    // Verify zoom percentage changed
    const zoomValue = page.locator('.fn-zoom-value');
    await expect(zoomValue).not.toHaveText('100%');

    // 3. Verify pin circle's SVG attributes in image coordinates remain IDENTICAL
    const zoomedCx = await pinCircle.getAttribute('cx');
    const zoomedCy = await pinCircle.getAttribute('cy');
    expect(zoomedCx).toBe(initialCx);
    expect(zoomedCy).toBe(initialCy);
  });

  test('8. initiates PNG export with options dialog and downloads file', async ({ page }) => {
    // 1. Add a pin comment first
    await page.getByRole('radio', { name: /comment pin/i }).click();
    const svg = page.locator('.fn-svg-overlay');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.click(box.x + 300, box.y + 200);
    const textarea = page.locator('.fn-comment-textarea').first();
    await textarea.fill('Check navbar padding');
    await textarea.press('Control+Enter');

    // 2. Open Export Dialog
    const exportBtn = page.getByRole('button', { name: /export/i });
    await exportBtn.click();

    // 3. Verify Export Dialog is visible and shows both options
    const dialog = page.locator('.fn-export-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Annotated image only');
    await expect(dialog).toContainText('Annotated image with comments appendix');
    await expect(dialog).toContainText('1200 ×');

    // 4. Download PNG export
    const downloadPromise = page.waitForEvent('download');
    const confirmExportBtn = dialog.getByRole('button', { name: /export & download/i });
    await confirmExportBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });
});
