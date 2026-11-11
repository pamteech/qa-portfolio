import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = path.join(dir, 'allure-results', 'history');
const base = (process.env.ALLURE_HISTORY_URL ?? 'https://pamteech.github.io/qa-portfolio/history').replace(/\/$/, '');
const arquivos = ['history.json', 'history-trend.json', 'duration-trend.json', 'categories-trend.json', 'retry-trend.json'];

fs.mkdirSync(destino, { recursive: true });
let copiados = 0;
for (const arquivo of arquivos) {
  try {
    const resposta = await fetch(`${base}/${arquivo}`);
    if (!resposta.ok) {
      console.log(`histórico ausente: ${arquivo} (${resposta.status})`);
      continue;
    }
    fs.writeFileSync(path.join(destino, arquivo), Buffer.from(await resposta.arrayBuffer()));
    copiados += 1;
  } catch (erro) {
    console.log(`histórico ignorado: ${arquivo} (${erro instanceof Error ? erro.message : erro})`);
  }
}
console.log(`histórico do Allure: ${copiados} arquivo(s) em ${destino}`);
