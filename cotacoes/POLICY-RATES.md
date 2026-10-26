# Juros internacionais — contrato e evidências

Escopo: acrescentar políticas monetárias ao quadro existente de Juros. Preservar Selic, CDI, SOFR, curvas, filtros e fórmulas. Sem credencial nova, assinatura ou feed comercial.

## Fontes e natureza

| Linha | Fonte oficial | Data exibida |
| --- | --- | --- |
| Fed — faixa-alvo | https://www.federalreserve.gov/monetarypolicy/openmarket.htm | Data de vigência da tabela; ambos os limites, sem média |
| BCE — depósito | https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html | “With effect from”; coluna Deposit facility |
| Reino Unido — Bank Rate | https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp | Date Changed |
| Japão - alvo overnight (BIS/BoJ) | https://data.bis.org/topics/CBPOL | Primeira observação do nível na série; cobertura e última observação explícitas |

Todas as políticas são expressas em % a.a. SOFR e CDI continuam como taxas observadas; títulos/curvas continuam separados. O alvo japonês é aproximado (≈); o regime iniciado em março2024 era uma faixa0–0,1%, não um ponto médio. Não se apresenta o antigo regime japonês de depósitos negativos como se fosse essa meta overnight.

## Reutilização e atribuição

- Fed: informação em domínio público salvo indicação específica; fonte citada conforme https://www.federalreserve.gov/disclaimer.htm .
- BCE: estatísticas públicas podem ser reutilizadas gratuitamente, inclusive comercialmente, com fonte e metadados preservados: https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html .
- Bank Rate: dados da base do Bank of England sob UK Open Government Licence, conforme https://www.bankofengland.co.uk/legal . A fonte é citada em cada célula; não se utiliza dado de terceiros excluído da licença.
- Japão: a fonte de produção passa a ser a estatística CBPOL do BIS, com fonte nacional Bank of Japan. Os termos específicos https://data.bis.org/help/legal permitem reprodução com crédito ao BIS e à fonte nacional, sem sugerir endosso, sem cobrança adicional pela inclusão e com aviso de tradução não oficial. Não houve cadastro, assinatura, contato externo ou aceite explícito de acordo novo. O download público é https://data.bis.org/static/bulk/WS_CBPOL_csv_col.zip e a metodologia é https://www.bis.org/statistics/cbpol/cbpol_doc.pdf . O acesso direto ao BoJ continua fora do caminho de produção.

O CSV contém D:JP e M:JP; seleciona-se D:JP antes das datas. A cobertura começa em01/08/2024 para não converter a faixa anterior0–0,1% em escalar. Datas indicam a primeira observação do nível na série, não uma decisão presumida. O pacote conferido tem observações até20/10/2026 e último valor1,25% a.a.; a publicação semanal e a defasagem ficam explícitas na interface.

## Coleta e armazenamento

`fetch-policy-rates.mjs` gera `public/policy-rates.json` no deploy existente. Schema1: consulta em `generatedAt`; cada banco com `checkedAt`, `sourceUrl`, `points`, `stale/error`. Japão usa `bis-policy.mjs`, sem dependência nova: ZIP limitado em memória, CSV com campos entre aspas, frequência, instrumento, fonte e valores validados. Não extrai caminhos para o disco. Somente cache identificado como BIS pode ser preservado para Japão. O coletor antigo `boj-policy.mjs` não é executado em produção.

Em falha de rede, mudança de estrutura ou regressão temporal da fonte, preservar a última série válida e seu `checkedAt`, marcando atualização pendente. Sem série anterior, mostrar traço e ausência explícita. Zero e taxas negativas oficiais são valores válidos. Uma taxa de política mantida por meses não fica desatualizada só por sua vigência ser antiga: a atualidade é da conferência na fonte, separada da vigência. A tela sinaliza conferência pendente após36h sem verificação.

Comparações escolhem a última vigência menor ou igual a cada corte (dia, mês,180dias, ano). Não criam observações diárias nem aplicam taxas futuras ao passado. Japão cobre o regime escalar aproximado desde01/08/2024; datas anteriores ficam ausentes. Instrumento atual diferente no metadado BIS interrompe a atualização de modo conservador.

## Matriz de aceitação

| Critério | Verificação |
| --- | --- |
| Limites Fed preservados | fixtures de tabela e comparação, sem midpoint |
| BCE depósito, não MRO | fixture com colunas de taxas diferentes e valor negativo |
| BoE data de mudança | fixture com século e registros1975+ |
| Japão - alvo overnight (BIS/BoJ) | https://data.bis.org/topics/CBPOL | Primeira observação do nível na série; cobertura e última observação explícitas |
| Ausência/falha nunca zero | testes de fallback e política sem observação |
| Interface existente preservada | QA390/820/1440, scroll interno da tabela, fonte/status, smoke geral |
| Deploy verificável | PR draft, CI do HEAD final, deploy do merge e QA no site |

Rollback: reverter somente o commit de funcionalidade se necessário, preservando produção anterior `26b6868`. Nenhuma migração de banco ou credencial. Dependências de dados são públicas e passíveis de alteração de formato; falhas aparecem por banco no JSON e na tela.
