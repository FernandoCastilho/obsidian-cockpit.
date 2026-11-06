# Correção IOF e desconto — 06/11/2026

## Regime suportado
Simulações de crédito novo a partir de 17/07/2025. Datas anteriores são bloqueadas: transições de maio–julho/2025 não foram implementadas como motor histórico. Não foi encontrada na consolidação consultada alteração posterior das alíquotas de crédito.

- Decreto 6.306/2007 consolidado: https://www2.camara.leg.br/legin/fed/decret/2007/decreto-6306-14-dezembro-2007-566561-normaatualizada-pe.html
- Decreto 12.499/2025: https://www2.camara.leg.br/legin/fed/decret/2025/decreto-12499-11-junho-2025-797588-publicacaooriginal-175631-pe.html
- Receita sobre restabelecimento em julho: https://www.gov.br/fazenda/pt-br/canais_atendimento/imprensa/notas-a-imprensa/2025/julho/receita-federal-do-brasil-explica-como-ficam-os-pagamentos-do-iof-diante-do-novo-entendimento

## Implementação
- Desconto por grupos de títulos de mesmo vencimento, valor nominal total e quantidade. Taxa contratual comum, convenção comercial simples ou racional simples e mês de 30 dias explicitamente selecionada. Datas contratuais já ajustadas pelo usuário quando o contrato assim exigir; não inventa feriados/calendário bancário.
- Base IOF nominal menos juros antecipados (art.7 II e §4), sem deduzir tarifas/IOF. PJ diária 0,0082% + adicional 0,38%; Simples/MEI confirmado e operação total até R$30mil: 0,00274% +0,38%; acima aplica geral. Limite monetário comparado em centavos para evitar ruído flutuante.
- IOF diário máximo365 dias por título. Projeção escala valores mantendo vencimentos/quantidades, recalcula juros/IOF, reavalia limite tributário.
- Giro usa datas reais por parcela, IOF sobre amortizações. Convenção de juros mensais explicitada à parte.
- Conta Garantida permanece operação rotativa com juros/IOF pagos à parte, diária sobre saldos e adicional sobre acréscimos. Não aplica teto365 indevido.
- FINAME zero somente após confirmação de recursos elegíveis art.8 IX. Não generaliza alíquota zero para outras origens/BNDES; origens não enquadradas bloqueiam resultado.

## Auditoria
Revisor independente identificou arredondamento visual da alíquota diária e ruído flutuante no limite de R$30mil. Ambos corrigidos, com regressão monetária. Motor FINAME original preservado; interface bloqueia cenários não enquadrados.

## Limitações de QA local
Testes funcionais de componentes React cobrem edição, inclusão/remoção de títulos, invalidação/recuperação de resultados e confirmação/revogação FINAME. Smoke navegador local impedido por ambiente (socket Chromium e falha bwrap antes execução). Script scripts/smoke-discount-iof.cjs integrado ao smoke publicado de CI para testar 390/1280px e guardar capturas após deploy.
