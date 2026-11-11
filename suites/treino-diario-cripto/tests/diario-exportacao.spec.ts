import fs from 'node:fs/promises';
import type { Download } from '@playwright/test';
import { test, expect } from '../fixtures/test';

async function textoDoDownload(download: Download) {
  const caminho = await download.path();
  expect(caminho).toBeTruthy();
  return fs.readFile(caminho as string, 'utf-8');
}

const PRECO = 500_000;

function btcDoExemplo() {
  return +((250 * 0.993) / PRECO).toFixed(8);
}

test.describe('CSV e calendário', () => {
  test('exporta o CSV com BOM, ponto e vírgula e decimal brasileiro @regressao', async ({ diario }) => {
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.lancar({
      data: '2026-01-15',
      valor: '250',
      btc: '0.0005',
      corretora: 'Foxbit',
      obs: 'taxa;rede',
    });
    await diario.esperarToast('Compra lançada.');
    await diario.lancar({
      data: '2026-03-15',
      valor: '500',
      btc: '0.001',
      corretora: 'Binance',
      obs: 'segundo',
    });
    await diario.esperarToast('Compra lançada.');

    const download = await diario.exportarCsv();
    expect(download.suggestedFilename()).toBe('diario-dca.csv');
    const csv = await textoDoDownload(download);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const linhas = csv.replace(/^\uFEFF/, '').trim().split('\n');
    expect(linhas[0]).toBe('data;valor_brl;btc;preco_pago_brl;corretora;observacao;txid');
    expect(linhas).toHaveLength(3);
    expect(linhas[1]).toBe('2026-01-15;250,00;0,00050000;500000,00;Foxbit;taxa,rede;');
    expect(linhas[2]).toBe('2026-03-15;500,00;0,00100000;500000,00;Binance;segundo;');
  });

  test('avisa quando não há nada para exportar @regressao', async ({ diario }) => {
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.page.getByRole('button', { name: 'Exportar CSV' }).click();
    await diario.esperarToast('Nada pra exportar ainda.');
  });

  test('o CSV da demonstração traz doze compras fictícias de R$ 250 @regressao', async ({ diario }) => {
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.ativarDemonstracao();
    await expect(diario.page.locator('#chain-box')).toContainText('Saldo on-chain');
    const download = await diario.exportarCsv();
    expect(download.suggestedFilename()).toBe('diario-dca-EXEMPLO.csv');
    const csv = (await textoDoDownload(download)).replace(/^\uFEFF/, '').trim();
    const linhas = csv.split('\n');
    expect(linhas).toHaveLength(13);
    const btc = btcDoExemplo().toFixed(8).replace('.', ',');
    expect(linhas[1].startsWith('2025-07-05;250,00;' + btc)).toBe(true);
    expect(linhas[1]).toContain('Foxbit;exemplo;');
    expect(linhas[12].startsWith('2026-06-05;250,00;' + btc)).toBe(true);
    expect(linhas[12]).toContain('Mercado Bitcoin;exemplo;');
    await expect(diario.kpi('Total investido')).toContainText('3.000,00');
  });

  test('baixa o lembrete mensal em .ics e marca o dia de hoje @regressao', async ({ diario }) => {
    await diario.abrir();
    const form = diario.page.locator('#rem-form');
    await form.locator('input[name="dia"]').fill('15');
    await form.locator('input[name="valor"]').fill('300');
    const download = await diario.baixarIcs();
    expect(download.suggestedFilename()).toBe('lembrete-dca-bitcoin.ics');
    const ics = await textoDoDownload(download);
    expect(ics).toContain('\r\n');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('PRODID:-//Treino e Diario Cripto//PT-BR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615');
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=15');
    expect(ics).toContain('SUMMARY:DCA bitcoin: comprar R$ 300\\,00');
    expect(ics).not.toContain('SUMMARY:DCA bitcoin: comprar R$ 300,00');
    expect(ics).toContain('TRIGGER:PT9H');
    expect(ics).toContain('END:VCALENDAR');

    await expect(diario.page.locator('.alert.ok')).toContainText('Hoje é dia do seu DCA');
    await expect(diario.page.locator('#rem-form').locator('..')).toContainText('hoje');
  });

  test('limita o dia do lembrete a 28 mesmo se o máximo do campo for contornado @regressao', async ({ diario }) => {
    await diario.abrir();
    await diario.page.locator('#rem-form input[name="dia"]').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('max');
      el.value = '31';
    });
    await diario.page.locator('#rem-form').getByRole('button', { name: 'Salvar' }).click();
    await diario.esperarToast('Lembrete salvo');
    await expect(diario.page.locator('#rem-form input[name="dia"]')).toHaveValue('28');
  });
});
