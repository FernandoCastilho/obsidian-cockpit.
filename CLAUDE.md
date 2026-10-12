# obsidian-cockpit.

O diretório raiz termina em ponto (`obsidian-cockpit.`): use aspas nos caminhos no shell.

Três apps Node independentes (ESM, Node 22), cada um com seu `package.json` e `package-lock.json`. Não há workspace na raiz; rode `npm ci` dentro de cada pasta.

- `cotacoes/`: PWA React/Vite de cotações, curvas, macro e notícias. Os scripts de coleta ficam em `scripts/` e o `quotes.yml` publica os JSONs na branch `data`.
- `caixa/`: PWA React/Vite de fluxo de caixa que lê e grava numa planilha do Google. Vai para `/caixa` dentro do build de `cotacoes`.
- `caixa-central/`: importador de extratos do Itaú, só lógica e testes, sem build.
- `docs/`: análise do plugin Obsidian Team Manager, base de referência para o Cockpit.

## Comandos

Em cada app: `npm test` (`node --test test/*.test.mjs`). `cotacoes` e `caixa` também têm `npm run dev` e `npm run build`.

## Deploy

`.github/workflows/pages.yml` roda em push na `main` (só se mudar `cotacoes/`, `caixa/` ou o próprio workflow) e por cron em dias úteis. Ele testa, coleta dados, builda os dois apps e publica no GitHub Pages. Mudou o fluxo de build de um app: confira o passo "App Caixa" no workflow.

## Convenções

- Texto de interface, commits e comentários em português do Brasil.
- Testes de `caixa-central` usam dados fictícios. Extratos reais não vão para o git; `caixa-central/.local/` está no `.gitignore` para arquivos locais.
