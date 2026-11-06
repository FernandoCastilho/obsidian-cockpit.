# Estudos setoriais

O catálogo contém 67 recortes. O estudo original de integração de TIC permanece preservado; estes arquivos desenvolvem os outros 66 recortes.

## Pesquisa e rastreabilidade

Cada arquivo com o nome de um grupo contém os estudos daquele grupo. As séries mantêm unidade, período e cobertura. Indicadores amplos são identificados como contexto, sem serem apresentados como faturamento ou desempenho de uma especialidade. Cenários são condicionais, não previsões. Quando uma série específica não foi encontrada, a limitação é declarada.

Os arquivos de evidências e os pareceres registram verificações e divergências. Fontes públicas de empresas podem informar a análise; a interface mostra referências somente a entidades públicas explicitamente elegíveis. Isso não transforma estimativas privadas em estatísticas oficiais: a natureza dos números continua indicada.

## Publicação

1. Concluir a redação e a verificação independente de cada recorte.
2. Registrar a aprovação documental individual em `reviewStatus`, somente quando sustentada pelo parecer.
3. Executar `node scripts/sync-sector-studies.mjs` em `cotacoes` para integração de trabalho. Estudos pendentes exibem um aviso de versão não conferida.
4. Gerar os áudios aprovados com `node scripts/generate-sector-audio.mjs --generate`. A execução sem essa opção apenas mostra o plano.
5. Conferir duração e decodificação completa dos arquivos. O manifesto relaciona o áudio ao hash exato da transcrição; uma alteração no texto invalida o vínculo anterior.
6. Executar testes, lint, build e revisão visual no CI. Aprovação documental não substitui esses testes.
7. Para um lote parcial de produção, executar `node scripts/sync-sector-studies.mjs --approved-only`. Os demais recortes mantêm a indicação de pesquisa pendente, sem conteúdo apresentado como final.

As cópias locais de PDFs e capturas integrais das páginas consultadas não são redistribuídas. Referências a esses arquivos nos pareceres identificam material de verificação local, não arquivos públicos. URLs, períodos, evidências numéricas e pareceres permitem repetir a verificação.
