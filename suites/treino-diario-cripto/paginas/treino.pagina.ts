import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';
import { PaginaBase } from './pagina-base';

export class TreinoPage extends PaginaBase {
  async abrir() {
    await this.ir('/#/treino');
    await expect(this.page.getByRole('heading', { level: 1, name: 'Modo Treino' })).toBeVisible();
  }

  missao(titulo: string) {
    return this.page.locator('details.mission', { hasText: titulo });
  }

  medalha(nome: string) {
    return this.page.locator('.badge', { hasText: nome });
  }

  async abrirMissao(titulo: string) {
    await step(`Abrir a missão "${titulo}"`, async () => {
      const detalhe = this.missao(titulo);
      if ((await detalhe.getAttribute('open')) === null) {
        await detalhe.locator('summary').click();
      }
      await expect(detalhe).toHaveJSProperty('open', true);
    });
  }

  async criarCarteira() {
    await step('Criar carteira de teste', async () => {
      await this.page.getByRole('button', { name: 'Criar carteira de teste' }).click();
      await expect(this.page.locator('#addr-full')).toBeVisible();
      await expect(this.page.locator('#bal')).not.toHaveText('…');
    });
  }

  async endereco(): Promise<string> {
    return (await this.page.locator('#addr-full').innerText()).trim();
  }

  async apagarCarteira() {
    await step('Apagar a carteira de teste', async () => {
      await this.aceitarDialogo();
      await this.page.getByRole('button', { name: 'Apagar carteira' }).click();
      await expect(this.page.getByRole('button', { name: 'Criar carteira de teste' })).toBeVisible();
    });
  }

  async escolherEndereco(alvo: string) {
    await step('Escolher o endereço idêntico ao da mensagem', async () => {
      await this.page.locator('.opt', { hasText: alvo }).click();
    });
  }
}
