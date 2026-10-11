// Leitor do extrato de conta corrente do Itaú (.xls, aba "Lançamentos").
import XLSX from 'xlsx';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { consertarAcentos, dataParaIso, lerValor } from './texto.js';

const SALDO = /^SALDO (ANTERIOR|TOTAL DISPON)/;

export function hashArquivo(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

// Devolve { movimentos, saldoAnterior, saldoFinal }. Saldos não são movimentos: servem para conferir o fechamento.
export function lerExtratoItau(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const nome = wb.SheetNames.find((n) => /^Lan/i.test(consertarAcentos(n))) ?? wb.SheetNames[0];
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: '' });

  const cab = linhas.findIndex((l) => String(l[0]).trim().toLowerCase() === 'data');
  if (cab < 0) throw new Error('Cabeçalho (data, lançamento, ag./origem, valor, saldos) não encontrado');

  const movimentos = [];
  let saldoAnterior = null;
  let saldoFinal = null;
  let futuro = false;

  for (const l of linhas.slice(cab + 1)) {
    const primeira = consertarAcentos(l[0]).trim();
    if (/^lan.amentos futuros$/i.test(primeira)) { futuro = true; continue; }
    const iso = dataParaIso(primeira);
    if (!iso) continue; // títulos como "lançamentos" e "saídas futuras"

    const descricao = consertarAcentos(l[1]).replace(/\s+/g, ' ').trim();
    if (SALDO.test(descricao)) {
      const saldo = lerValor(l[4]);
      if (/ANTERIOR/.test(descricao)) saldoAnterior = saldo;
      else saldoFinal = saldo;
      continue;
    }
    const valor = lerValor(l[3]);
    if (valor === null) continue;
    movimentos.push({ dataIso: iso, descricao, valor: Math.round(valor * 100) / 100, pendente: futuro });
  }
  return { movimentos, saldoAnterior, saldoFinal };
}

export function lerExtratoItauArquivo(caminho) {
  const buffer = readFileSync(caminho);
  return { ...lerExtratoItau(buffer), hash: hashArquivo(buffer) };
}
