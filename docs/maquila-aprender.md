# Lei de Maquila no Paraguai em Aprender

## Conteúdo

Novo conceito em **Aprender → Comércio exterior → Lei de Maquila no Paraguai**, na rota `#aprender/lei-de-maquila`.

Mantém a estrutura da seção: explicação simples, analogia, pontos de atenção, versão precisa, exemplo numérico, teste de compreensão, conexões e fontes. O aviso educacional e a data de verificação ficam na ajuda `?`, sem criar banner ou mudar a identidade visual.

O conceito também participa da busca local, da busca global e da rotação existente de conceito do dia. Comandos: `MAQUILA`, `LEI DE MAQUILA`, `MAQUILA PARAGUAI` e `LEI DE MAQUILA NO PARAGUAI`.

O componente de ajuda compartilhado foi corrigido para que Escape feche o balão aberto por foco, mouse, clique ou foco dentro do conteúdo. O fechamento limpa as três causas de abertura e o timer de saída; os demais gestos foram preservados.

## Referências e limites

Conteúdo verificado em 05/11/2026:

- Lei paraguaia 7.547/2025 e Decreto 5.714/2026 como marco atual. Após os 12 meses de transição, já transcorridos na data da consulta, os programas anteriores são incorporados de pleno direito ao novo regime, sem ato adicional, preservando os direitos e a vigência indefinida previstos no art. 42. A Lei 1.064/1997 aparece como marco anterior, não como regime geral ainda aplicável aos programas antigos.
- Tributo único de 1% sobre o maior entre valor agregado no Paraguai e fatura de exportação aplicável. O exemplo compara bases hipotéticas já apuradas, sem calcular a composição fiscal da fatura.
- Contrato com empresa domiciliada no exterior e programa aprovado; registro e documentos; carta de intenção com prazo legal de 180 dias. O texto identifica a divergência com resumo antigo do MIC.
- Admissão temporária e prorrogação condicionada, limite de venda interna da maquiladora pura e manutenção das obrigações de conformidade.
- Maquila não assegura origem Mercosul, importação livre de tributos no Brasil nem economia total da operação. Produto, NCM, origem e tratamento no destino exigem validação própria.

As fontes oficiais estão ligadas diretamente no conceito. A exposição é educacional, não aconselhamento jurídico, tributário ou aduaneiro.

## Verificação reproduzível sem servidor

Na pasta `cotacoes`:

- `node --test test/help-keyboard.test.mjs test/maquila.test.mjs test/educacao.test.mjs test/global-search.test.mjs test/conceito-diario.test.mjs test/terminal.test.mjs`
- `npm run lint`
- `npm run build`

Os testes conferem os dois ramos da base maior, igualdade, zero e dados inválidos; coerência do exemplo; conceitos e conexões; busca, comandos e rotação diária; URLs oficiais e ajuda contextual. São testes de código e conteúdo, não certificação de apuração fiscal ou validação visual em navegador.

O teste de teclado compila o componente Help e simula hooks e eventos em memória. Cobre foco, hover, ajuda fixada, foco dentro, Escape repetido, reabertura e limpeza de listeners/timers. Não usa DOM real nem mede layout, foco real, leitor de tela ou tecnologia assistiva.
