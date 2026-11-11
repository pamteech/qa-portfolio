import { test, expect } from '../fixtures/test';

test.describe('Totais, preço médio e IR', () => {
  test.beforeEach(async ({ diario }) => {
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
  });

  test('soma o investido, o BTC e o preço médio de duas compras @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-01-10', valor: '200', btc: '0.001', corretora: 'Mercado Bitcoin' });
    await diario.esperarToast(/Atenção/);
    await diario.lancar({ data: '2026-03-10', valor: '400', btc: '0.001', corretora: 'Binance' });
    await diario.esperarToast(/Compra lançada|Atenção/);

    await expect(diario.kpi('Total investido')).toContainText('600,00');
    await expect(diario.kpi('BTC acumulado')).toContainText('0,00200000 BTC');
    await expect(diario.page.locator('.kpi', { hasText: 'BTC acumulado' })).toContainText('200.000 sats');
    await expect(diario.kpi('Preço médio')).toContainText('300.000,00');
    await expect(diario.kpi('Valor atual')).toContainText('1.000,00');
    const lucro = diario.page.locator('.kpi', { hasText: 'Lucro / prejuízo' });
    await expect(lucro).toHaveClass(/up/);
    await expect(lucro.locator('b')).toContainText('400,00');
    await expect(lucro).toContainText('+66,67%');

    const linhas = diario.tabelaLancamentos();
    await expect(linhas).toHaveCount(2);
    await expect(linhas.nth(0)).toContainText('10/03/2026');
    await expect(linhas.nth(1)).toContainText('10/01/2026');
    await expect(diario.page.locator('svg.chart')).toBeVisible();
  });

  test('avisa quando o preço pago está longe da cotação @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-04-01', valor: '200', btc: '0.001', corretora: 'Foxbit' });
    await diario.esperarToast('bem longe da cotação');
    await expect(diario.tabelaLancamentos()).toHaveCount(1);
  });

  test('compra dentro da faixa da cotação não dispara o aviso de preço @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-04-02', valor: '250', btc: '0.0005', corretora: 'Foxbit' });
    await diario.esperarToast('Compra lançada.');
    await expect(diario.toast()).not.toContainText('bem longe da cotação');
    await expect(diario.kpi('Preço médio')).toContainText('500.000,00');
  });

  test('marca a declaração de IR a partir de R$ 5.000,00 e não abaixo @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-02-01', valor: '4999.99', btc: '0.01', corretora: 'Binance' });
    await diario.esperarToast('Compra lançada.');
    const corpo = diario.page.locator('section.ir tbody');
    await expect(corpo).toContainText('31/12/2026');
    await expect(corpo).toContainText('parcial, até hoje');
    await expect(corpo).toContainText('4.999,99');
    await expect(corpo).toContainText('Opcional');
    await expect(corpo).not.toContainText('Sim, provável');

    await diario.apagarLancamento();
    await diario.lancar({ data: '2026-02-01', valor: '5000', btc: '0.01', corretora: 'Binance' });
    await diario.esperarToast('Compra lançada.');
    await expect(corpo).toContainText('5.000,00');
    await expect(corpo).toContainText('Sim, provável');
  });

  test('separa o custo de aquisição por ano e sugere o texto do ano fechado @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2025-12-01', valor: '3000', btc: '0.006', corretora: 'Mercado Bitcoin' });
    await diario.esperarToast(/Compra lançada|Atenção/);
    await diario.lancar({ data: '2026-06-01', valor: '2500', btc: '0.005', corretora: 'Binance', obs: 'segundo ano' });
    await diario.esperarToast(/Compra lançada|Atenção/);

    const ir = diario.page.locator('section.ir');
    const linhas = ir.locator('tbody tr');
    await expect(linhas).toHaveCount(2);
    await expect(linhas.nth(0)).toContainText('31/12/2025');
    await expect(linhas.nth(0)).toContainText('3.000,00');
    await expect(linhas.nth(0)).toContainText('Opcional');
    await expect(linhas.nth(1)).toContainText('31/12/2026');
    await expect(linhas.nth(1)).toContainText('5.500,00');
    await expect(linhas.nth(1)).toContainText('Sim, provável');

    await ir.locator('summary').click();
    const texto = ir.locator('#disc');
    await expect(texto).toContainText('31/12/2025');
    await expect(texto).toContainText('3.000,00');
    await expect(texto).toContainText('Mercado Bitcoin');
    await expect(texto).not.toContainText('Binance');
  });
});
