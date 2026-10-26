# DI, sessão de coleta e referências públicas — 26/10/2026

Base: `26b6868d49f109f2d2c1778c29a6e01aa8286472`, produção com UX PR142. Checklist cancelado e PR141 fora do escopo. Esta entrega prepara uma PR draft; não autoriza nem executa merge/deploy.

## DI — diagnóstico e correção

O log do deploy [40296587119](https://github.com/FernandoCastilho/obsidian-cockpit./actions/runs/40296587119), às09h06UTC/06h06BRT, registra `B3 PRE datas: resposta vazia (HTTP 200)`. DOL respondeu na mesma execução. Não há evidência de mudança de endpoint ou de erro da taxa em si. Na reprodução local, o catálogo voltou a responder e a última referência oficial continuava23/10/2026; GetList devolveu280 vértices PRE. A referência diária não é uma cotação intraday e não precisa mudar antes de nova publicação B3.

`b3-collector.mjs` valida resposta e paginação, repete falhas transitórias e usa datas oficiais já conhecidas quando o catálogo falha. Essa recuperação mantém `discoveryPending` e aviso: não confirma que a data conhecida seja a mais recente. Falha em página da última curva impede publicação truncada; o snapshot anterior é preservado. Comparações antigas faltantes são preservadas/omitidas com aviso. Instrumento, vértices, quantidade total e duplicação são validados. Números decimais numéricos ou com ponto não perdem a casa decimal; vazio não vira zero.

Coleta real local: PRE23/10 com280 vértices; DOL23/10 com268 vértices após o filtro de21dias; catálogo confirmado para ambos. Nenhuma taxa foi estimada para substituir DI.

Fonte: [B3, Taxas referenciais](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/consultas/mercado-de-derivativos/precos-referenciais/taxas-referenciais-bm-fbovespa/).

## Coletor — validação inicial NÃO aprovada

Observações de leitura, sem dispatch, mudança de cron ou executor concorrente:

| Hora BRT | Resultado publicado |
|---|---|
| 09h24min59s | `generatedAt`05h47min15,680s; USD/CNH ainda sem observações de26/10 |
| 09h30min19s | Mesmo arquivo; nenhuma nova rodada na abertura |
| 09h35min39s | Mesmo `generatedAt`; sem nova rodada |
| 09h39min59s | Zero pontos pós09h30 em USD/EUR/JPY/CNH |
| 09h45min30s | Mesmo arquivo e zero pontos pós-abertura nos quatro pares |

GitHub confirmou workflow `active` na branch padrão `claude/obsidian-plugin-analysis-bagjz3`. A partida prevista para09h20 não apareceu entre as execuções consultadas; última execução observada [40294690904](https://github.com/FernandoCastilho/obsidian-cockpit./actions/runs/40294690904) às05h47, uma rodada. Não se observou fila ou job ativo da sessão. A API não informa a causa interna da ausência do evento.

O [GitHub documenta atrasos e eventual descarte de agendamentos](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Isso é uma limitação conhecida e hipótese compatível, não prova da causa interna deste evento. As mudanças137/140 do laço só atuam depois da partida. Sucesso de um job anterior não comprova cadência. A janela observada é inicial, não cobre o pregão inteiro. Regularidade permanece pendente/reprovada neste intervalo; início manual autorizado poderia testar o laço, mas não provaria disparo automático. Não foi criado serviço, cron alternativo ou nova credencial.

## Japão — BIS/Bank of Japan

Download oficial anônimo: `https://data.bis.org/static/bulk/WS_CBPOL_csv_col.zip`. `bis-policy.mjs` seleciona somente D:JP, separando a frequência mensal. Metadados atuais precisam identificar Bank of Japan e alvo overnight não colateralizado. Publicação CBPOL semanal; pacote consultado com observações até20/10/2026, último nível1,25%a.a. Série escalar exibida desde01/08/2024; a faixa anterior não foi convertida em ponto médio. Datas na tabela identificam a primeira observação do nível, não uma data de decisão presumida. Semanas/dias sem observação não são preenchidos.

Os [termos de reprodução de estatísticas BIS](https://data.bis.org/help/legal) permitem uso com crédito, sem sugerir endosso, sem cobrança adicional pela inclusão em produto comercial, e com aviso de tradução não oficial quando traduzido. Fonte nacional e BIS constam na interface, com [metodologia](https://www.bis.org/statistics/cbpol/cbpol_doc.pdf), última observação e conferência. Não há API nova, cadastro, assinatura ou aceite explícito de acordo; a reprodução direta de comunicados BoJ permanece fora do caminho de produção.

## Fretes — alternativa distinta, sem cotação de rotas

Preparado índice BLS PPI `PCU483111483111`, transporte marítimo de carga de produtores dos EUA, não dessazonalizado, jun/1988=100. Histórico real01/2024–09/2026:33 meses; setembro534,796 preliminar. Média anual M13 não entra como mês. A API não fornece data de divulgação por observação, portanto ela permanece não informada. Coleta central limitada a uma consulta por24h; revisão substitui apenas meses efetivamente retornados. Falhas preservam valores e a data de consulta anterior.

A interface declara EUA, índice mensal, preliminaridade, unidade, cobertura, fonte e que não é rota nem US$/contêiner. Não há equivalência com China–Brasil ou Europa–Brasil; essas tarifas específicas continuam sem série/licença gratuita comprovada. O índice ajuda a acompanhar preços no universo americano, não estima orçamento de importação brasileira.

Fontes: [série BLS](https://data.bls.gov/timeseries/PCU483111483111), [API pública](https://www.bls.gov/developers/api_signature.htm), [domínio público](https://www.bls.gov/bls/linksite.htm), [condições de uso](https://www.bls.gov/developers/termsOfService.htm), [base06/1988 e universo](https://www.bts.gov/archive/publications/national_transportation_statistics/table_03_13). Crédito, data de extração e ressalva BLS após extração aparecem na interface/detalhe. Sem logotipo, contrato, credencial ou compra. SCFI/SSE não foi reproduzido.

## Matriz de aceitação e evidências

| Critério | Verificação | Estado |
|---|---|---|
| DI completo, fonte adequada, falha sem zero | testes HTTP200 vazio, páginas, tipos numéricos, fonte e recuperação; coleta real | Preparado/testado local |
| Cadência09h30–18h | arquivos centrais e runs observados09h30–09h45 | Não aprovada na janela inicial; restante não observado |
| Japão com direitos e natureza verificáveis | CSV/ZIP, frequência, fonte, cobertura, último nível, UI | Preparado/testado local |
| Alternativa pública de transporte |33meses reais, preliminaridade e limites explícitos | Preparada/testada; rotas específicas não resolvidas |
| UX142 e navegação preservadas |197testes, build, smoke geral; QA390/820/1440 | Aprovados; revisão visual final registrada na entrega |

Não há scripts de lint ou tipos neste pacote JavaScript. Evidências locais: `source-evidence/` na raiz da tarefa, com logs, snapshots e `qa/results.json`. A revisão visual aplica a direção existente e os20critérios canônicos; não houve redesign. Rollback, se posteriormente autorizado e necessário, reverte somente os commits desta funcionalidade, preservando a base26b6868. Nenhuma migração de banco ou mudança de infraestrutura externa.
