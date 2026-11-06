> Registro histórico do congelamento 7fcd1c2. Os reparos posteriores e a nova verificação constam em REPAROS-LD1-2026-11-05.md.

# Painel integrado, candidato de 05/11/2026

## Escopo consolidado

A base de produção é eeecfc9d8d9560e010a3584e812ba74a95c6d9f5. A integração retomou o candidato parcial fa9db145f0a8f6d0b5207f124d55dc4e1fd0bae7 e incorporou o pacote Selic/LCD validado por SHA256 209a6fe3aa99de7232ee8be3bf624576beab5ee45651218e7962fd9a0b647868 (ZIP), patch f2398958b019ad77c3f7061d25aa676ab33f2420664c3c170f7acf55594ff286.

Estão reunidos: 18 correções UX, FINIMP compacto, setores e reciclagem, notícias de cinco dias com cobertura parcial explícita, Maquila, Análise de Desconto com adicional de IOF sem padrão, motor BNDES TFB 0.2.1 isolado e projeção BNDES Selic capitalizada + LCD. A investigação nova de alertas cambiais não integra este congelamento.

## Integração Selic/LCD

- Os 22 arquivos do manifesto foram conferidos contra seus hashes, e os hashes das bases também foram verificados.
- Vinte arquivos funcionais/de teste coincidem byte a byte com o pacote. Houve união controlada apenas em Calculadora.jsx e build-search-index.mjs, mantendo Análise de Desconto, Maquila e demais rotas. O índice estático foi regenerado, com 38 áreas.
- A auditoria independente prévia de LCDCAP foi mantida; seu teste foi relocado, alterando somente o import relativo.
- O snapshot público de LD1 preserva nove pontos oficiais e a consulta de 05/11/2026 às 14:52 UTC. Última vigência em 01/10/2026: −0,110000% a.a. O sinal negativo e a cobertura datada são explícitos.
- A coleta automática LD1 permanece desativada. O coletor não foi executado. A função que incorpora o snapshot está na tela e no código do coletor, antes da exportação futura; arquivos públicos moedas.json e CSV coletados não estavam presentes nesta cópia e não foram fabricados nem atualizados.
- Modo histórico contratual permanece bloqueado. A calculadora exige cenário Selic, LD1 contratada, spreads, cronograma, datas, fontes e confirmações explícitas. Não calcula CET, IOF, tarifas ou seguros.

## Verificações finais

- 925 testes aprovados em 121 arquivos elegíveis; zero falhas, cancelamentos ou skips internos.
- commodities.test.mjs foi excluído integralmente por conter a fixture Python previamente restrita. Não foi usado npm test.
- Build Vite 8.3.5 aprovado com Node 24.22.1, sem instalação ou rede.
- ESLint global aprovado: zero erros e cinco avisos preexistentes em Calendario.jsx, Curves.jsx e SeriesHistory.jsx. O pacote corrige dois dos sete avisos anteriores. A primeira execução paralela terminou com código 137 (Killed); a repetição isolada com limite de heap de 768 MB passou. Ambos os logs foram preservados.
- git diff --check aprovado. Nenhum Git status executado.
- Help, motor e UI Finame, motor e UI FINIMP, motor TFB e snapshot setorial preservados byte a byte contra os hashes previamente verificados.

Os logs, a lista explícita de testes, hashes dos componentes e evidências de integração estão no pacote de auditoria associado ao SHA congelado. As verificações foram feitas no candidato final de código. Alterações posteriores a esse SHA exigem nova verificação.

## Limites e bloqueios de publicação

Nenhum push, merge em produção, deploy, CI remota, preview, servidor, socket, navegador, fixture Python ou coleta externa foi iniciado. Produção não foi alterada. Não há QA visual ou interativo deste estado.

O CET de TFB continua divergente e não certificado; não foi presumido um padrão tributário para a Análise de Desconto. Notícias continuam com cobertura parcial, fontes suspensas preservadas e coleta externa desativada. A projeção Selic/LCD não certifica apuração contratual ou calendário bancário.

Os workflows existentes ainda incluem npm test e fluxos de preview. Não podem ser acionados como parte desta integração porque poderiam executar operações restritas. A auditoria independente do SHA final e revisão dos bloqueios operacionais são necessárias antes de qualquer proposta de publicação. A aprovação dos testes elegíveis e do build não substitui essas etapas.
