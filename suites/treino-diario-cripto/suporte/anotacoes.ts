import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';

export async function defeitoConhecido(descricao: string) {
  test.info().annotations.push({ type: 'defeito', description: descricao });
  await allure.description(descricao);
}
