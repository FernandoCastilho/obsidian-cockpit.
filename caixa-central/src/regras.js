import { normalizar } from './texto.js';

const sim = (v) => String(v ?? '').trim().toLowerCase() === 'sim';

// linhas = aba Regras como objetos (cabeçalho -> valor). Menor prioridade vence; empate: texto mais longo.
export function prepararRegras(linhas) {
  return linhas
    .filter((r) => sim(r.ativa) && r.texto_contem)
    .map((r, ordem) => ({
      regra_id: r.regra_id,
      texto: normalizar(r.texto_contem),
      subcategoria_id: r.subcategoria_id,
      tipo: r.tipo,
      pessoa_id: r.pessoa_id || '',
      prioridade: Number(r.prioridade) || 100,
      ordem,
    }))
    .sort((a, b) => a.prioridade - b.prioridade || b.texto.length - a.texto.length || a.ordem - b.ordem);
}

export function classificar(descricao, valor, regras) {
  const d = normalizar(descricao);
  const regra = regras.find((r) => d.includes(r.texto));
  if (regra) {
    return { subcategoria_id: regra.subcategoria_id, tipo: regra.tipo, pessoa_id: regra.pessoa_id, regra_id: regra.regra_id, semRegra: false };
  }
  return valor < 0
    ? { subcategoria_id: 'SEM-D-01', tipo: 'despesa', pessoa_id: '', regra_id: '', semRegra: true }
    : { subcategoria_id: 'SEM-R-01', tipo: 'receita', pessoa_id: '', regra_id: '', semRegra: true };
}
