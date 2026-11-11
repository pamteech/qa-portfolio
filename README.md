# Portfólio de QA — Pamella Soares

Suíte de ponta a ponta do [Treino & Diário Cripto](https://cripto-treino-diario.vercel.app), com Page Object Model, rede simulada e [Allure Report](https://pamteech.github.io/qa-portfolio/) publicado no GitHub Pages.

[![E2E Treino & Diário Cripto](https://github.com/pamteech/qa-portfolio/actions/workflows/e2e-treino-diario.yml/badge.svg)](https://github.com/pamteech/qa-portfolio/actions/workflows/e2e-treino-diario.yml)

O app em produção não é alterado por este repositório. A suíte só observa o que está no ar.

## O que é testado

O app tem dois modos. O **Modo Treino** cria uma carteira Ethereum de teste (Sepolia) no navegador e conduz cinco missões. O **Modo Diário** registra compras manuais de bitcoin, calcula totais e mostra uma prévia de imposto de renda.

| Área | O que a suíte cobre |
|---|---|
| Fumaça | Home, navegação pelos cartões e pelas abas, aviso do rodapé |
| Treino | Criar, copiar e apagar a carteira; progresso preservado; missões Conferir, Golpes e Seed; recebimento com saldo simulado; revisão de envio sem transmitir transação; certificado de formatura |
| Diário | Inclusão, listagem, exclusão, persistência, JSON corrompido, limites de data, valor e quantidade |
| Cálculo | Total investido, sats, preço médio, lucro, aviso de preço fora da cotação, IR em R$ 4.999,99 e R$ 5.000,00, custo por ano |
| Arquivos | CSV (BOM, `;`, decimal com vírgula) e lembrete `.ics` |
| Demonstração e on-chain | Dados fictícios sem mexer nos lançamentos reais, mempool.space simulado, xpub, seed e endereço inválido |
| Cotação | CoinGecko, reserva Binance, falha das duas, preço manual, histórico indisponível |
| Acessibilidade | axe-core nas tags WCAG 2.x A/AA, no desktop e no celular |
| Visual e layout | Três telas no desktop; empilhamento e ausência de vazamento horizontal no celular |

Envio real e faucet ficam de fora: os dois pedem captcha. O saldo e as cotações entram por `page.route`, então o resultado não depende da rede Sepolia nem da cotação do dia.

## Estratégia

- Playwright em TypeScript, com Page Objects em `paginas/`, fixtures em `fixtures/` e massa em `suporte/`.
- A URL padrão é a de produção. `BASE_URL` troca o alvo.
- O relógio da página fica parado em 15/06/2026, 15:00 (America/Sao_Paulo), para datas, lembrete e demonstração não mudarem de um dia para o outro.
- Dois projetos: `desktop` (Chromium 1440×900) e `mobile` (Pixel 7). O celular executa `@smoke`, `@a11y` e `@mobile`.
- Screenshot, vídeo e trace só quando o teste falha. O Allure guarda esses anexos, os passos e o histórico entre execuções.
- Tags no título: `@smoke`, `@regressao`, `@a11y`, `@mobile`.

Contagem da suíte estável: **47 testes**, **52 execuções** (o celular repete fumaça e acessibilidade).

| Tag | Testes | Execuções |
|---|---:|---:|
| `@smoke` | 4 | 8 |
| `@regressao` | 41 | 41 |
| `@a11y` | 1 | 2 |
| `@mobile` | 1 | 1 |

## Como rodar

Requer Node.js 20+ e um JRE (o Allure Report 2 usa Java).

```bash
npm ci
npx playwright install --with-deps chromium
npm test                  # suíte inteira, contra a URL de produção
npm run test:smoke        # só @smoke
npm run test:regressao
npm run test:a11y
npm run test:mobile
BASE_URL=https://cripto-treino-diario.vercel.app npm test
npm run report            # gera suites/treino-diario-cripto/allure-report
npm run report:abrir
```

O histórico local é reaproveitado se já existir um relatório. No CI, o script baixa o histórico publicado em `https://pamteech.github.io/qa-portfolio/history` antes de gerar o novo.

## CI e relatório

O workflow [E2E Treino & Diário Cripto](.github/workflows/e2e-treino-diario.yml) roda em todo push na `main`, em pull request para a `main`, por disparo manual e todo dia às 12:00 UTC. Na `main`, ele publica o Allure com `actions/deploy-pages`.

Relatório: [https://pamteech.github.io/qa-portfolio/](https://pamteech.github.io/qa-portfolio/). O endereço passa a responder quando o workflow roda na `main` com o GitHub Pages usando GitHub Actions como origem.

## Defeitos encontrados e corrigidos

A primeira versão da suíte achou sete defeitos no app. Eles foram corrigidos em produção, e os testes agora exigem o comportamento novo. Se algum voltar, a suíte fica vermelha.

1. **Contraste.** `--muted` saiu de `#64748b` para `#475569`, com contraste de 7:1. O axe não dispensa mais `color-contrast`.
2. **Tabela rolável.** `.table-wrap` tem `role="region"`, `tabindex="0"` e `aria-label`, então o teclado alcança a rolagem.
3. **Missão Conferir.** O rótulo `0,05 ETH` fica preso ao endereço verdadeiro. Os parecidos mostram `0 ETH`.
4. **Revisão do envio.** Mudar o destino ou o valor depois da revisão desmarca a caixa, desabilita “Assinar e enviar” e esconde `.confirm-box`.
5. **Preço manual.** `410000.50` e `410.000,50` valem o mesmo. Com 0,0005 BTC, `410000.50` dá R$ 205,00.
6. **Arquivo .ics.** Barra invertida, vírgula, ponto e vírgula e quebra de linha são escapados nos campos TEXT. O `SUMMARY` contém `R$ 300\,00`.
7. **Endereço bc1.** A forma toda em maiúsculas é aceita. Maiúsculas e minúsculas misturadas continuam recusadas.

A chave da carteira de teste segue em texto puro no `localStorage`, como o próprio app avisa, porque só existe na Sepolia. O envio real continua fora da suíte: a faucet pede captcha.

## Estrutura

```
suites/treino-diario-cripto/   # esta suíte
  paginas/                     # Page Objects
  fixtures/                    # relógio, rede simulada, páginas
  suporte/                     # massa, rotas, armazenamento
  tests/                       # specs e baselines visuais
  allure/                      # categorias do relatório
  scripts/                     # histórico e geração do Allure
suites/api/                    # reservado
suites/painel/                 # reservado
```

Novas suítes entram em `suites/<nome>/`, com o próprio `playwright.config.ts`, para o relatório e o workflow poderem crescer sem misturar os alvos.
