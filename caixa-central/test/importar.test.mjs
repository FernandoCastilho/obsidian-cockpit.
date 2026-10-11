import test from 'node:test';
import assert from 'node:assert/strict';
import { limparDescricao, consertarAcentos, normalizar } from '../src/texto.js';
import { prepararRegras, classificar } from '../src/regras.js';
import { importar } from '../src/importar.js';

const regras = prepararRegras([
  { regra_id: 'R1', texto_contem: 'DA VIVO', subcategoria_id: 'MOR-17', tipo: 'despesa', prioridade: '20', ativa: 'Sim' },
  { regra_id: 'R2', texto_contem: 'PIX TRANSF IRIS', subcategoria_id: 'INT-01', tipo: 'transferencia', prioridade: '10', ativa: 'Sim' },
  { regra_id: 'R3', texto_contem: 'INATIVA', subcategoria_id: 'X', tipo: 'despesa', prioridade: '10', ativa: 'Não' },
]);
const conta = { conta_id: 'CC-TESTE', pessoa_id: 'P01' };
const mov = (dataIso, descricao, valor, pendente = false) => ({ dataIso, descricao, valor, pendente });
const extrato = (movimentos, hash = 'h1') => ({ movimentos, saldoAnterior: 100, saldoFinal: 70, hash });
const rodar = (e, extra = {}) => importar({ extrato: e, arquivo: 'a.xls', conta, regras, existentes: new Map(), importacoes: [], hoje: '2026-01-31', ...extra });

test('limpeza de descrição e acentos', () => {
  assert.equal(limparDescricao('PIX TRANSF ANA M02/01'), 'PIX TRANSF ANA M');
  assert.equal(consertarAcentos('DISPONÃ\u008dVEL'), 'DISPONÍVEL');
  assert.equal(normalizar('  Ação   é '), 'ACAO E');
});

test('regras: espaços duplos casam, inativa é ignorada, sem regra segue o sinal', () => {
  assert.equal(classificar('DA  VIVO-SP 123', -10, regras).subcategoria_id, 'MOR-17');
  assert.equal(classificar('INATIVA', -1, regras).subcategoria_id, 'SEM-D-01');
  assert.equal(classificar('ALGO', 5, regras).subcategoria_id, 'SEM-R-01');
});

test('importação nova: ids, chave com ocorrência e conferência de saldo', () => {
  const r = rodar(extrato([mov('2026-01-02', 'PIX TRANSF IRIS 01/01', -20), mov('2026-01-02', 'CAFE', -5), mov('2026-01-02', 'CAFE', -5)]));
  assert.equal(r.lancamentos.length, 3);
  assert.equal(r.lancamentos[0].lancamento_id, 'IMP-0001-0001');
  assert.deepEqual(r.lancamentos.slice(1).map((l) => l.chave_dedup.split('|').at(-1)), ['1', '2']);
  assert.equal(r.resumo.conferencia.ok, true);
  assert.equal(r.importacao.linhas, 3);
});

test('mesmo arquivo (hash) não entra duas vezes', () => {
  const r = rodar(extrato([mov('2026-01-02', 'CAFE', -30)]), { importacoes: [{ importacao_id: 'IMP-0001', hash: 'h1' }] });
  assert.equal(r.jaImportado, true);
  assert.equal(r.lancamentos.length, 0);
});

test('extrato sobreposto: duplicados saem e pendente vira realizado', () => {
  const primeira = rodar(extrato([mov('2026-01-02', 'CAFE', -10), mov('2026-02-01', 'DA VIVO', -20, true)]));
  const existentes = new Map(primeira.lancamentos.map((l) => [l.chave_dedup, l.status]));
  const segunda = rodar(
    extrato([mov('2026-01-02', 'CAFE', -10), mov('2026-02-01', 'DA VIVO', -20), mov('2026-02-03', 'NOVO', 1)], 'h2'),
    { existentes, importacoes: [primeira.importacao] },
  );
  assert.equal(segunda.resumo.duplicadas, 1);
  assert.equal(segunda.promover.length, 1);
  assert.equal(segunda.lancamentos.length, 1);
  assert.equal(segunda.importacao.importacao_id, 'IMP-0002');
});
