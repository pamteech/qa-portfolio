import { expect, type Page } from '@playwright/test';
import { step } from 'allure-js-commons';

export class PaginaBase {
  constructor(readonly page: Page) {}

  protected async ir(hash: string) {
    await step(`Abrir ${hash}`, async () => {
      await this.page.goto(hash);
      await this.page.evaluate(async () => {
        await document.fonts.ready;
      });
    });
  }

  toast() {
    return this.page.locator('#toast');
  }

  async esperarToast(texto: string | RegExp) {
    await expect(this.toast()).toContainText(texto);
  }

  async aceitarDialogo() {
    this.page.once('dialog', (dialog) => dialog.accept());
  }
}
