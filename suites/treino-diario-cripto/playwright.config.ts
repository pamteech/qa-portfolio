import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const dir = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.BASE_URL ?? 'https://cripto-treino-diario.vercel.app';

export default defineConfig({
  testDir: path.join(dir, 'tests'),
  outputDir: path.join(dir, 'test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    },
  },
  reporter: [
    ...(process.env.CI ? [['github'] as const] : []),
    ['list'],
    [
      'allure-playwright',
      {
        resultsDir: path.join(dir, 'allure-results'),
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          Aplicacao: 'Treino & Diário Cripto',
          URL: baseURL,
          Navegador: 'Chromium',
          Fuso: 'America/Sao_Paulo',
          Relogio: '2026-06-15T15:00:00-03:00',
        },
        categories: [
          {
            name: 'Defeito conhecido do produto',
            messageRegex: '.*[Dd]efeito conhecido.*',
            matchedStatuses: ['failed'],
          },
          {
            name: 'Tempo esgotado',
            messageRegex: '.*(Timeout|timeout).*',
            matchedStatuses: ['broken', 'failed'],
          },
          {
            name: 'Falha de asserção',
            matchedStatuses: ['failed'],
          },
          {
            name: 'Erro inesperado',
            matchedStatuses: ['broken'],
          },
        ],
      },
    ],
  ],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'desktop',
      grepInvert: /@mobile/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'mobile',
      grep: /@smoke|@a11y|@mobile/,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
