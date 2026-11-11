import { test, expect } from '../fixtures/test';

test.describe('Fumaça', () => {
  test('exibe a página inicial com os dois modos @smoke', async ({ inicio }) => {
    await inicio.abrir();
    await expect(inicio.cartaoTreino()).toContainText('Modo Treino');
    await expect(inicio.cartaoTreino()).toContainText('TESTNET');
    await expect(inicio.cartaoTreino()).toContainText('0/5 missões');
    await expect(inicio.cartaoDiario()).toContainText('Modo Diário');
    await expect(inicio.cartaoDiario()).toContainText('SÓ LEITURA');
    await expect(inicio.page.getByRole('heading', { name: 'Como funciona' })).toBeVisible();
  });

  test('abre o Modo Treino pelo cartão e pela aba @smoke', async ({ inicio, treino }) => {
    await inicio.abrir();
    await inicio.abrirTreinoPeloCartao();
    await expect(treino.page.locator('.pill-test')).toContainText('Ethereum Sepolia');
    await expect(treino.page.getByRole('button', { name: 'Criar carteira de teste' })).toBeVisible();
    await inicio.abrir();
    await inicio.abrirPelaAba('Treino', 'treino');
    await expect(treino.page.getByRole('heading', { level: 1, name: 'Modo Treino' })).toBeVisible();
  });

  test('abre o Modo Diário pelo cartão e pela aba @smoke', async ({ inicio, diario }) => {
    await inicio.abrir();
    await inicio.abrirDiarioPeloCartao();
    await expect(diario.page.locator('.pill-ro')).toContainText('SÓ LEITURA');
    await inicio.abrir();
    await inicio.abrirPelaAba('Diário', 'diario');
    await expect(diario.page.getByRole('heading', { level: 1, name: 'Modo Diário' })).toBeVisible();
  });

  test('o rodapé deixa claro que o app não pede seed nem guarda dinheiro @smoke', async ({ inicio }) => {
    await inicio.abrir();
    const rodape = inicio.page.locator('footer.foot');
    await expect(rodape).toContainText('nunca');
    await expect(rodape).toContainText('seed phrase');
    await expect(rodape).toContainText('Sepolia');
    await expect(rodape).toContainText('recomendação de investimento');
  });
});
