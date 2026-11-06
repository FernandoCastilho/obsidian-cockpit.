> Nota de integração (05/11/2026): este documento preserva o relatório do candidato isolado. No Painel integrado, os caminhos de código partem da raiz do repositório. O teste de auditoria foi relocado para cotacoes/test/bndes-lcd-cap-independent.test.mjs, mudando apenas o import relativo. Os comandos e caminhos de logs originais abaixo são históricos; a verificação consolidada está em docs/INTEGRACAO-2026-11-05.md. Não foi executada coleta externa nem publicado o candidato.

# Auditoria independente da projeção LCDCAP

Revisão de 05/11/2026. Escopo: motor `bndesLcdCap.js`, interface `BndesLcdCap.jsx`, validação de entradas e testes locais. Não houve rede, servidor, socket, preview, fixture Python ou publicação.

## Parecer

Aprovado para continuar a revisão como **projeção não certificada**, com os limites declarados. Não é apuração contratual, certificação de CET, validação de elegibilidade ou integração publicada.

O motor separa a Selic incorporada ao saldo da remuneração exigível, soma LD1 e remunerações antes da conversão por 252 dias úteis e amortiza o saldo atualizado pelo número de amortizações restantes. Não usa o número 143 como taxa, nem a razão dos índices 143 como apuração contratual. O teste anual independente usa aritmética racional BigInt, sem repetir a fórmula em ponto flutuante da implementação.

## Achados corrigidos e retestados

1. **Erro de um centavo em valores altos.** Principal 884509417120 centavos, taxa 0.110566441190% e 252 DU retornavam arredondamento incorreto tanto na correção Selic quanto nos juros fixos. A implementação agora usa cálculo racional exato para 252 DU. Nos expoentes fracionários, bloqueia resultados próximos do meio centavo com tolerância relativa à escala e usa `log1p`/`expm1` para o encargo.
2. **Datas inválidas no seletor LD1.** Uma observação com `2026-10-00` podia ser escolhida. Agora cada data é validada como data civil ISO real antes da seleção.
3. **Cronograma incompatível com dias úteis.** Vencimentos em sábado/domingo e contagens de DU superiores aos dias de segunda a sexta eram aceitos. Agora são recusados, assim como liberação no fim de semana. Essa barreira não substitui calendário completo de feriados.

## Verificação final

- **17/17 testes independentes aprovados.**
- **83/83 testes combinados aprovados:** motor LCDCAP, auditoria independente e regressão Finame.
- Testes abrangem razão de composição, saldo atualizado, conservação dos fluxos, independência da taxa LD1 fixada, dado ausente versus zero, datas inválidas, limites do calendário, entradas inválidas sem resultado parcial, retenção da proveniência e ausência de mutação das entradas.
- `src/finameMateriais.js`, `src/FinameMateriais.jsx` e `test/finame-materiais.test.mjs` comparados byte a byte com o snapshot original: inalterados.
- Logs: `audit/final-results.log`. Arquivo de testes: `audit/independent-lcdcap.test.mjs`.

## Limites preservados

- Calendário e datas contratuais completos continuam sob responsabilidade das entradas confirmadas. Não há certificação de feriados municipais, estaduais ou bancários, nem geração automática da carência.
- Arredondamentos de projeção são explícitos, mas a precisão contratual LCDCAP não foi inferida a partir da TLP.
- Selic futura é cenário constante fornecido e reconhecido pelo usuário. Não há taxa futura oficial.
- Série diária oficial com D-2 não está integrada nesta modalidade de projeção.
- O pesquisador validou posteriormente o endpoint oficial LD1 e a observação de −0,110000% a.a., vigente desde 01/10/2026. O seletor continua exigindo fonte marcada como validada. Esta auditoria cobre a seleção/cálculo, não certifica o coletor ou a atualização ao vivo.
- Não inclui IOF, tarifas, seguros, outras despesas ou CET.
- Não foram executados testes visuais/interativos de navegador. A estrutura de acessibilidade e os estados vazios foram inspecionados em código, não validados visualmente.
- Gráficos e catálogos estão em outro escopo de revisão; este parecer não os aprova automaticamente.


## Reauditoria após evidência oficial LD1

A informação anterior de sobretaxa apenas não negativa e necessariamente dentro do trimestre foi superada pela fonte oficial. O código passou a aceitar LD1 negativa e selecionar a última vigência não posterior à contratação, sem impor fronteira trimestral artificial.

Foram acrescentados cinco testes independentes:

- LD1 de −0,110000% reduz a soma anual de 4,50% para 4,39%, sem alterar o fator Selic nem a amortização do saldo atualizado. No caso sintético de saldo corrigido R$1.100.000 e 252 DU, os juros exigíveis são exatamente R$48.290.
- LD1 de −0,110000000001% e spread oposto cancelam exatamente, preservando 12 casas decimais.
- Uma soma total líquida negativa é bloqueada explicitamente como cenário não suportado, sem substituir o resultado por zero.
- A referência confirmada pode ser anterior ao trimestre da contratação; nunca posterior à contratação.
- A seleção preserva sinal negativo e vigência, sem selecionar observação futura.

Os **17 testes independentes e 83 combinados** passaram novamente. O parecer continua limitado a projeção não certificada, sem aprovação visual ou do coletor em produção.
