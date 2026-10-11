// Núcleo do importador: movimentos de um extrato -> linhas de Lancamentos e Importacoes.
// Sem E/S: recebe o estado da planilha (regras, chaves existentes, importações) e devolve o que gravar.
import { classificar } from './regras.js';
import { isoParaBr, limparDescricao, valorBr } from './texto.js';

export const COLUNAS_LANCAMENTOS = [
  'lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_original', 'descricao_limpa',
  'subcategoria_id', 'tipo', 'status', 'parcela_n', 'parcela_total', 'recorrencia_id', 'par_transferencia_id',
  'chave_dedup', 'importacao_id', 'revisado', 'obs',
];
export const COLUNAS_IMPORTACOES = [
  'importacao_id', 'arquivo', 'conta_id', 'periodo_inicio', 'periodo_fim', 'linhas', 'hash', 'data_importacao', 'obs',
];

const pad = (n, t) => String(n).padStart(t, '0');

export function proximoIdImportacao(importacoes) {
  const maior = importacoes
    .map((i) => /^IMP-(\d+)$/.exec(i.importacao_id ?? '')?.[1])
    .filter(Boolean)
    .reduce((m, n) => Math.max(m, Number(n)), 0);
  return `IMP-${pad(maior + 1, 4)}`;
}

// chave = data|valor|conta|descrição|n, com n a ocorrência do mesmo par no arquivo (lançamentos idênticos no dia).
function chaves(movs, contaId) {
  const vistos = new Map();
  return movs.map((m) => {
    const desc = limparDescricao(m.descricao) || m.descricao;
    const base = `${m.dataIso}|${m.valor.toFixed(2)}|${contaId}|${desc}`;
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    return `${base}|${n}`;
  });
}

/**
 * @param {object} p
 * @param {{movimentos, saldoAnterior, saldoFinal, hash}} p.extrato
 * @param {string} p.arquivo nome do arquivo no Drive
 * @param {{conta_id, pessoa_id}} p.conta
 * @param {object[]} p.regras saída de prepararRegras
 * @param {Map<string,string>} p.existentes chave_dedup -> status das linhas já gravadas
 * @param {object[]} p.importacoes linhas atuais da aba Importacoes (objetos)
 * @param {string} p.hoje AAAA-MM-DD
 */
export function importar({ extrato, arquivo, conta, regras, existentes, importacoes, hoje }) {
  if (importacoes.some((i) => i.hash && i.hash === extrato.hash)) {
    return { jaImportado: true, lancamentos: [], promover: [], importacao: null, resumo: { motivo: 'hash já registrado em Importacoes' } };
  }

  const id = proximoIdImportacao(importacoes);
  const { movimentos } = extrato;
  const lista = chaves(movimentos, conta.conta_id);

  const lancamentos = [];
  const promover = [];
  let duplicadas = 0;
  let semRegra = 0;

  movimentos.forEach((m, i) => {
    const chave = lista[i];
    const status = m.pendente ? 'pendente' : 'realizado';
    if (existentes.has(chave)) {
      if (existentes.get(chave) === 'pendente' && status === 'realizado') promover.push(chave);
      else duplicadas++;
      return;
    }
    const c = classificar(m.descricao, m.valor, regras);
    const limpa = limparDescricao(m.descricao);
    if (c.semRegra) semRegra++;
    const data = isoParaBr(m.dataIso);
    lancamentos.push({
      lancamento_id: `${id}-${pad(i + 1, 4)}`,
      conta_id: conta.conta_id,
      pessoa_id: c.pessoa_id || conta.pessoa_id,
      data,
      data_caixa: data,
      valor: m.valor,
      descricao_original: m.descricao,
      descricao_limpa: limpa !== m.descricao ? limpa : '',
      subcategoria_id: c.subcategoria_id,
      tipo: c.tipo,
      status,
      parcela_n: '', parcela_total: '', recorrencia_id: '', par_transferencia_id: '',
      chave_dedup: chave,
      importacao_id: id,
      revisado: 'Não',
      obs: c.semRegra ? 'sem regra' : '',
    });
  });

  // Conferência: saldo anterior + movimentos realizados deve bater com o último saldo do extrato.
  const realizados = movimentos.filter((m) => !m.pendente);
  const soma = Math.round(realizados.reduce((s, m) => s + m.valor, 0) * 100) / 100;
  let conferencia = null;
  if (extrato.saldoAnterior != null && extrato.saldoFinal != null) {
    const esperado = Math.round((extrato.saldoAnterior + soma) * 100) / 100;
    conferencia = { esperado, extrato: extrato.saldoFinal, ok: Math.abs(esperado - extrato.saldoFinal) < 0.005 };
  }

  const datas = movimentos.map((m) => m.dataIso).sort();
  const pendentes = movimentos.filter((m) => m.pendente).length;
  const importacao = {
    importacao_id: id,
    arquivo,
    conta_id: conta.conta_id,
    periodo_inicio: datas[0] ?? '',
    periodo_fim: datas.at(-1) ?? '',
    linhas: movimentos.length,
    hash: extrato.hash,
    data_importacao: hoje,
    obs: [
      extrato.saldoAnterior != null ? `Saldo anterior: ${valorBr(extrato.saldoAnterior)}.` : '',
      conferencia ? `Saldo conferido: ${valorBr(conferencia.extrato)}${conferencia.ok ? '' : ` (divergente, esperado ${valorBr(conferencia.esperado)})`}.` : '',
      pendentes ? `${pendentes} lançamentos futuros como pendente.` : '',
      `${semRegra} linhas sem regra, a classificar.`,
    ].filter(Boolean).join(' '),
  };

  return {
    jaImportado: false,
    lancamentos,
    promover,
    importacao,
    resumo: { novas: lancamentos.length, duplicadas, promovidas: promover.length, semRegra, pendentes, conferencia },
  };
}

export const linhaLancamento = (l) => COLUNAS_LANCAMENTOS.map((c) => l[c] ?? '');
export const linhaImportacao = (i) => COLUNAS_IMPORTACOES.map((c) => i[c] ?? '');
