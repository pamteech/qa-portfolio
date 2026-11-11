import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resultados = path.join(dir, 'allure-results');
const relatorio = path.join(dir, 'allure-report');
const repo = 'https://github.com/pamteech/qa-portfolio';
const paginas = 'https://pamteech.github.io/qa-portfolio/';

fs.mkdirSync(resultados, { recursive: true });

const historicoDestino = path.join(resultados, 'history');
const historicoPronto = path.join(historicoDestino, 'history-trend.json');
const historicoAnterior = path.join(relatorio, 'history', 'history-trend.json');
if (!fs.existsSync(historicoPronto) && fs.existsSync(historicoAnterior)) {
  fs.cpSync(path.join(relatorio, 'history'), historicoDestino, { recursive: true });
}

fs.copyFileSync(path.join(dir, 'allure', 'categories.json'), path.join(resultados, 'categories.json'));

const url = process.env.BASE_URL ?? 'https://cripto-treino-diario.vercel.app';
const ambiente = [
  `Aplicação=Treino & Diário Cripto`,
  `URL=${url}`,
  `Navegador=Chromium`,
  `Fuso=America/Sao_Paulo`,
  `Relógio fixo=2026-06-15T15:00:00-03:00`,
  `CI=${process.env.CI ? 'sim' : 'não'}`,
  `Commit=${process.env.GITHUB_SHA ?? 'local'}`,
  `Sistema=${process.platform}`,
].join('\n');
fs.writeFileSync(path.join(resultados, 'environment.properties'), `${ambiente}\n`);

const runId = process.env.GITHUB_RUN_ID;
const runNumber = Number(process.env.GITHUB_RUN_NUMBER ?? 0);
fs.writeFileSync(
  path.join(resultados, 'executor.json'),
  JSON.stringify(
    {
      name: runId ? 'GitHub Actions' : 'Execução local',
      type: runId ? 'github' : 'local',
      url: repo,
      buildOrder: Number.isFinite(runNumber) ? runNumber : 0,
      buildName: runId ? `execução ${runNumber}` : 'local',
      buildUrl: runId ? `${repo}/actions/runs/${runId}` : repo,
      reportUrl: paginas,
      reportName: 'Allure — Treino & Diário Cripto',
    },
    null,
    2,
  ),
);

const binario = path.resolve(dir, '../../node_modules/allure-commandline/dist/bin/allure');
execFileSync(binario, ['generate', resultados, '-o', relatorio, '--clean'], { stdio: 'inherit' });
fs.writeFileSync(path.join(relatorio, '.nojekyll'), '');
console.log(`relatório em ${relatorio}`);
