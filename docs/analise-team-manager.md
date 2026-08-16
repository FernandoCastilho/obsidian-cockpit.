# Análise técnica — Obsidian Team Manager (v0.5.0)

Base de referência para o desenvolvimento do **Obsidian Cockpit**.

Autor original: André (`andyguy-dot/obsidian-team-manager`) · Licença **MIT** ·
~16.000 linhas (13.250 de TypeScript + 2.773 de CSS) · sem dependências de UI.

---

## 1. O que é o plugin

Um "sistema de gestão de time" construído inteiramente sobre notas markdown do
Obsidian. Não há banco de dados: cada pessoa, reunião, projeto, série recorrente
e nota de performance é um `.md` com frontmatter YAML. O plugin é apenas uma
**camada de índice + UI** sobre esses arquivos.

Domínios cobertos:

| Domínio | Entidade | Como é armazenado |
| --- | --- | --- |
| Pessoas | `Person` | `type: person` em `People/` |
| 1:1s e reuniões | `Meeting` | `type: meeting` + `kind: 1on1\|work\|project\|series` em `Meetings/` |
| Rituais recorrentes | `Series` | `type: series` em `Series/` |
| Projetos (Kanban) | `Project` | `type: project` em `Projects/` |
| Avaliações | `PerformanceNote` | `type: performance` em `Performance/` |
| Calendário | `CalendarEvent` | feeds iCal externos (somente leitura, não vira nota) |

**A regra de escopo mais importante do plugin:** uma nota só é reconhecida se
tiver o `type:` correto **E** estiver dentro da pasta configurada para aquele
tipo. Isso evita colidir com o resto do vault (`type: project` é um namespace
que outros plugins também usam). Copie essa decisão.

---

## 2. Stack e pipeline de build

```
package.json      → esbuild 0.20 + typescript 5.4.5 + obsidian (types)
                    única dependência de runtime: ical.js ^2.2.1
esbuild.config.mjs→ bundle CJS, entry src/main.ts → main.js
                    external: obsidian, electron, builtinModules
tsconfig.json     → target ES2018, strictNullChecks, noImplicitAny, isolatedModules
.github/workflows → release em push de tag: npm ci && npm run build
                    → gh release create com main.js + manifest.json + styles.css
```

`npm run build` = `tsc -noEmit -skipLibCheck && node esbuild.config.mjs production`
— o TypeScript só faz type-check, o esbuild faz o bundle. É o setup padrão
recomendado para plugins do Obsidian e você deve copiá-lo tal e qual.

Observações:
- **`strict: true` não está ligado** — só `strictNullChecks` e `noImplicitAny`.
  Para um projeto novo, ligue `strict` completo desde o início; depois dói.
- **Não há ESLint, Prettier nem testes.** Nenhum. Em 16k linhas.

---

## 3. Arquitetura em camadas

```
┌─────────────────────────────────────────────────────────────┐
│  main.ts (823 linhas) — Plugin, comandos, eventos, roteamento│
└───────────────┬─────────────────────────────────────────────┘
                │
    ┌───────────┼───────────────┬──────────────────┐
    ▼           ▼               ▼                  ▼
┌────────┐ ┌──────────┐  ┌──────────────┐  ┌──────────────┐
│ data.ts│ │ notes.ts │  │ views/*.ts   │  │ *Block.ts    │
│ store  │ │ criação  │  │ ItemView     │  │ code blocks  │
│ (904 l)│ │ de notas │  │ (4 telas)    │  │ (4 tipos)    │
└───┬────┘ └────┬─────┘  └──────┬───────┘  └──────┬───────┘
    │           │               │                 │
    │      ┌────▼───────────────▼─────────────────▼────┐
    │      │  sections.ts — leitura/escrita de seções   │
    │      │  render.ts   — MarkdownRenderer            │
    │      │  modals/     — 9 modais                    │
    │      │  controls.ts — filtros e menus reutilizáveis│
    │      └────────────────────────────────────────────┘
    │
    └──► types.ts (contratos) ◄── todos importam
```

A separação boa aqui: **`data.ts` nunca escreve, `notes.ts`/`sections.ts` nunca
leem para exibir.** Leitura e escrita são módulos distintos. Vale manter.

---

## 4. O núcleo reaproveitável: `TeamStore` (`src/data.ts`)

Esta é, de longe, a peça mais valiosa do repositório. É um **índice em memória
reconstruído a partir do vault**, com cache por mtime.

### 4.1 O ciclo de refresh (5 passes)

```ts
doRefresh() {
  // Pass 1: coleta todas as pessoas (só frontmatter, via metadataCache)
  // Pass 2: parseia meetings, projects, series, performance
  //         → meetings ficam numa lista solta, sem anexar ainda
  // (anexa) meetings → pessoas / projetos / séries
  //         (só agora, porque um meeting pode citar um projeto
  //          que o loop ainda não tinha alcançado)
  // Pass 3: lê conteúdo dos projetos (logs, action items)
  // Pass 4: agregados por pessoa (ordenação, cadência, buffers)
  // Pass 5: action items dos meetings
}
```

**Detalhe crítico de correção:** ele constrói em `Map`s locais e só faz o *swap*
no final (`this.people = people`). Isso garante que dois refreshes concorrentes
nunca mutem o mesmo objeto pela metade.

### 4.2 As três otimizações que fazem isso escalar

1. **Coalescing de chamadas concorrentes**

   ```ts
   refresh(): Promise<void> {
     if (!this.refreshPromise) {
       this.refreshPromise = this.doRefresh()
         .finally(() => { this.refreshPromise = null; });
     }
     return this.refreshPromise;
   }
   ```
   As views chamam `store.refresh()` a cada render. Sem isso, 4 views abertas =
   4 varreduras completas do vault simultâneas.

2. **Cache de conteúdo por mtime** (`ContentEntry`)

   Frontmatter vem do `metadataCache` do Obsidian (grátis). Mas action items,
   bullets sob heading e logs datados exigem **ler o arquivo**. O cache guarda o
   parse indexado por `file.stat.mtime`; um refresh custa `O(arquivos alterados)`
   em vez de `O(vault)`. O comentário no código é honesto: *"ler arquivos é ~99%
   de um refresh; parsing é ruído"*.

3. **Invalidação explícita além do mtime**

   ```ts
   this.registerEvent(this.app.vault.on("modify", f => store.invalidate(f.path)));
   ```
   "Cinto além do suspensório": o plugin frequentemente escreve uma nota e
   re-renderiza imediatamente, e não se quer depender do `mtime` já ter sido
   atualizado. Essa é uma armadilha real do Obsidian — anote.

4. **Poda do cache**: entradas de notas que saíram do escopo (renomeadas,
   deletadas, retipadas) são removidas comparando com `seenPaths`, para o `Map`
   não crescer indefinidamente.

### 4.3 Regras de negócio que vivem no store

```ts
getHealth(person): "ok" | "warn" | "overdue" | "never"
  ratio = daysSinceLast / cadenceTarget
  ratio > 1     → overdue
  ratio >= 0.75 → warn
```

Toda métrica derivada (saúde de cadência, staleness de projeto, review vencida,
`computeMetrics()`) fica no store, **não nas views**. As views só formatam.
Copie isso: é o que impede que 1.238 linhas de `DashboardView` virem 2.500.

### 4.4 Normalização de entrada (a parte chata que você vai precisar)

```ts
stripLink("[[Ana Silva|Ana]]") → "Ana Silva"      // wikilinks em frontmatter
normalizeDate(Date | "2026-07-16T10:00" | ...) → "2026-07-16"
parseCadence("weekly" | "semanal" | 14 | "14") → 7 | 7 | 14 | 14
parseRelation("lider" | "líder" | "leader") → "manager"
isUnder(path, folder) → comparação case-insensitive (Windows/macOS)
```

Frontmatter escrito à mão é caótico. Esses 5 normalizadores são ~60 linhas e
poupam centenas de bugs. **Reaproveite literalmente.**

Curiosidade: há aliases em português no código (`diário`, `semanal`, `quinzenal`,
`mensal`, `par`, `pares`, `líder`) — vestígio de que o autor é lusófono. Não há
i18n de verdade; toda a UI é inglês hardcoded.

---

## 5. Manipulação de markdown: `sections.ts` (208 linhas, altíssimo valor)

O plugin trata **headings como se fossem campos de banco**. Esse arquivo é o
CRUD sobre seções de uma nota, e é totalmente genérico — dá para copiar sem
alterar uma linha.

```ts
findSection(lines, heading)         // acha o heading e os limites da seção
                                    // (até o próximo heading de nível <= )
sectionBulletsOf(content, heading)  // puro: bullets sob um heading
lastDatedBulletInSection(...)       // puro: bullet "- 2026-07-16: texto" mais recente
appendToSection(app, file, h, item) // cria a seção se não existir
prependToSection(...)               // logs leem de cima para baixo
appendDatedToSection / prependDatedToSection
toggleTaskLine(app, file, line)     // marca "- [ ]" → "- [x]"
consumeSectionBullets(...)          // LÊ E LIMPA — o padrão "buffer"
```

### O padrão mais elegante do plugin: o *buffer de agenda*

Durante a semana você joga itens sob `## 📥 Next 1:1` na nota da pessoa. Ao
criar a 1:1, `consumeSectionBullets()` **lê os bullets e apaga a seção na mesma
operação atômica**, e eles nascem já dentro da nova nota de reunião. O buffer
zera sozinho. É um padrão de UX que vale ouro e custa 15 linhas.

### Escrita segura

Toda escrita usa `app.vault.process(file, content => newContent)` — a API
transacional do Obsidian, que evita a corrida de `read` → modificar → `modify`.
Frontmatter usa `app.fileManager.processFrontMatter()`. **Nunca** use
`vault.modify()` depois de um `read()` manual. Zero ocorrências de `innerHTML`
no projeto inteiro (requisito da revisão da comunidade Obsidian).

---

## 6. Camada de UI

Quatro mecanismos distintos, todos DOM puro (sem React/Svelte):

### 6.1 `ItemView` — telas completas

| View | Tipo | Papel |
| --- | --- | --- |
| `DashboardView` | tab | 5 abas: People, Meetings, Calendar, Projects, Action items |
| `PersonDetailView` | tab | "hub" de uma pessoa, com carrossel entre pessoas |
| `SeriesDetailView` | tab | hub de um ritual recorrente |
| `ContextView` | painel lateral | espelha a nota aberta (agenda, itens, projetos) |

Padrão de estado persistente:

```ts
getState(): Record<string, unknown>       // salvo no workspace.json
async setState(state, result): Promise<void>  // restaurado ao reabrir o Obsidian
```

### 6.2 Code blocks — "hubs vivos" dentro das notas

Esta é a ideia de produto mais forte do plugin. Você escreve numa nota:

````markdown
```team-hub
```
````

…e o bloco renderiza um dashboard ao vivo daquela pessoa **dentro da própria
nota**. Quatro variantes: `team-hub`, `team-project`, `team-meeting`,
`team-series`.

```ts
plugin.registerMarkdownCodeBlockProcessor(HUB_BLOCK_LANG, (src, el, ctx) => {
  ctx.addChild(new HubBlock(plugin, el, ctx.sourcePath));
});
```

`HubBlock extends MarkdownRenderChild` → ganha ciclo de vida (`onload`,
`registerEvent`) e é destruído junto com o render. Ele se re-renderiza sozinho
ouvindo `metadataCache.on("changed")` com debounce de 400 ms.

Dois cuidados que o autor resolveu e você vai reencontrar:

- `stripPluginBlocks()` (`render.ts`): ao pré-visualizar uma nota dentro de um
  painel, os blocos do próprio plugin são removidos do markdown — senão você
  aninha um hub dentro de outro hub, infinitamente.
- Sub-`Component` descartável para as previews (`previewOwner()`), para que
  `MarkdownRenderer.render()` não vaze filhos a cada re-render.

### 6.3 Modais (9)

- `TextPromptModal` — genérico, mono ou multilinha, com callback. Usado 6×.
- `GenericSuggestModal<T>` / `PersonSuggestModal` / `ProjectSuggestModal` —
  `FuzzySuggestModal` do Obsidian, promisificado:

  ```ts
  const person = await new Promise<Person|null>(resolve =>
    new PersonSuggestModal(app, people, resolve, () => resolve(null)).open());
  ```
  Padrão simples e muito reutilizável.
- `InlineSuggest<T> extends AbstractInputSuggest` — autocomplete inline **com
  linha "＋ Criar X"**: se a pessoa não existe, ela é criada sem sair do fluxo
  (`createAndIndexPerson` cria, espera indexar, refaz o refresh e devolve o
  objeto). Excelente UX; roube.
- `CaptureModal` (527 linhas) — o "quick capture universal": tipo → alvo →
  destino → texto, tudo em um modal, teclado-first.

### 6.4 Menus de contexto

`Menu` nativo do Obsidian em vez de popovers customizados — o comentário do
autor explica por quê: *"menus renderizam fora do painel com scroll; um popover
posicionado dentro é cortado"*. Verdade prática do Obsidian.

`controls.ts` abstrai isso num sistema de filtros declarativo:

```ts
interface FilterDef { id, label, options?, toggle?, get(), set(), chip() }
renderFilterMenu(bar, defs, apply)   // um botão "Filter" com contador
renderFilterChips(root, defs, apply) // chips explicitando o que está filtrando
```

Com uma auto-correção elegante: um filtro apontando para uma nota deletada
esconderia tudo silenciosamente, então ele se limpa sozinho.

---

## 7. Sistema de design (`styles.css`, 2.773 linhas)

Tudo escora nas variáveis do Obsidian (`--background-primary`, `--text-muted`,
`--color-green`), com uma camada própria por cima:

```css
.tm-dashboard, .tm-person, .tm-context, .tm-hub-block, .tm-capture-modal {
  --tm-r-sm: 8px; --tm-r-md: 11px; --tm-r-pill: 999px;
  --tm-ease: cubic-bezier(0.32, 0.72, 0, 1);  /* ease-out iOS */
  --tm-dur: 0.19s;
  --tm-tint-ok:  color-mix(in srgb, var(--color-green) 15%, transparent);
  --tm-ink-ok:   color-mix(in oklab, var(--color-green), #000 24%);
}
.theme-dark .tm-dashboard { /* no escuro a tinta clareia em vez de escurecer */ }
```

Pontos a copiar:
- **Namespace `tm-` em toda classe** — obrigatório, evita vazar estilo pro app.
- **Tokens em `:root` do escopo do plugin**, não valores soltos.
- **`color-mix` sobre as cores do tema** → funciona em qualquer tema do usuário,
  claro ou escuro, sem hardcode.
- **Escopo por container**, não global — nada de `.button { }` solto.

Ponto a não copiar: **um único arquivo de 2.773 linhas**. Divida por
componente e concatene no build.

---

## 8. Integração de calendário (`src/calendar/`, ~1.100 linhas)

Único ponto do plugin que fala com a rede, e só lê.

```
ics.ts    (197 l) → parseEvents(ics, from, to, feed): CalendarEvent[]
store.ts  (133 l) → CalendarStore: fetch, cache, TTL, janelas expandidas
events.ts (240 l) → utilitários de data, matching de convidados, menus
view.ts   (572 l) → 5 modos: agenda / dia / 3 dias / semana / mês
```

### Decisões de arquitetura relevantes

- **URL secreta iCal em vez de OAuth.** Sem projeto no Google Cloud, sem app
  para aprovar. O custo: a URL *é uma credencial*, guardada em texto plano no
  `data.json`, e o Google serve de cache (invites novos demoram). O plugin trata
  isso com honestidade: campo `type="password"` nas settings, aviso no README,
  timestamp do último sync visível e refresh manual.
- **Texto bruto do feed é mantido em memória.** Mudar de mês é um *re-parse*
  (milissegundos), não um download.
- **TTL de 10 min + `inFlight` promise** — renders não viram requisições.
- **Recorrência tratada corretamente:** `RECURRENCE-ID` (exceções) é religado ao
  master via `relateException()` antes de iterar; overrides órfãos viram eventos
  soltos; `MAX_OCCURRENCES = 400` impede que um `RRULE` malformado trave o app;
  `VTIMEZONE` do feed é registrado no `ICAL.TimezoneService` senão horários
  flutuantes derivam. Isso é conhecimento de domínio caro — se o Cockpit tiver
  calendário, **copie `ics.ts` inteiro**.
- `localISODate()` em vez de `toISOString().slice(0,10)` — este último desloca o
  dia pelo fuso. Bug clássico, já resolvido aqui.

Matching de convidado → nota de pessoa: por `email` no frontmatter, com fallback
por nome exato. Quem não casa pode ser criado direto do evento, com o e-mail já
preenchido — *"o único momento em que o e-mail dele é conhecido com certeza"*.

---

## 9. Ciclo de vida e eventos (`main.ts`)

```ts
onload() {
  const firstRun = await this.loadSettings();   // true se não havia data.json
  registerView(×4); registerCodeBlock(×4);
  addRibbonIcon(); addCommand(×14); addSettingTab();

  // invalidação de cache
  vault.on("modify"|"delete"|"rename") → store.invalidate(path)
  // re-render
  metadataCache.on("changed"|"resolved") → refreshViews()   // debounce 600ms
  // roteamento do painel de contexto
  workspace.on("file-open") → mostra a pessoa/projeto/série da nota
  workspace.on("active-leaf-change") → idem para views (file-open não dispara)

  workspace.onLayoutReady(() => {
    if (firstRun) setupFolders(true);   // só na instalação limpa
    calendar.refresh();
  });
  registerInterval(setInterval(() => calendar.refresh(), 15 * 60_000));
}
```

Padrões a copiar:

- **`refreshViews` com `debounce(fn, 600, true)`** varrendo todas as leaves e
  chamando `view.render()` se existir. Um único ponto de invalidação de UI.
- **`onLayoutReady`** antes de escrever no vault — escrever em `onload` é corrida.
- **`firstRun` detectado por `loadData() == null`** — cria a estrutura de pastas
  só na primeira vez; ninguém quer pastas deletadas ressuscitando a cada boot.
- **`waitForIndex(file, 1500)`** — depois de criar uma nota, espera o
  `metadataCache` indexá-la (ou dá timeout) antes de abrir a view que depende
  dela. Sem isso a UI pisca "não encontrado".
- **Migração de settings no load:**
  ```ts
  if (!this.settings.relations.includes("self")) {
    this.settings.relations = ["self", ...this.settings.relations];
    await this.saveSettings();
  }
  ```
  Simplista, mas funciona. Para o Cockpit, prefira um campo `schemaVersion`.
- **`checkCallback`** em comandos contextuais: o comando só aparece na paleta se
  fizer sentido para a nota ativa.

---

## 10. Configurações (`settings.ts`, 478 linhas)

`TeamManagerSettings` tem 19 campos: 6 pastas, 4 headings, cadências, listas de
relações e status, modo discreto, calendários.

Três helpers próprios que valem copiar:
- `sliderWithBox()` — slider + caixa numérica sincronizados nos dois sentidos.
- `textField({ fallback })` — campo com botão "resetar ao padrão" (ícone
  `rotate-ccw`).
- `listField()` — lista separada por vírgula, normalizada para minúsculas.

Detalhe de privacidade: `discreetMode` esconde observações de performance em
toda a UI — pensado para compartilhar tela durante a própria 1:1. Tipo de
feature que só nasce de uso real.

---

## 11. Pontos fortes (copie)

1. **Notas simples como fonte da verdade.** "Desligue o plugin e suas notas
   continuam notas." É o argumento de venda e a decisão arquitetural correta.
2. **Escopo por `type` + pasta.** Não invade o vault.
3. **`TeamStore` com cache por mtime e swap atômico.** O coração.
4. **`sections.ts`.** CRUD de headings, genérico e portável.
5. **Padrão *buffer*** (`consumeSectionBullets`) — leia-e-limpe.
6. **Code blocks como hubs vivos.** Diferencial de produto real.
7. **Normalizadores de frontmatter.** ~60 linhas, centenas de bugs evitados.
8. **CSS baseado nas variáveis do tema + `color-mix`.**
9. **Comentários explicando *por quê*, não *o quê*.** O código é legível porque
   cada decisão não-óbvia tem uma frase justificando. Padrão raro; mantenha.
10. **Workflow de release por tag.** Copie o `.github/workflows/release.yml`.

---

## 12. Pontos fracos (não copie)

| Problema | Impacto | O que fazer no Cockpit |
| --- | --- | --- |
| **Zero testes** | Nenhuma rede de segurança em 16k linhas | Vitest desde o dia 1 nas funções puras (`sections.ts`, normalizadores, `ics.ts`) — são puras de propósito, testá-las é trivial |
| **`DashboardView` com 1.238 linhas** | God object: toolbar, filtros, 5 modos, cards, métricas | Um arquivo por modo/aba desde o início |
| **`styles.css` monolítico (2.773 l)** | Difícil de navegar | CSS por componente, concatenado no build |
| **`refresh()` varre `getMarkdownFiles()` inteiro** | O(vault) em frontmatter a cada refresh; ok até ~10k notas, degrada depois | Índice incremental: reaja a `create`/`delete`/`rename`/`changed` e atualize só o afetado |
| **Action items indexados por número de linha** | Se a nota mudar entre índice e clique, marca a linha errada (há um guard `if (/\[ \]/.test(line))`, mas é frágil) | Ancorar por texto + linha, ou usar block IDs |
| **URL iCal em texto plano no `data.json`** | Credencial exposta em backup/sync | Documente com o mesmo destaque; considere não persistir e pedir por sessão |
| **Sem i18n** | Inglês hardcoded, resíduos de PT-BR no parser | Extraia strings para um módulo desde o começo |
| **`strict: true` desligado** | Menos garantias do compilador | Ligue tudo agora — retroativamente é caro |
| **Sem ESLint** | — | `eslint` + `@typescript-eslint` + regras do obsidian-plugin |
| **Migração de settings ad-hoc** | Vai ficar insustentável | Campo `schemaVersion` + funções de migração |
| **Escrita de frontmatter por template de string** | `createPersonNote` monta YAML com `join("\n")`; nomes com caracteres especiais podem quebrar | `processFrontMatter()` para tudo, ou serializador YAML de verdade |

---

## 13. Licença e uso como base

**MIT.** Você pode copiar, modificar, redistribuir e até vender, com uma
condição: manter o aviso de copyright e a licença. Na prática:

- Se copiar arquivos inteiros (`sections.ts`, `ics.ts`, `data.ts`), mantenha um
  `NOTICE` ou cabeçalho creditando: *"Partes derivadas de obsidian-team-manager
  © André, licença MIT"* e inclua o texto da MIT.
- Se apenas se inspirar nos padrões, não há obrigação legal — mas creditar no
  README é de bom tom.
- O Cockpit pode ter licença própria (inclusive proprietária), desde que a parte
  derivada continue acompanhada do aviso MIT.

---

## 14. Roteiro sugerido para o Obsidian Cockpit

### O que reaproveitar quase intacto

```
src/sections.ts          ← CRUD de headings (208 l) — copie inteiro
src/render.ts            ← stripFrontmatter/stripPluginBlocks/renderNoteBody
src/avatar.ts            ← hash djb2 → hue determinístico
src/controls.ts          ← FilterDef + menus (127 l)
src/modals/TextPromptModal.ts
src/modals/GenericSuggestModal.ts
src/modals/InlineSuggest.ts   ← autocomplete com "＋ Criar"
src/calendar/ics.ts      ← se houver calendário: 197 l de conhecimento caro
esbuild.config.mjs, tsconfig.json, .github/workflows/release.yml
Os normalizadores de data.ts: stripLink, normalizeDate, parseCadence, isUnder
```

### O que reescrever com a estrutura melhorada

```
data.ts    → mantenha o padrão (passes, cache por mtime, swap atômico),
             mas com atualização incremental por evento
views/     → um arquivo por tela/aba, nunca 1.200 linhas
styles.css → um arquivo por componente
settings   → schemaVersion + migrações + i18n
```

### O que repensar do zero

O **modelo de domínio**. O Team Manager é opinado para gestão de pessoas
(pessoa · 1:1 · cadência · review). "Cockpit" sugere outro escopo — painel
pessoal, agregador, centro de comando. Defina primeiro:

1. Quais são as entidades? (o `types.ts` é o documento fundador — 150 linhas de
   interfaces comentadas, escrito antes do resto)
2. Cada uma vive em qual pasta, com qual `type:`?
3. Quais métricas derivadas o store calcula? (elas definem toda a UI)
4. Qual é o "buffer" do seu domínio — o que se acumula e é consumido?
5. Quais code blocks fazem sentido embutir nas notas?

### Esqueleto mínimo para começar

```
obsidian-cockpit/
├── manifest.json          id, name, version, minAppVersion, isDesktopOnly:false
├── package.json           esbuild + typescript + obsidian (devDeps)
├── tsconfig.json          strict: true
├── esbuild.config.mjs     ← copiado
├── versions.json          mapa versão-plugin → minAppVersion
├── .github/workflows/release.yml  ← copiado
├── styles/                *.css por componente
└── src/
    ├── main.ts            Plugin: views, comandos, eventos, onLayoutReady
    ├── types.ts           ← escreva ESTE arquivo primeiro
    ├── constants.ts       langs de code block, headings
    ├── settings.ts        interface + DEFAULTS + SettingTab
    ├── store/
    │   ├── index.ts       o índice (padrão TeamStore)
    │   ├── parse.ts       normalizadores
    │   └── metrics.ts     regras derivadas
    ├── notes/             criação de notas (templates)
    ├── sections.ts        ← copiado
    ├── views/             uma tela por arquivo
    ├── blocks/            code block processors
    ├── modals/            ← 3 copiados + os seus
    └── ui/                controls, render, avatar ← copiados
```

### Fases sugeridas

| Fase | Entrega |
| --- | --- |
| 1 | `types.ts` + `store` + comando "criar nota" + uma view lendo o índice |
| 2 | `sections.ts` + buffers + quick capture |
| 3 | Code blocks (hubs vivos nas notas) |
| 4 | Painel de contexto lateral (`file-open` → espelha a nota) |
| 5 | Settings completas + estrutura de pastas + primeira run |
| 6 | Integrações externas (calendário etc.), sempre somente leitura |

---

## 15. Resumo em uma frase

O Team Manager é um exemplo **acima da média** de plugin do Obsidian: a
arquitetura de dados (store com cache, escopo por pasta, markdown como verdade)
e a manipulação de markdown são de qualidade de produção e devem ser copiadas;
a organização de arquivos, a ausência total de testes e o CSS monolítico são
exatamente o que você deve fazer diferente desde a primeira linha do Cockpit.
