# Direção de arte do Caixa Central

## Regra permanente

**Nenhuma publicação sai sem uma revisão de direção de arte antes.** A revisão avalia cores, design e disposição
com um olhar moderno e executivo, nas telas reais (dados reais, só em ambiente de teste), no notebook e no celular,
no modo claro e no escuro. Capturas com dados reais nunca vão para o repositório.

## Princípios

1. **Um foco por tela.** O resultado do mês é o herói; o resto é apoio.
2. **Cor com função.** Tinta neutra para dados. Vermelho só para estouro ou valor negativo. Âmbar só para o que
   pede atenção (por exemplo, lançamentos sem categoria). Verde só para variação positiva. Cor nunca decora.
3. **Hierarquia nos números.** Reais em destaque; "R$" e centavos discretos. Algarismos tabulares, alinhados à direita.
4. **Superfícies simples.** Sem caixas dentro de caixas; divisores finos em vez de bordas.
5. **Celular primeiro.** Navegação fixa embaixo, uma coluna, sem rolagem horizontal da página.
6. **Qualidade dos dados à vista.** O aviso de "sem categoria" aparece no topo, não escondido numa barra.

## Ícones e bancos

- Ícones de categorias e subcategorias: biblioteca própria de traço único (`src/icons.js`), monocromática. O ícone de
  cada item fica na planilha (coluna `icone` das abas Categorias e Subcategorias), então é editável sem mexer no código.
  Se a coluna estiver vazia, vale o da categoria; se não houver, um padrão. Âmbar apenas em itens que pedem atenção.
- Bancos: selo circular com a sigla na cor da marca (colunas `sigla` e `cor` da aba Bancos). **Logos oficiais são marcas
  registradas e não foram copiados nem redesenhados.** Para usar o logo oficial, preencher `logo_url` com o endereço de
  uma imagem que o proprietário tenha direito de usar; se a imagem falhar, o app volta ao selo.

## Roteiro da revisão (marcar antes de publicar)

- [ ] O olho sabe onde pousar em cada tela?
- [ ] Toda cor usada tem um significado? Algo está colorido só por enfeite?
- [ ] Os números se leem de relance (peso, alinhamento, unidade)?
- [ ] Notebook (≥ 1100 px) e celular (390 px): nada cortado, sem rolagem horizontal da página?
- [ ] Modo escuro com contraste adequado?
- [ ] A tela com muitos dados (tabela anual, lista longa) continua legível?
- [ ] Parecer final do diretor de arte registrado no pedido de publicação.

## Histórico

- **Revisão 1 (antes da primeira publicação).** Apontados: ausência de foco (4 cartões iguais), cor decorativa
  (botão verde dominante), "sem categoria" disfarçado, caixas aninhadas, números sem hierarquia, cabeçalho de 5 faixas
  no celular, tabela anual cortada. Corrigidos na versão 2.
- **Revisão 2 (ícones).** Ícones por categoria, subcategoria e banco. Ajustes: alinhamento vertical dos valores,
  datas em caixa de frase, selo do banco maior, "Sem categoria" no Orçamento em âmbar (não vermelho).
