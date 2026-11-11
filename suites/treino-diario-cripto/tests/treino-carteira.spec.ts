import { CHAVE_TREINO } from '../suporte/constantes';
import { lerJson } from '../suporte/armazenamento';
import { test, expect } from '../fixtures/test';

test.describe('Carteira de teste', () => {
  test('cria a carteira no navegador e mantém o endereço depois de recarregar @regressao', async ({ treino }) => {
    await treino.abrir();
    await treino.criarCarteira();
    const endereco = await treino.endereco();
    expect(endereco).toMatch(/^0x[0-9a-fA-F]{40}$/);
    await expect(treino.page.locator('#bal')).toHaveText('0 ETH');

    const guardado = await lerJson<{ pk: string; address: string }>(treino.page, CHAVE_TREINO);
    expect(guardado?.address).toBe(endereco);
    expect(guardado?.pk).toMatch(/^0x[0-9a-f]{64}$/);

    await treino.page.reload();
    await expect(treino.page.locator('#addr-full')).toHaveText(endereco);
    await expect(treino.medalha('Receber')).not.toHaveClass(/on/);
  });

  test('copia o endereço da carteira de teste @regressao', async ({ treino }) => {
    await treino.abrir();
    await treino.criarCarteira();
    const endereco = await treino.endereco();
    await treino.page.getByRole('button', { name: 'Copiar endereço' }).click();
    await treino.esperarToast('Copiado!');
    const copiado = await treino.page.evaluate(() => navigator.clipboard.readText());
    expect(copiado).toBe(endereco);
  });

  test('apagar a carteira preserva o progresso das missões @regressao', async ({ treino }) => {
    await treino.abrir();
    await treino.abrirMissao('Conferir o endereço antes de enviar');
    const alvo = (await treino.page.locator('.chat code').innerText()).trim();
    await treino.escolherEndereco(alvo);
    await expect(treino.page.locator('#poison-fb')).toContainText('Isso!');
    await expect(treino.medalha('Conferir')).toHaveClass(/on/);

    await treino.criarCarteira();
    await treino.apagarCarteira();
    await expect(treino.medalha('Conferir')).toHaveClass(/on/);
    await expect(treino.page.locator('.progress-label b')).toHaveText('1 de 5');
  });
});
