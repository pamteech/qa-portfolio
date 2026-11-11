import { expect, type Download } from '@playwright/test';
import { step } from 'allure-js-commons';
import { PaginaBase } from './pagina-base';

export interface Compra {
  data: string;
  valor: string;
  btc: string;
  corretora?: string;
  obs?: string;
}

export class DiarioPage extends PaginaBase {
  async abrir() {
    await this.ir('/#/diario');
    await expect(this.page.getByRole('heading', { level: 1, name: 'Modo Diário' })).toBeVisible();
  }

  async esperarCotacao(fonte: string) {
    await expect(this.page.locator('.price-src')).toContainText(fonte);
  }

  kpi(rotulo: string) {
    return this.page.locator('.kpi', { hasText: rotulo }).locator('b').first();
  }

  tabelaLancamentos() {
    return this.page
      .locator('section.card', { has: this.page.getByRole('heading', { name: 'Lançar compra' }) })
      .locator('tbody tr');
  }

  async lancar(compra: Compra) {
    await step(`Lançar compra de ${compra.valor} em ${compra.data}`, async () => {
      const form = this.page.locator('#entry-form');
      await form.locator('input[name="date"]').fill(compra.data);
      await form.locator('input[name="brl"]').fill(compra.valor);
      await form.locator('input[name="btc"]').fill(compra.btc);
      if (compra.corretora) await form.locator('input[name="exchange"]').fill(compra.corretora);
      if (compra.obs) await form.locator('input[name="note"]').fill(compra.obs);
      await form.getByRole('button', { name: 'Adicionar' }).click();
    });
  }

  async apagarLancamento(indice = 0) {
    await step('Apagar um lançamento', async () => {
      await this.aceitarDialogo();
      await this.tabelaLancamentos().nth(indice).getByRole('button', { name: 'Apagar' }).click();
    });
  }

  async exportarCsv(): Promise<Download> {
    return step('Exportar CSV', async () => {
      const [download] = await Promise.all([
        this.page.waitForEvent('download'),
        this.page.getByRole('button', { name: 'Exportar CSV' }).click(),
      ]);
      return download;
    });
  }

  async baixarIcs(): Promise<Download> {
    return step('Baixar lembrete .ics', async () => {
      const [download] = await Promise.all([
        this.page.waitForEvent('download'),
        this.page.getByRole('button', { name: /Adicionar ao calendário/ }).click(),
      ]);
      return download;
    });
  }

  async ativarDemonstracao() {
    await step('Ativar o modo demonstração', async () => {
      await this.page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
      await expect(this.page.locator('.demo-bar')).toContainText('MODO DEMONSTRAÇÃO');
    });
  }

  async sairDaDemonstracao() {
    await step('Sair do modo demonstração', async () => {
      await this.page.getByRole('button', { name: 'Sair da demonstração' }).click();
      await expect(this.page.getByRole('button', { name: 'Ver com dados de exemplo' })).toBeVisible();
    });
  }

  async acompanhar(endereco: string) {
    await step(`Acompanhar o endereço ${endereco}`, async () => {
      await this.page.locator('#addr-form input[name="addr"]').fill(endereco);
      await this.page.locator('#addr-form').getByRole('button', { name: 'Acompanhar' }).click();
    });
  }
}
