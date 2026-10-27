// Sugestão de subcategoria via Jev (CLI `jev choice`) para movimentos que as regras não cobriram.
// Só sugere: quem decide é o revisor. Exige o binário `jev` no PATH e TYPESAFE_API_KEY no ambiente.
import { execFile } from 'node:child_process';

export const SAIDA = 'outra';

// Executa o binário sem shell. Exit != 0 não é exceção: 10 (gate) e 11 (abstém) são respostas válidas.
export function executarJev(args) {
  return new Promise((resolve, reject) => {
    execFile('jev', args, { maxBuffer: 1 << 20 }, (erro, stdout) => {
      if (erro && typeof erro.code !== 'number') return reject(erro);
      resolve({ code: erro ? erro.code : 0, stdout });
    });
  });
}

// opcoes: [{ subcategoria_id, nome }]. "outra" é a saída de emergência exigida pelo choice.
export function montarArgs(mov, opcoes) {
  const estado = `${mov.descricao} | valor ${mov.valor.toFixed(2)} | ${mov.valor < 0 ? 'saída' : 'entrada'}`;
  const args = ['choice', 'Qual a subcategoria deste lançamento bancário?', '--state', estado, '-o', 'json', '--quiet', '--no-input'];
  for (const o of opcoes) args.push('--option', `${o.subcategoria_id}=${o.nome}`);
  args.push('--option', `${SAIDA}=nenhuma das anteriores`);
  return args;
}

/**
 * @returns {Promise<{subcategoria_id: string, confianca: number} | null>} null = sem sugestão confiável
 */
export async function sugerir(mov, opcoes, { executar = executarJev, minConfianca = 0.6 } = {}) {
  if (!opcoes.length) return null;
  const { code, stdout } = await executar(montarArgs(mov, opcoes));
  if (code !== 0) return null;
  const r = JSON.parse(stdout);
  if (r.choice === SAIDA || r.confidence < minConfianca) return null;
  return { subcategoria_id: r.choice, confianca: r.confidence };
}
