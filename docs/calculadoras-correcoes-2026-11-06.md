# Correções das calculadoras — 06/11/2026

## Escopo e estado

Correções locais dos achados F1–F6 da auditoria da produção `4f7a07042e444ee6b24af245ca368dddf70f74e0`. A base local `cd82285b2c086cba1471be52bf84c024477df9a8` é um snapshot verificado por hashes: 725 arquivos idênticos àquela produção, incluindo setores e áudio. Não se trata do mesmo commit de Git nem de uma nova publicação. Na reconciliação posterior, a produção avançou para `0a9b23755fb41f5fc4e1c778cffefe16607d6996`, com comparação CG × giro e NCG. Na reconciliação inicial, seus dez arquivos foram preservados integralmente; o snapshot local correspondente tem os 732 blobs da nova produção.

Além das seis rotas anteriores, o lote integra a projeção **TLP exigível** e a **conferência histórica TFB** já desenvolvidas. São oito rotas de calculadoras/conferências, com escopos distintos. A TFB não é calculadora contratual genérica; só ela apresenta o CET matemático do exemplo completo. As outras sete telas não calculam CET.

Foram incorporados, em commits separados, a margem FINIMP de ±0,02 solicitada e o laser padrão dos diagramas, sem botão de pausar. O comparativo de alongamento/NCG entregue por outro trabalho em `0a9b237` foi preservado, sem reimplementação. A revisão posterior corrigiu somente a estabilidade numérica de `alongamento.js`: saldos por fórmula fechada, juros somados sem cancelamento e recusa técnica explícita de saldos/totais da comparação superiores a R$ 35.184.372.088.832 (2⁴⁵), sem alterar taxa, prazo, carência, modalidades ou NCG. Na etapa `9668ed0`, nove dos dez arquivos remotos permaneciam byte-idênticos; após a ampliação da cobertura em `1aac082`, são oito dos dez, com alterações somente no motor `alongamento.js` e no roteiro `smoke-calculator-layout.cjs`; regressões adicionais ficam em arquivo separado. Esse teto de saída é técnico, não limite de contratação; a entrada continua limitada a R$ 1 trilhão. Esta correção não cria condições contratuais presumidas nem publica o candidato.

## Mapa dos achados

- **F1 — perfil TLP/TLPCAP:** a escolha TLP no Finame encaminha à projeção exigível própria, com J, fonte, IPCA e cronograma confirmados. O modelo capitalizado legado só aceita `perfilTlp: 'tlpcap'` explicitamente e retorna esse perfil. Testes separados comprovam os fluxos distintos. A projeção exigível não reproduz IPCA mensal histórico defasado, aniversários contratuais ou truncagem de todos os intermediários.
- **F2 — carência:** vencimentos mensais construídos retroativamente do fim. Cinco meses/trimestral → 2 e 5; sete/trimestral → 1, 4 e 7; sete/semestral → 1 e 7. Testes cobrem carência zero, múltiplos, não múltiplos e carência final inválida.
- **F3 — calendário/DU:** removida a garantia de compensação anual. Calendário, liberação e datas da tabela Finame estão identificados como hipotéticos/ilustrativos, sem certificação bancária.
- **F4 — bordas:** finitude, enums, limite técnico de R$ 1 trilhão e invariantes Finame; Price estável e saldo final zero. Giro acumula juros sem cancelamento, recusa resultados sem precisão monetária, unidades inválidas e cronogramas posteriores a 9999. Juros arredondados a zero não conservam sinal negativo na projeção TLP. O teto comercial de R$ 150 milhões permanece aviso distinto do limite técnico.
- **F5 — documentação:** CG descreve UI mensal proporcional/30 e bloqueio tributário anterior a 17/07/2025; Desconto descreve juros/IOF automáticos e recálculo da projeção; FINIMP descreve cinco moedas, TAC em reais convertida e doze prazos fixos. Exemplos atuais são executados por `calculator-doc-examples.test.mjs`; descrições superadas são identificadas como históricas.
- **F6 — popup FINIMP:** conversor usa diálogo modal nativo, foco inicial no rádio selecionado, rádios nativos, contenção de Tab, Escape/Fechar/clique externo com retorno ao acionador. A ajuda simples `Help.jsx` foi preservada. Testes de handlers passaram; verificação real de navegador/leitor de tela permanece pendente.

## Regressões e evidências

Na validação inicial das correções e do laser, a suíte continha **1.178 testes**, todos aprovados, sem falhas ou testes ignorados. As integrações posteriores de tema e da entrega paralela são revalidadas no commit candidato e registradas no handoff correspondente. Lint: zero erros e cinco avisos anteriores fora das calculadoras. Build passou; permanece aviso anterior de tamanho de bundle.

Conferências independentes adicionais, cujas contagens não devem ser somadas à suíte como testes únicos:

- Giro: 277 cenários Decimal com total abaixo de R$ 1 trilhão conciliados a até meio centavo; 14 cenários extremos agora recusados. Os casos incluíram Price/SAC/Bullet, taxa zero/ínfima, 600 meses e principal fracionário.
- Finame: oráculo Decimal de 80 casas em 386 cenários; maior diferença monetária R$ 0,00004339. Também passaram as três reproduções originalmente vermelhas e as identidades de principal/saldo/pagamentos.
- LCDCAP: 180 oráculos BigInt; Finame nominal: 72 casos independentes; TFB: 34 linhas, IOF, tarifa única e solver Newton independente para CET de 20,1568899289% a.a.
- CG e Desconto: 13 grupos da auditoria reexecutados, incluindo 40 fluxos CG em centavos, meses/feriados, não capitalização e calendário real. As verificações antigas que reproduziam defeitos corrigidos foram substituídas por regressões próprias, não mantidas como aceitação do defeito.
- Conversor FINIMP: 64 conversões Decimal com margem ±0,02; q=1,1172 resulta em 1,1372 e 1,0972, sem alterar a cotação de mercado.

Testes principais novos: `finame-audit-corrections`, `emprestimo-boundaries`, `calculator-doc-examples`, `bndes-tlp-exigivel`, `bndes-tlp-ui`, `bndes-profiles-integration`, `help-dialog` e `laser-placement`, todos em `cotacoes/test/`.

## QA ainda necessário

Os smokes estão integrados ao CI, mas **não foram executados com sucesso neste executor**. O lançamento local do navegador foi bloqueado pela infraestrutura; a tentativa oficial ampliada falhou antes de iniciar. Testes React em memória e build não equivalem a inspeção visual.

Antes da publicação, executar o CI do candidato exato e revisar capturas:

- `smoke-calculator-layout`: seis telas originais em 390/768/1440, incluindo o smoke de alongamento/NCG da entrega paralela dentro de Conta Garantida.
- `smoke-calculadora`: Giro/Finame, IOF, perfis, validação e fluxo.
- `smoke-bndes-profiles`: TLP/TFB em 390/768/1440; fontes/confirmacões, negativos, calendário, acesso via Finame e busca.
- `smoke-finimp-help`: comparação e conversor em 390/820/1280, teclado, foco, rádios, fechamento/reabertura e margem.
- `smoke-tic-animation` e `smoke-researched-sectors`: laser padrão, ausência de botão pausar, rastro/retângulo/seta, toque, Escape, histórico e foco.

A revisão final deve ser realizada por não autor sobre commit congelado. Este documento não declara homologação contratual, parecer fiscal, certificação WCAG, CI remoto ou deploy.

## Limites preservados

Encargos da CG nunca integram seu principal. O comparativo separado de alongamento/NCG não efetiva renegociação; a carência do novo giro, se informada, capitaliza juros desse giro, sem alterar a CG residual. As premissas estão em `conta-garantida-alongamento.md`. IOF genérico Finame continua helper aproximado fora da UI, que exige confirmação de recursos elegíveis ao zero. Datas Giro alteram IOF, não criam carência de juros. Trocar o funding Finame preserva campos e revoga elegibilidade; sair da rota e voltar restaura padrões atuais. Valores e condições não são transferidos automaticamente entre produtos.
