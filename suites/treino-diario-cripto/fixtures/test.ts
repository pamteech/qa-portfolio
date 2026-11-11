import { test as base } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { DiarioPage } from '../paginas/diario.pagina';
import { InicioPage } from '../paginas/inicio.pagina';
import { TreinoPage } from '../paginas/treino.pagina';
import { AGORA } from '../suporte/constantes';
import { controlePadrao, instalarRotas, type ControleRede } from '../suporte/rede';

type Fixtures = {
  rede: ControleRede;
  inicio: InicioPage;
  treino: TreinoPage;
  diario: DiarioPage;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(AGORA);
    await use(page);
  },
  rede: [
    async ({ page }, use) => {
      const ctrl = controlePadrao();
      await instalarRotas(page, ctrl);
      await use(ctrl);
    },
    { auto: true },
  ],
  inicio: async ({ page }, use) => {
    await use(new InicioPage(page));
  },
  treino: async ({ page }, use) => {
    await use(new TreinoPage(page));
  },
  diario: async ({ page }, use) => {
    await use(new DiarioPage(page));
  },
});

test.beforeEach(async ({}, testInfo) => {
  await allure.epic('Treino & Diário Cripto');
  await allure.parameter('Projeto', testInfo.project.name);
  const tags = testInfo.title.match(/@[\w-]+/g) ?? [];
  if (tags.length) await allure.tags(...tags.map((t) => t.slice(1)));
});

export { expect } from '@playwright/test';
