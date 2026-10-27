import test from 'node:test';
import assert from 'node:assert/strict';
import { montarArgs, sugerir, SAIDA } from '../src/jev.js';

const opcoes = [
  { subcategoria_id: 'MOR-17', nome: 'Telefone' },
  { subcategoria_id: 'ALI-01', nome: 'Mercado' },
];
const mov = { descricao: 'DA VIVO SP', valor: -89.9 };
const resposta = (obj, code = 0) => async () => ({ code, stdout: JSON.stringify(obj) });

test('args: opções com descrição, saída de emergência e estado com sinal', () => {
  const a = montarArgs(mov, opcoes);
  assert.deepEqual(a.slice(0, 2), ['choice', 'Qual a subcategoria deste lançamento bancário?']);
  assert.equal(a[a.indexOf('--state') + 1], 'DA VIVO SP | valor -89.90 | saída');
  const dadas = a.filter((_, i) => a[i - 1] === '--option');
  assert.deepEqual(dadas, ['MOR-17=Telefone', 'ALI-01=Mercado', `${SAIDA}=nenhuma das anteriores`]);
});

test('sugere quando a confiança passa do mínimo', async () => {
  const r = await sugerir(mov, opcoes, { executar: resposta({ choice: 'MOR-17', confidence: 0.9 }) });
  assert.deepEqual(r, { subcategoria_id: 'MOR-17', confianca: 0.9 });
});

test('sem sugestão: confiança baixa, "outra", exit != 0 ou sem opções', async () => {
  assert.equal(await sugerir(mov, opcoes, { executar: resposta({ choice: 'MOR-17', confidence: 0.3 }) }), null);
  assert.equal(await sugerir(mov, opcoes, { executar: resposta({ choice: SAIDA, confidence: 0.99 }) }), null);
  assert.equal(await sugerir(mov, opcoes, { executar: resposta({}, 3) }), null);
  assert.equal(await sugerir(mov, [], { executar: resposta({ choice: 'MOR-17', confidence: 1 }) }), null);
});
