import { treinoFormatura, semearTreino } from '../suporte/armazenamento';
import { defeitoConhecido } from '../suporte/anotacoes';
import { test, expect } from '../fixtures/test';

const RESPOSTAS_GOLPE = [
  'Ignoro e bloqueio: ninguém de suporte pede as 24 palavras, nunca',
  'Digito ledger.com na barra do navegador e baixo de lá',
  'Não uso o aparelho: a seed tem que ser gerada pelo próprio dispositivo na hora, por mim',
  'É golpe: ninguém dobra seu dinheiro. Ignoro',
  'Não assino o que não entendo. Fecho o site',
  'É golpe (“pig butchering”): o primeiro saque é a isca. Paro',
];

test.describe('Missões sem fundos reais', () => {
  test('missão Conferir aceita só o endereço idêntico ao da mensagem @regressao', async ({ treino }) => {
    await treino.abrir();
    await treino.abrirMissao('Conferir o endereço antes de enviar');
    const alvo = (await treino.page.locator('.chat code').innerText()).trim();
    expect(alvo).toMatch(/^0x[0-9a-f]{40}$/);

    const opcoes = treino.page.locator('.opt');
    await expect(opcoes).toHaveCount(4);
    const errada = opcoes.filter({ hasNotText: alvo }).first();
    await errada.click();
    await expect(treino.page.locator('#poison-fb')).toContainText('Esse é de golpista');
    await expect(errada.locator('mark')).not.toHaveCount(0);
    await expect(treino.medalha('Conferir')).not.toHaveClass(/on/);

    await treino.escolherEndereco(alvo);
    await expect(treino.page.locator('#poison-fb')).toContainText('Isso!');
    await expect(treino.medalha('Conferir')).toHaveClass(/on/);
    await expect(treino.missao('Conferir o endereço antes de enviar')).toContainText('Concluída');
  });

  test('os valores do histórico não identificam o endereço verdadeiro @regressao', async ({ treino }) => {
    await defeitoConhecido(
      'Defeito conhecido: na missão Conferir, os rótulos 0,05 ETH / 0 ETH seguem a posição do botão, não o endereço. O endereço certo pode aparecer como transação de 0 ETH.',
    );
    let viuRotuloTrocado = false;
    for (let tentativa = 0; tentativa < 6 && !viuRotuloTrocado; tentativa++) {
      await treino.abrir();
      await treino.abrirMissao('Conferir o endereço antes de enviar');
      const alvo = (await treino.page.locator('.chat code').innerText()).trim();
      const legenda = await treino.page.locator('.opt', { hasText: alvo }).locator('small').innerText();
      viuRotuloTrocado = !legenda.includes('0,05 ETH');
    }
    expect(viuRotuloTrocado).toBe(true);
  });

  test('missão Golpes conclui as seis situações e libera a medalha @regressao', async ({ treino }) => {
    await treino.abrir();
    await treino.abrirMissao('Golpe simulado');
    for (let i = 0; i < RESPOSTAS_GOLPE.length; i++) {
      await expect(treino.page.getByText(`Situação ${i + 1} de 6`)).toBeVisible();
      await treino.page.getByRole('button', { name: RESPOSTAS_GOLPE[i], exact: true }).click();
      await expect(treino.page.locator('.fb')).toContainText('Correto.');
      await treino.page.getByRole('button', { name: i === 5 ? 'Ver resultado' : 'Próxima situação' }).click();
    }
    await expect(treino.page.locator('#m-golpe')).toContainText('6/6');
    await expect(treino.page.locator('#m-golpe')).toContainText('não caiu em nenhum');
    await expect(treino.medalha('Golpes')).toHaveClass(/on/);
  });

  test('errar uma situação de golpe não entrega a medalha @regressao', async ({ treino }) => {
    await treino.abrir();
    await treino.abrirMissao('Golpe simulado');
    await treino.page.getByRole('button', { name: 'Preencho rápido pra não perder as moedas', exact: true }).click();
    await expect(treino.page.locator('.fb')).toContainText('Cuidado.');
    await expect(treino.medalha('Golpes')).not.toHaveClass(/on/);
  });

  test('missão Seed revela o exemplo e exige as quatro respostas certas @regressao', async ({ treino }) => {
    await treino.abrir();
    await treino.abrirMissao('Entender a seed phrase');
    const demo = treino.page.locator('.seed-demo');
    await expect(demo).toHaveClass(/blur/);
    await expect(demo.locator('span:not(.seed-tag)')).toHaveCount(24);
    await demo.click();
    await expect(demo).not.toHaveClass(/blur/);
    await expect(demo).toContainText('EXEMPLO · NÃO USE');

    const respostas: Array<[string, 'Verdadeiro' | 'Falso']> = [
      ['Posso tirar foto das 24 palavras', 'Falso'],
      ['Quem tiver as 24 palavras consegue levar minhas moedas', 'Verdadeiro'],
      ['Se a minha Ledger quebrar ou for roubada, perco os bitcoins', 'Falso'],
      ['Se eu perder a seed, a Ledger ou a corretora consegue recuperar', 'Falso'],
    ];
    for (const [pergunta, resposta] of respostas) {
      const item = treino.page.locator('.tf-item', { hasText: pergunta });
      await item.getByRole('button', { name: resposta, exact: true }).click();
      await expect(item.locator('.fb')).toContainText('Correto.');
    }
    await expect(treino.page.locator('#seed-final')).toContainText('Mandou bem');
    await expect(treino.medalha('Seed')).toHaveClass(/on/);
    await expect(treino.page.getByText('Este app nunca vai pedir que você digite uma seed.')).toBeVisible();
  });

  test('missão Receber conclui quando o saldo de teste fica positivo @regressao', async ({ treino, rede }) => {
    let liberarSaldo = () => {};
    rede.esperaSaldo = new Promise<void>((resolver) => {
      liberarSaldo = resolver;
    });
    await treino.abrir();
    const criando = treino.criarCarteira();
    await expect(treino.page.locator('#bal')).toHaveText('…');
    rede.saldoWei = 250_000_000_000_000_000n;
    liberarSaldo();
    await criando;
    await treino.esperarToast(/Missão concluída/);
    await expect(treino.page.locator('#bal')).toHaveText('0,25 ETH');
    await expect(treino.medalha('Receber')).toHaveClass(/on/);
    await expect(treino.page.locator('.progress-label b')).toHaveText('1 de 5');
  });

  test('missão Enviar exige endereço válido e conferência, e não transmite sem saldo @regressao', async ({ treino, rede }) => {
    await treino.abrir();
    await treino.criarCarteira();
    const proprio = await treino.endereco();
    await treino.abrirMissao('Enviar uma quantia de teste');

    const form = treino.page.locator('#send-form');
    await form.locator('input[name="to"]').fill('0x123');
    await form.getByRole('button', { name: 'Revisar envio' }).click();
    await treino.esperarToast('Endereço inválido');
    await expect(form.locator('.confirm-box')).toBeHidden();

    await form.locator('input[name="to"]').fill(proprio);
    await form.getByRole('button', { name: 'Revisar envio' }).click();
    await expect(form.locator('.confirm-box')).toBeVisible();
    const enviar = form.getByRole('button', { name: 'Assinar e enviar' });
    await expect(enviar).toBeDisabled();
    await form.locator('input[name="ok"]').check();
    await expect(enviar).toBeEnabled();

    const enviadasAntes = rede.chamadasRpc.filter((m) => m.startsWith('eth_send')).length;
    await enviar.click();
    await treino.esperarToast('sem saldo');
    expect(rede.chamadasRpc.filter((m) => m.startsWith('eth_send'))).toHaveLength(enviadasAntes);
    await expect(treino.medalha('Enviar')).not.toHaveClass(/on/);
  });

  test('a confirmação do envio continua válida depois que o destino muda @regressao', async ({ treino }) => {
    await defeitoConhecido(
      'Defeito conhecido: depois de marcar "Conferi o endereço inteiro", alterar o destino não desmarca a caixa nem desabilita "Assinar e enviar". A revisão continua mostrando o endereço anterior.',
    );
    await treino.abrir();
    await treino.criarCarteira();
    const proprio = await treino.endereco();
    await treino.abrirMissao('Enviar uma quantia de teste');
    const form = treino.page.locator('#send-form');
    await form.getByRole('button', { name: 'Revisar envio' }).click();
    await form.locator('input[name="ok"]').check();
    const prefixo = proprio.slice(0, 8);
    await expect(form.locator('[data-a]')).toHaveText(prefixo);

    const outro = '0x0000000000000000000000000000000000000001';
    await form.locator('input[name="to"]').fill(outro);
    await expect(form.getByRole('button', { name: 'Assinar e enviar' })).toBeEnabled();
    await expect(form.locator('input[name="ok"]')).toBeChecked();
    await expect(form.locator('[data-a]')).toHaveText(prefixo);
    await expect(form.locator('[data-a]')).not.toHaveText(outro.slice(0, 8));
  });

  test('exibe o certificado quando as cinco missões estão concluídas @regressao', async ({ page, treino, inicio }) => {
    await semearTreino(page, treinoFormatura());
    await treino.abrir();
    await expect(treino.page.locator('.progress-label b')).toHaveText('5 de 5');
    await expect(treino.page.getByRole('heading', { name: 'Formatura: pronta pra Ledger!' })).toBeVisible();
    await expect(treino.page.getByRole('link', { name: /shop\.ledger\.com/ })).toBeVisible();
    await expect(treino.medalha('Formatura')).toHaveClass(/on/);
    for (const nome of ['Receber', 'Enviar', 'Conferir', 'Golpes', 'Seed']) {
      await expect(treino.medalha(nome)).toHaveClass(/on/);
    }

    await inicio.abrir();
    await expect(inicio.cartaoTreino()).toContainText('5/5 missões · formada');
  });
});
