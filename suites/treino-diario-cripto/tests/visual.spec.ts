import { diarioInicial, semearDiario } from '../suporte/armazenamento';
import { test, expect } from '../fixtures/test';

test.describe('Conferência visual', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'A baseline visual fica no projeto desktop.');
  });

  test('página inicial @regressao', async ({ inicio }) => {
    await inicio.abrir();
    await expect(inicio.page).toHaveScreenshot('inicio.png', { fullPage: true });
  });

  test('modo treino sem carteira @regressao', async ({ treino }) => {
    await treino.abrir();
    await expect(treino.page).toHaveScreenshot('treino-vazio.png', { fullPage: true });
  });

  test('modo diário com lançamentos @regressao', async ({ page, diario }) => {
    await semearDiario(
      page,
      diarioInicial({
        entries: [
          {
            id: 'v1',
            date: '2026-03-05',
            brl: 250,
            btc: 0.0005,
            exchange: 'Foxbit',
            note: 'aporte',
            source: 'manual',
          },
          {
            id: 'v2',
            date: '2026-05-05',
            brl: 250,
            btc: 0.0005,
            exchange: 'Binance',
            note: '',
            source: 'manual',
          },
        ],
        reminder: { ativo: true, dia: 20, valor: 250 },
      }),
    );
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await expect(diario.page).toHaveScreenshot('diario-com-dados.png', { fullPage: true });
  });
});
