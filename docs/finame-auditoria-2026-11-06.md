# Finame: correções da auditoria de 6 de novembro de 2026

## Escopo dos perfis

A interface Finame calcula somente a projeção mensal TFC/TFB. Selecionar **TLP exigível** abre a opção de navegação para `#calculadora/bndes-tlp-exigivel`, que tem motor, hipóteses e cronograma próprios. Não reutiliza o fluxo com IPCA capitalizado, não herda condições Finame e não presume que todo contrato TLP seja TLPCAP. A escolha do seletor preserva os campos preenchidos e revoga a confirmação tributária. A navegação para outra calculadora desmonta o formulário Finame; ao voltar, os valores padrão são restaurados, conforme o comportamento atual das rotas. Não há persistência de rascunho entre essas telas.

O motor `finameMateriais.js` conserva a projeção capitalizada para regressão e uso programático explícito: `custo: 'tlp'` exige `perfilTlp: 'tlpcap'`. Sem esse perfil, ou com perfil exigível, a chamada é recusada. O resultado identifica `perfil: 'tlpcap'`; não se trata de apuração contratual. O catálogo visual encaminha TLP ao motor exigível, e não oferece o perfil capitalizado nesta tela.

Exemplos separados e sintéticos mostram a diferença, sem certificar datas de um contrato: R$ 100 mil, TLP/J de 8,12%, BNDES 1,25%, agente 2%, IPCA 10,29%. No terceiro mês do modelo capitalizado, cobrança de R$ 2.841,72 e saldo de R$ 102.478,80. No modelo exigível, em um período sintético de 63 DU, cobrança de R$ 5.343,89 e saldo de R$ 100 mil. Os períodos são comparáveis apenas pela hipótese de um quarto de ano.

## Carência e calendário

O modelo mensal conta as cobranças retroativamente desde o fim da carência, conforme a regra de distribuição do Anexo I, item 5.3:

- 5 meses, trimestral: meses 2 e 5.
- 7 meses, trimestral: meses 1, 4 e 7.
- 5 meses, semestral: mês 5.
- 7 meses, semestral: meses 1 e 7.

A última cobrança de juros da carência ocorre no seu fim; a primeira pode ter período menor. Após a carência, amortização mensal. Carência igual ao prazo total continua inválida.

A interface identifica visivelmente **calendário hipotético**, **data ilustrativa** e **liberação hipotética**. O modelo usa meses iguais de 1/12 do ano, datas a partir de hoje e ajuste somente para o último dia de meses mais curtos. Não implementa data-base, dia 15, feriados ou ajuste bancário. A tabela não é memória contratual. A afirmação de compensação anual de dias úteis foi retirada: mesmo uma soma anual igual de dias úteis pode produzir juros totais diferentes com saldo amortizante.

## Segurança numérica

- Composição das taxas por `log1p`/`expm1`, preservando taxas positivas ínfimas.
- Amortização Price pela expressão estável `saldo × i / expm1(n × log1p(i))`, equivalente a prestação menos juros; última amortização liquida exatamente o saldo.
- Entradas finitas, enums explícitos e prazo válido; soma compensada para juros e pagamentos.
- Valores monetários de entrada e saída limitados tecnicamente a R$ 1 trilhão. O limite preserva precisão em centavos e **não é enquadramento comercial**.
- Antes de retornar sucesso, conferência de finitude, não negatividade dos pagamentos/saldos, saldo final zero, soma do principal, amortização corrigida e identidade do total, com diferença menor que meio centavo. Resultados não aceitos não retornam parcelas nem total parcial.
- O limite comercial de R$ 150 milhões por cliente em 12 meses continua gerando aviso, sem bloqueio automático. A calculadora desconhece o consumo anterior dessa janela.

A interface continua bloqueada até confirmação de recursos FINAME elegíveis ao IOF zero. O helper legado de IOF tributável permanece aproximado e fora do caminho da UI. Nenhuma reativação como cálculo fiscal exato foi feita. O modelo Finame continua sem CET, tarifas, seguros ou garantias.

## Verificação local deste lote

Antes das correções: os 14 testes Finame existentes passavam e as três reproduções de lacunas da auditoria falhavam (carência 5/3, Price com taxa ínfima e principal infinito).

Depois das correções:

- 23 testes Finame passam, além das três reproduções agora corrigidas.
- 83 testes Finame e do motor de referência TFB passam no comando focado.
- O teste de regressão guarda o cenário TFC usual: juros R$ 268.676,25, total R$ 768.676,25 e saldo final zero. A proteção por hash que impedia qualquer correção foi substituída por verificações de comportamento e separação de perfil.
- 216 combinações adicionais na suíte verificam saldo, principal, total, finitude e limites. Não são 216 novos casos do runner: compõem um teste parametrizado.
- Oráculo independente externo em Python Decimal com 80 casas: 386 cenários, todos aceitos e conciliados, incluindo valores de R$ 0,01 a R$ 10 bilhões, taxa zero/ínfima/alta, deflação, inflação, SAC, Price e carência. Maior diferença absoluta: R$ 0,00004339.
- ESLint dos arquivos Finame e testes afetados passou.
- Teste React com hooks confirma bloqueio tributário, revogação ao trocar funding, preservação dos campos ao mudar o seletor, ausência do antigo campo IPCA e encaminhamento correto à TLP exigível.

Esta nota não afirma teste de navegador, publicação, homologação bancária ou certificação de calendário. A suíte global, integração de outras calculadoras, build e inspeção visual pertencem à verificação do lote integrado.

## Fontes

- [Anexo I do BNDES, itens 5.1–5.4](https://www.bndes.gov.br/sbn/BNDES_online/Arquivos/01-22Cir13-Anexo-I-Procedimentos-Operacionais.pdf).
- [Anexo IV do BNDES, perfis TLP e TLPCAP](https://www.bndes.gov.br/sbn/BNDES_online/Arquivos/04-22Cir13-Anexo-IV-Condicoes-a-Serem-Observadas-na-Contratacao.pdf).
- [Página Finame Materiais Industrializados](https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/finame-materiais-industrializados).
- [Decreto 6.306, art. 8º, IX e § 5º](https://www2.camara.leg.br/legin/fed/decret/2007/decreto-6306-14-dezembro-2007-566561-normaatualizada-pe.html).
