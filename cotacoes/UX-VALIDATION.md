# Ajustes de UX — outubro de 2026

Base de preparação: produção `439794a` (PRs recentes preservadas). Sem alteração de fórmulas, coletores, infraestrutura, credenciais ou dados japoneses.

## Comportamentos

- Capital de giro aceita valor brasileiro explícito (`1.000,00`) ou inteiro (`1000`). Rejeita `1,000.00`, agrupamento malformado e centavos com mais de duas casas. Despesas inválidas não viram zero. Valor, despesas, prazo e taxa inválidos têm feedback associado ao campo; resultado inválido desaparece. O parser compartilhado também rejeita separadores mistos malformados, preservando os formatos já cobertos pelos testes.
- Intraday distingue arquivo carregado sem amostras na data (`empty`) de falha de rede, série ausente ou inválida (`error`). A data anterior vem das amostras retidas, nunca do dia da semana. A seleção anterior é explícita, inclusive no modal; não substitui cotação atual nem preenche lacunas.
- Consulta global identifica câmbio, data completa e Brasília; não aparece como atualização de juros/cenários. Referências individuais mantêm seus timestamps reais. Histórico intraday identifica a data do arquivo. Compartilhamento nomeia câmbio/resumo; ausência de timestamp não recebe a hora atual como substituta.
- Ajuda, câmera e atualização têm caixas reais de 44 × 44 px, sem sobreposição por pseudoelemento invisível. Marca visual de ajuda continua pequena. Foco visível e teclado preservados.
- Resultado de giro descreve suas entradas; atalho móvel de resultado transfere foco à região de saída e respeita movimento reduzido.

## Checklist canônico aplicado

| Princípios | Aplicação localizada |
|---|---|
| Hick, carga cognitiva, Occam, Tesler | Recuperação explícita por uma ação; sem novo fluxo ou redesign. Complexidade do formato validada pelo app. |
| Fitts, Fitts/distância | Alvos medidos de 44 px; erros junto aos campos e acesso direto ao resultado. |
| Jakob, semelhança, conectividade uniforme, proximidade | Mantidos navegação, campos e agrupamentos existentes; mensagens ligadas por `aria-describedby`. |
| Miller, posição serial | Unidades e entradas ficam disponíveis; sem impor regra universal de 7±2 ou limite artificial de opções. |
| Doherty | Estados de carga, vazio e erro explícitos; nenhuma alegação de ganho de latência sem medição. |
| Von Restorff, Murphy, Postel | Erro destacado sem depender só da cor; formatos ambíguos rejeitados, sem adivinhar valores. |
| Pico-fim, Zeigarnik, gradiente de meta | Resultado identifica a simulação atual; erro informa como concluir, sem progresso artificial. |
| Parkinson | Alterações limitadas aos cinco grupos aprovados, preservando a identidade e os cálculos. |

## Verificação

- 188 testes Node aprovados e build Vite aprovado; não há scripts de lint ou tipos configurados neste pacote JavaScript.
- Smoke existente: sete abas lazy, gráfico e curva por teclado, modal/Escape, Voltar/Avançar e link direto do calendário (#cenarios/calendario).
- Edge real instalado no FTC-NOTE, headless com perfil isolado, viewports 390/820/1440 × 1000. Fixtures sintéticas controlam vazio, falha e amostras anteriores; não certificam preços reais ou fórmulas financeiras.
- Regressão reproduzível em `scripts/smoke-ux.cjs`, com Playwright disponível e Edge instalado. Aceita `SMOKE_BASE_URL` e `UX_QA_OUTPUT`. Os três tamanhos passaram, sem erros de página ou overflow; ajuda/câmera/atualização medidos em 44 × 44 px.
- Evidências locais em `../oil-evidence/ux-fixes/` a partir da raiz do checkout: capturas por largura e `results.json`.
- Detector visual: apenas avisos em bordas preexistentes; não foram alteradas para evitar expansão do escopo.

Entrega em PR draft; sem merge/deploy nesta etapa.
