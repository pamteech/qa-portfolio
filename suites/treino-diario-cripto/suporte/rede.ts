import type { Page, Route } from '@playwright/test';
import { PRECO_PADRAO } from './constantes';

export interface ControleRede {
  saldoWei: bigint;
  preco: number;
  precoBinance: number;
  coingeckoOk: boolean;
  binanceOk: boolean;
  historicoOk: boolean;
  mempoolOk: boolean;
  chamadasRpc: string[];
  /** Se preenchida, o próximo eth_getBalance espera esta promise antes de responder. */
  esperaSaldo: Promise<void> | null;
}

export function controlePadrao(): ControleRede {
  return {
    saldoWei: 0n,
    preco: PRECO_PADRAO,
    precoBinance: PRECO_PADRAO,
    coingeckoOk: true,
    binanceOk: true,
    historicoOk: true,
    mempoolOk: true,
    chamadasRpc: [],
    esperaSaldo: null,
  };
}

function historico(preco: number) {
  const prices: [number, number][] = [];
  const inicio = Date.UTC(2024, 0, 1);
  const fim = Date.UTC(2026, 6, 1);
  for (let t = inicio; t <= fim; t += 86_400_000) prices.push([t + 12 * 3_600_000, preco]);
  return { prices };
}

function responderRpc(corpo: unknown, ctrl: ControleRede) {
  if (typeof corpo === 'string') {
    try {
      corpo = JSON.parse(corpo);
    } catch {
      corpo = null;
    }
  }
  const lista = Array.isArray(corpo) ? corpo : [corpo];
  const respostas = lista.map((chamada) => {
    const req = (chamada ?? {}) as { id?: number; method?: string };
    const method = req.method ?? 'desconhecido';
    ctrl.chamadasRpc.push(method);
    const id = req.id ?? 1;
    const base = { jsonrpc: '2.0', id };
    if (method === 'eth_getBalance') {
      return { ...base, result: `0x${ctrl.saldoWei.toString(16)}` };
    }
    if (method === 'eth_chainId') return { ...base, result: '0xaa36a7' };
    if (method === 'net_version') return { ...base, result: '11155111' };
    if (method === 'eth_blockNumber') return { ...base, result: '0x10' };
    if (method === 'eth_getTransactionCount') return { ...base, result: '0x0' };
    return { ...base, result: '0x0' };
  });
  return Array.isArray(corpo) ? respostas : respostas[0];
}

function caixaMempool(endereco: string) {
  const blockTime = Math.floor(Date.UTC(2024, 5, 1, 15, 0, 0) / 1000);
  return {
    info: {
      address: endereco,
      chain_stats: { funded_txo_sum: 100_000_000, spent_txo_sum: 0, tx_count: 1 },
      mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
    },
    txs: [
      {
        txid: 'ab'.repeat(32),
        status: { confirmed: true, block_time: blockTime },
        vin: [],
        vout: [{ scriptpubkey_address: endereco, value: 100_000_000 }],
      },
    ],
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function instalarRotas(page: Page, ctrl: ControleRede) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();

    if (url.includes('coingecko.com') && url.includes('/simple/price')) {
      if (!ctrl.coingeckoOk) return json(route, { erro: 'indisponivel' }, 503);
      return json(route, { bitcoin: { brl: ctrl.preco } });
    }
    if (url.includes('coingecko.com') && url.includes('/market_chart')) {
      if (!ctrl.historicoOk) return json(route, { erro: 'indisponivel' }, 503);
      return json(route, historico(ctrl.preco));
    }
    if (url.includes('binance.com') && url.includes('ticker/price')) {
      if (!ctrl.binanceOk) return json(route, { erro: 'indisponivel' }, 503);
      return json(route, { symbol: 'BTCBRL', price: String(ctrl.precoBinance) });
    }
    if (url.includes('mempool.space/api/address/')) {
      if (!ctrl.mempoolOk) return json(route, { erro: 'indisponivel' }, 503);
      const trecho = url.split('/api/address/')[1] ?? '';
      const endereco = decodeURIComponent(trecho.split('/')[0] ?? '');
      const caixa = caixaMempool(endereco);
      if (trecho.includes('/txs')) return json(route, caixa.txs);
      return json(route, caixa.info);
    }
    if (url.includes('publicnode.com') || url.includes('1rpc.io')) {
      let corpo: unknown = null;
      try {
        corpo = route.request().postDataJSON();
      } catch {
        corpo = route.request().postData();
      }
      if (typeof corpo === 'string') {
        try {
          corpo = JSON.parse(corpo);
        } catch {
          corpo = null;
        }
      }
      const chamada = (Array.isArray(corpo) ? corpo[0] : corpo) as { method?: string } | null;
      if (chamada?.method === 'eth_getBalance' && ctrl.esperaSaldo) await ctrl.esperaSaldo;
      return json(route, responderRpc(corpo, ctrl));
    }

    await route.continue();
  });
}
