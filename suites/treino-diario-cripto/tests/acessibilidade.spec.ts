import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { Result } from 'axe-core';
import { attachment } from 'allure-js-commons';
import { diarioInicial, gravarDiarioERecarregar } from '../suporte/armazenamento';
import { test, expect } from '../fixtures/test';

const REGRAS_CONHECIDAS = new Set<string>();

async function auditar(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
}

function resumo(violacoes: Result[]) {
  return violacoes.map((v) => ({
    id: v.id,
    impacto: v.impact,
    ajuda: v.help,
    alvos: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }));
}

test.describe('Acessibilidade', () => {
  test('as telas principais não têm violações WCAG @a11y', async ({ page, inicio, treino, diario }) => {
    const telas: Array<{ nome: string; abrir: () => Promise<void> }> = [
      { nome: 'início', abrir: () => inicio.abrir() },
      { nome: 'treino', abrir: () => treino.abrir() },
      {
        nome: 'treino com carteira',
        abrir: async () => {
          await treino.abrir();
          await treino.criarCarteira();
        },
      },
      { nome: 'diário', abrir: () => diario.abrir() },
    ];

    const conhecidas = new Set<string>();
    const inesperadas: Array<{ tela: string; id: string; ajuda: string }> = [];

    for (const tela of telas) {
      await tela.abrir();
      if (tela.nome === 'diário') await diario.esperarCotacao('CoinGecko');
      const resultado = await auditar(page);
      await attachment(`axe-${tela.nome}`, JSON.stringify(resumo(resultado.violations), null, 2), 'application/json');
      for (const violacao of resultado.violations) {
        if (REGRAS_CONHECIDAS.has(violacao.id)) {
          conhecidas.add(violacao.id);
          continue;
        }
        inesperadas.push({ tela: tela.nome, id: violacao.id, ajuda: violacao.help });
      }
    }

    await gravarDiarioERecarregar(
      page,
      diarioInicial({
        entries: [
          {
            id: 'a1',
            date: '2026-03-05',
            brl: 250,
            btc: 0.0005,
            exchange: 'Foxbit',
            note: 'aporte',
            source: 'manual',
          },
        ],
        reminder: { ativo: true, dia: 20, valor: 250 },
      }),
    );
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    const comDados = await auditar(page);
    await attachment('axe-diario-com-dados', JSON.stringify(resumo(comDados.violations), null, 2), 'application/json');
    for (const violacao of comDados.violations) {
      if (REGRAS_CONHECIDAS.has(violacao.id)) {
        conhecidas.add(violacao.id);
        continue;
      }
      inesperadas.push({ tela: 'diário com dados', id: violacao.id, ajuda: violacao.help });
    }

    expect(inesperadas, 'nova violação de acessibilidade').toEqual([]);
  });
});
