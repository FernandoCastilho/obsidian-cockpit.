# Juros internacionais — contrato e evidências

Escopo: acrescentar políticas monetárias ao quadro existente de Juros. Preservar Selic, CDI, SOFR, curvas, filtros e fórmulas. Sem credencial nova, assinatura ou feed comercial.

## Fontes e natureza

| Linha | Fonte oficial | Data exibida |
| --- | --- | --- |
| Fed — faixa-alvo | https://www.federalreserve.gov/monetarypolicy/openmarket.htm | Data de vigência da tabela; ambos os limites, sem média |
| BCE — depósito | https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html | “With effect from”; coluna Deposit facility |
| Reino Unido — Bank Rate | https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp | Date Changed |
| Japão — meta overnight | https://www.boj.or.jp/en/mopo/mpmdeci/index.htm | Vigência explícita da diretriz aprovada, não data da reunião |

Todas as políticas são expressas em % a.a. SOFR e CDI continuam como taxas observadas; títulos/curvas continuam separados. O alvo japonês é aproximado (≈); o regime iniciado em março2024 era uma faixa0–0,1%, não um ponto médio. Não se apresenta o antigo regime japonês de depósitos negativos como se fosse essa meta overnight.

## Reutilização e atribuição

- Fed: informação em domínio público salvo indicação específica; fonte citada conforme https://www.federalreserve.gov/disclaimer.htm .
- BCE: estatísticas públicas podem ser reutilizadas gratuitamente, inclusive comercialmente, com fonte e metadados preservados: https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html .
- Bank Rate: dados da base do Bank of England sob UK Open Government Licence, conforme https://www.bankofengland.co.uk/legal . A fonte é citada em cada célula; não se utiliza dado de terceiros excluído da licença.
- BoJ: https://www.boj.or.jp/en/copyright.htm permite reprodução com crédito, mas exige contato prévio para finalidade comercial. O caráter comercial/não comercial do painel precisa ser esclarecido antes da publicação dessa série; não se presume autorização adicional, nem se envia solicitação ao fornecedor sem instrução do usuário.

Por padrão, o coletor não publica pontos nem cache japonês: `usagePending` mantém a linha com traços e link oficial. Ativação depende de finalidade não comercial confirmada (`POLICY_BOJ_USE=noncommercial`) ou permissão documentada do fornecedor (`permission-confirmed`); essa variável não concede permissão. Python/pypdf no deploy só é preparado com um desses estados. A coleta completa foi validada localmente, mas a versão de produção deve respeitar essa condição.

## Coleta e armazenamento

`fetch-policy-rates.mjs` gera `public/policy-rates.json` no deploy horário existente. Schema1: `generatedAt` da consulta; `series` por banco; cada série com `checkedAt`, `sourceUrl`, `points`, estado `stale/error` e, para BoJ, cache dos documentos oficiais por URL. Cada ponto tem data efetiva e valor ou limites inferior/superior. Documentos japoneses novos são lidos via Python+pypdf6.1.3; decisões antigas ficam em cache para evitar downloads repetidos.

Em falha de rede, mudança de estrutura ou regressão temporal da fonte, preservar a última série válida e seu `checkedAt`, marcando atualização pendente. Sem série anterior, mostrar traço e ausência explícita. Zero e taxas negativas oficiais são valores válidos. Uma taxa de política mantida por meses não fica desatualizada só por sua vigência ser antiga: a atualidade é da conferência na fonte, separada da vigência. A tela sinaliza conferência pendente após36h sem verificação.

Comparações escolhem a última vigência menor ou igual a cada corte (dia, mês,180dias, ano). Não criam observações diárias nem aplicam taxas futuras ao passado. BoJ cobre apenas o regime overnight iniciado em21/03/2024; datas anteriores ficam ausentes. Mudança japonesa sem vigência explícita falha de modo conservador.

## Matriz de aceitação

| Critério | Verificação |
| --- | --- |
| Limites Fed preservados | fixtures de tabela e comparação, sem midpoint |
| BCE depósito, não MRO | fixture com colunas de taxas diferentes e valor negativo |
| BoE data de mudança | fixture com século e registros1975+ |
| BoJ meta aprovada/vigência | fixtures com dissidência, manutenção, mudança sem nota, faixa e PDF oficial em coleta real |
| Ausência/falha nunca zero | testes de fallback e política sem observação |
| Interface existente preservada | QA390/820/1440, scroll interno da tabela, fonte/status, smoke geral |
| Deploy verificável | PR draft, CI do HEAD final, deploy do merge e QA no site |

Rollback: reverter somente o commit de funcionalidade se necessário, preservando produção anterior `ec271b2`. Nenhuma migração de banco ou credencial. Dependências de dados são públicas e passíveis de alteração de formato; falhas aparecem por banco no JSON e na tela.
