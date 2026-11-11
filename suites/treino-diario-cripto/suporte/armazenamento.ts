import type { Page } from '@playwright/test';
import { CHAVE_DIARIO, CHAVE_TREINO } from './constantes';

export async function semear(page: Page, chave: string, valor: unknown) {
  await page.addInitScript(
    ([k, json]) => {
      localStorage.setItem(k, json);
    },
    [chave, JSON.stringify(valor)] as const,
  );
}

export async function lerJson<T>(page: Page, chave: string): Promise<T | null> {
  return page.evaluate((k) => {
    const bruto = localStorage.getItem(k);
    if (!bruto) return null;
    try {
      return JSON.parse(bruto) as T;
    } catch {
      return null;
    }
  }, chave);
}

export const estadoTreinoVazio = {
  pk: null,
  address: null,
  done: {},
  lastTx: null,
  open: 'receber',
  balance: null,
};

export function treinoFormatura() {
  const quando = '2026-01-15T12:00:00.000Z';
  return {
    ...estadoTreinoVazio,
    done: {
      receber: quando,
      enviar: quando,
      conferir: quando,
      golpe: quando,
      seed: quando,
    },
  };
}

export interface Lancamento {
  id: string;
  date: string;
  brl: number;
  btc: number;
  exchange: string;
  note: string;
  source: 'manual' | 'onchain' | 'demo';
  txid?: string;
}

export function diarioInicial(parcial: Partial<{
  address: string;
  entries: Lancamento[];
  reminder: { ativo: boolean; dia: number; valor: number };
  demo: boolean;
  manualPrice: number | null;
}> = {}) {
  return {
    address: '',
    entries: [] as Lancamento[],
    reminder: { ativo: false, dia: 5, valor: 200 },
    demo: false,
    manualPrice: null,
    ...parcial,
  };
}

export async function semearDiario(page: Page, estado = diarioInicial()) {
  await semear(page, CHAVE_DIARIO, estado);
}

/** Grava o diário numa página já aberta e recarrega, porque o módulo lê o localStorage só na carga. */
export async function gravarDiarioERecarregar(page: Page, estado: unknown) {
  await page.evaluate(
    ({ chave, json }) => localStorage.setItem(chave, json),
    { chave: CHAVE_DIARIO, json: JSON.stringify(estado) },
  );
  await page.reload();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export async function semearTreino(page: Page, estado: unknown) {
  await semear(page, CHAVE_TREINO, estado);
}

export { CHAVE_DIARIO, CHAVE_TREINO };
