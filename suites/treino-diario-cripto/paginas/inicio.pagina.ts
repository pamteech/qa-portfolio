import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';
import { PaginaBase } from './pagina-base';

export class InicioPage extends PaginaBase {
  async abrir() {
    await this.ir('/#/inicio');
    await expect(this.page).toHaveTitle('Treino & Diário Cripto');
    await expect(this.page.getByRole('heading', { level: 1 })).toContainText('Aprenda na prática');
  }

  cartaoTreino() {
    return this.page.locator('a.mode-card.treino');
  }

  cartaoDiario() {
    return this.page.locator('a.mode-card.diario');
  }

  async abrirTreinoPeloCartao() {
    await step('Abrir o Modo Treino pelo cartão', async () => {
      await this.cartaoTreino().click();
      await expect(this.page).toHaveURL(/#\/treino/);
      await expect(this.page.getByRole('heading', { level: 1, name: 'Modo Treino' })).toBeVisible();
    });
  }

  async abrirDiarioPeloCartao() {
    await step('Abrir o Modo Diário pelo cartão', async () => {
      await this.cartaoDiario().click();
      await expect(this.page).toHaveURL(/#\/diario/);
      await expect(this.page.getByRole('heading', { level: 1, name: 'Modo Diário' })).toBeVisible();
    });
  }

  async abrirPelaAba(aba: 'Treino' | 'Diário', hash: 'treino' | 'diario') {
    await step(`Abrir a aba ${aba}`, async () => {
      await this.page.getByRole('tab', { name: aba }).click();
      await expect(this.page).toHaveURL(new RegExp(`#/${hash}`));
    });
  }
}
