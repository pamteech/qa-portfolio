import { CHAVE_DIARIO, ENDERECO_BC1, ENDERECO_P2SH, SEED_EXEMPLO, XPUB_EXEMPLO } from '../suporte/constantes';
import { lerJson } from '../suporte/armazenamento';
import { defeitoConhecido } from '../suporte/anotacoes';
import { test, expect } from '../fixtures/test';

test.describe('Demonstração, cotação e carteira pública', () => {
  test('a demonstração não altera os lançamentos reais @regressao', async ({ diario }) => {
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.lancar({ data: '2026-03-08', valor: '220', btc: '0.00044', corretora: 'Bitso', obs: 'meu aporte real' });
    await diario.esperarToast(/Compra lançada|Atenção/);
    await diario.ativarDemonstracao();
    await expect(diario.page.getByText('meu aporte real')).toHaveCount(0);
    await expect(diario.page.getByText('Saia da demonstração para lançar')).toBeVisible();
    await expect(diario.page.locator('#entry-form')).toHaveCount(0);
    await expect(diario.tabelaLancamentos()).toHaveCount(12);

    await diario.page.getByRole('button', { name: 'Apagar meus lançamentos' }).click();
    await diario.esperarToast('Na demonstração não há dados seus pra apagar.');

    await diario.sairDaDemonstracao();
    await expect(diario.tabelaLancamentos()).toContainText('meu aporte real');
    const guardado = await lerJson<{ entries: Array<{ note: string }>; demo: boolean }>(diario.page, CHAVE_DIARIO);
    expect(guardado?.demo).toBe(false);
    expect(guardado?.entries).toHaveLength(1);
  });

  test('consulta o endereço público e lança a entrada recebida @regressao', async ({ diario }) => {
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.acompanhar(ENDERECO_BC1);
    const caixa = diario.page.locator('#chain-box');
    await expect(caixa).toContainText('1,00000000 BTC');
    await expect(caixa).toContainText('500.000,00');
    await expect(caixa.getByRole('link', { name: /mempool\.space/ })).toBeVisible();

    await caixa.getByRole('button', { name: 'Lançar' }).click();
    const form = diario.page.locator('#entry-form');
    await expect(form.locator('input[name="date"]')).toHaveValue('2024-06-01');
    await expect(form.locator('input[name="btc"]')).toHaveValue('1.00000000');
    await expect(form.locator('input[name="brl"]')).toHaveValue('500000.00');
    await expect(form.locator('input[name="note"]')).toHaveValue('Recebido na carteira própria');
    await form.getByRole('button', { name: 'Adicionar' }).click();
    await diario.esperarToast('Compra lançada.');
    await expect(caixa).toContainText('no diário');
    await expect(caixa.getByRole('button', { name: 'Lançar' })).toHaveCount(0);

    await diario.page.getByRole('button', { name: 'Remover' }).click();
    await expect(diario.page.locator('#addr-form input[name="addr"]')).toHaveValue('');
    await expect(caixa).toBeEmpty();
  });

  test('aceita endereço legado e recusa xpub, seed e endereço inválido @regressao', async ({ diario }) => {
    await defeitoConhecido(
      'Defeito conhecido: um endereço bc1 só em maiúsculas é recusado. O BIP-173 aceita a forma toda em maiúsculas; o validador do app só reconhece minúsculas.',
    );
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    const campo = diario.page.locator('#addr-form input[name="addr"]');

    await campo.fill(XPUB_EXEMPLO);
    await diario.page.locator('#addr-form').getByRole('button', { name: 'Acompanhar' }).click();
    await diario.esperarToast('xpub');
    await expect(campo).toHaveValue('');

    await campo.fill(SEED_EXEMPLO);
    await diario.page.locator('#addr-form').getByRole('button', { name: 'Acompanhar' }).click();
    await diario.esperarToast('seed phrase');
    await expect(campo).toHaveValue('');

    await campo.fill('1ABC');
    await diario.page.locator('#addr-form').getByRole('button', { name: 'Acompanhar' }).click();
    await diario.esperarToast('Endereço de bitcoin inválido');
    await expect(campo).toHaveValue('');

    await campo.fill(ENDERECO_BC1.toUpperCase());
    await diario.page.locator('#addr-form').getByRole('button', { name: 'Acompanhar' }).click();
    await diario.esperarToast('Endereço de bitcoin inválido');
    await expect(campo).toHaveValue('');

    await diario.acompanhar(ENDERECO_P2SH);
    await expect(diario.page.locator('#chain-box')).toContainText('Saldo on-chain');
  });

  test('usa a Binance quando a CoinGecko falha @regressao', async ({ diario, rede }) => {
    rede.coingeckoOk = false;
    rede.precoBinance = 480_000;
    await diario.abrir();
    await diario.esperarCotacao('Binance');
    await diario.lancar({ data: '2026-04-04', valor: '240', btc: '0.0005', corretora: 'Binance' });
    await diario.esperarToast('Compra lançada.');
    await expect(diario.kpi('Valor atual')).toContainText('240,00');
  });

  test('mostra aviso quando nenhuma cotação responde @regressao', async ({ diario, rede }) => {
    rede.coingeckoOk = false;
    rede.binanceOk = false;
    await diario.abrir();
    await expect(diario.page.locator('.price-src')).toContainText('Não consegui buscar a cotação agora.');
    await expect(diario.kpi('Valor atual')).toHaveText('—');
  });

  test('segue com o gráfico quando o histórico de preço falha @regressao', async ({ diario, rede }) => {
    rede.historicoOk = false;
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.lancar({ data: '2026-04-04', valor: '250', btc: '0.0005' });
    await diario.esperarToast('Compra lançada.');
    await expect(diario.page.locator('.legend')).toContainText('histórico de preço indisponível');
    await expect(diario.page.locator('svg.chart')).toBeVisible();
  });

  test('mostra erro amigável quando o mempool.space falha @regressao', async ({ diario, rede }) => {
    rede.mempoolOk = false;
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.acompanhar(ENDERECO_BC1);
    await expect(diario.page.locator('#chain-box')).toContainText('Não consegui consultar o mempool.space');
    await expect(diario.page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  test('aceita preço manual no formato brasileiro e trata ponto como milhar @regressao', async ({ diario }) => {
    await defeitoConhecido(
      'Defeito conhecido: o preço manual remove todos os pontos antes de ler a vírgula. "350.000,50" vira R$ 350.000,50, mas "410000.50" (ponto decimal, como na Binance) vira R$ 41.000.050,00.',
    );
    await diario.abrir();
    await diario.esperarCotacao('CoinGecko');
    await diario.lancar({ data: '2026-04-04', valor: '250', btc: '0.0005' });
    await diario.esperarToast('Compra lançada.');

    diario.page.once('dialog', (dialog) => dialog.accept('350.000,50'));
    await diario.page.getByRole('button', { name: 'informar preço manualmente' }).click();
    await expect(diario.page.locator('.price-src')).toContainText('350.000,50');
    await expect(diario.kpi('Valor atual')).toContainText('175,00');

    await diario.page.getByRole('button', { name: 'usar cotação automática' }).click();
    await expect(diario.page.locator('.price-src')).not.toContainText('Usando preço manual');
    await expect(diario.kpi('Valor atual')).toContainText('250,00');

    diario.page.once('dialog', (dialog) => dialog.accept('410000.50'));
    await diario.page.getByRole('button', { name: 'informar preço manualmente' }).click();
    await expect(diario.kpi('Valor atual')).toContainText('20.500,03');
  });
});
