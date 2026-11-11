import { diarioInicial, gravarDiarioERecarregar } from '../suporte/armazenamento';
import { test, expect } from '../fixtures/test';

async function folgaHorizontal(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe('Layout responsivo', () => {
  test('os dois modos ficam lado a lado no desktop @regressao', async ({ inicio }) => {
    await inicio.abrir();
    const treino = await inicio.cartaoTreino().boundingBox();
    const diario = await inicio.cartaoDiario().boundingBox();
    expect(treino).toBeTruthy();
    expect(diario).toBeTruthy();
    expect(Math.abs((treino?.y ?? 0) - (diario?.y ?? 0))).toBeLessThan(8);
    expect((diario?.x ?? 0) > (treino?.x ?? 0)).toBe(true);
    expect(await folgaHorizontal(inicio.page)).toBeLessThanOrEqual(1);
  });

  test('no celular os modos empilham e a página não vaza na horizontal @mobile', async ({ page, inicio, treino, diario }) => {
    await inicio.abrir();
    const cartaoTreino = await inicio.cartaoTreino().boundingBox();
    const cartaoDiario = await inicio.cartaoDiario().boundingBox();
    expect((cartaoDiario?.y ?? 0) > (cartaoTreino?.y ?? 0) + (cartaoTreino?.height ?? 0) - 4).toBe(true);
    expect(await folgaHorizontal(page)).toBeLessThanOrEqual(1);

    await treino.abrir();
    await treino.criarCarteira();
    expect(await folgaHorizontal(page)).toBeLessThanOrEqual(1);
    await expect(treino.page.getByRole('heading', { name: 'Modo Treino' })).toBeVisible();

    await gravarDiarioERecarregar(
      page,
      diarioInicial({
        entries: [
          {
            id: 'm1',
            date: '2026-05-05',
            brl: 250,
            btc: 0.0005,
            exchange: 'Foxbit',
            note: 'celular',
            source: 'manual',
          },
        ],
      }),
    );
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await expect(diario.tabelaLancamentos()).toContainText('celular');
    expect(await folgaHorizontal(page)).toBeLessThanOrEqual(1);
  });
});
