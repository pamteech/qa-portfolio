import { CHAVE_DIARIO } from '../suporte/constantes';
import { lerJson } from '../suporte/armazenamento';
import { test, expect } from '../fixtures/test';

test.describe('Lançamentos do diário', () => {
  test.beforeEach(async ({ diario }) => {
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
  });

  test('lança, lista e apaga uma compra @regressao', async ({ diario }) => {
    await diario.lancar({
      data: '2026-04-10',
      valor: '250',
      btc: '0.0005',
      corretora: 'Foxbit',
      obs: 'aporte de abril',
    });
    await diario.esperarToast('Compra lançada.');
    const linha = diario.tabelaLancamentos();
    await expect(linha).toHaveCount(1);
    await expect(linha).toContainText('10/04/2026');
    await expect(linha).toContainText('Foxbit');
    await expect(linha).toContainText('aporte de abril');
    await expect(diario.kpi('Total investido')).toContainText('250,00');

    await diario.apagarLancamento();
    await expect(diario.page.getByText('Nenhuma compra lançada ainda')).toBeVisible();
    await expect(diario.kpi('Total investido')).toContainText('0,00');
  });

  test('mantém os lançamentos no localStorage depois de recarregar @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-02-02', valor: '180', btc: '0.0004', corretora: 'Binance', obs: 'persistir' });
    await diario.esperarToast('Compra lançada.');
    await diario.page.reload();
    await diario.esperarCotacao('CoinGecko');
    await expect(diario.tabelaLancamentos()).toContainText('persistir');
    const guardado = await lerJson<{ entries: Array<{ note: string }> }>(diario.page, CHAVE_DIARIO);
    expect(guardado?.entries.some((e) => e.note === 'persistir')).toBe(true);
  });

  test('não aceita data futura nem formulário vazio @regressao', async ({ diario }) => {
    const data = diario.page.locator('#entry-form input[name="date"]');
    await expect(data).toHaveValue('2026-06-15');
    await data.fill('2026-06-16');
    await expect(data).toHaveJSProperty('validity.rangeOverflow', true);

    await data.fill('2026-06-15');
    await diario.page.locator('#entry-form').getByRole('button', { name: 'Adicionar' }).click();
    await expect(diario.page.locator('#entry-form input[name="brl"]')).toHaveJSProperty('validity.valueMissing', true);
    await expect(diario.toast()).toHaveCount(0);
  });

  test('aceita 100 BTC e recusa quantidade acima disso @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-05-01', valor: '100', btc: '100', corretora: 'Binance' });
    await diario.esperarToast(/Compra lançada|Atenção/);
    await expect(diario.tabelaLancamentos()).toHaveCount(1);

    await diario.lancar({ data: '2026-05-02', valor: '100', btc: '101', corretora: 'Binance' });
    await diario.esperarToast('Confere a quantidade de BTC');
    await expect(diario.tabelaLancamentos()).toHaveCount(1);
  });

  test('aceita o menor valor e 1 satoshi @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-05-20', valor: '0.01', btc: '0.00000001', corretora: 'Nubank' });
    await diario.esperarToast(/Compra lançada|Atenção/);
    await expect(diario.tabelaLancamentos()).toContainText('0,00000001');
    await expect(diario.kpi('BTC acumulado')).toContainText('0,00000001 BTC');
  });

  test('abre mesmo com JSON corrompido no localStorage @regressao', async ({ page, diario }) => {
    await page.addInitScript((chave) => localStorage.setItem(chave, '{'), CHAVE_DIARIO);
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await expect(diario.page.getByText('Nenhuma compra lançada ainda')).toBeVisible();
  });

  test('apagar todos os lançamentos pede confirmação e esvazia o diário @regressao', async ({ diario }) => {
    await diario.lancar({ data: '2026-03-03', valor: '90', btc: '0.0002' });
    await diario.esperarToast('Compra lançada.');
    await diario.aceitarDialogo();
    await diario.page.getByRole('button', { name: 'Apagar meus lançamentos' }).click();
    await expect(diario.page.getByText('Nenhuma compra lançada ainda')).toBeVisible();
  });
});
