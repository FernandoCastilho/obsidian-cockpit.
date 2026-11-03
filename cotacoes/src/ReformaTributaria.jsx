import { useMemo, useState } from 'react'
import Flag from './Flag.jsx'
import { CURRENCIES } from './useQuotes.js'
import { useDataFile } from './useDataFile.js'
import { normalizeReforma, normalizeTemas } from './reforma.js'
import NoticiasPorDia from './NoticiasPorDia.jsx'
import Estado from './Estado.jsx'

// Resumo › "Reforma tributária": o que a imprensa publicou sobre o tema na semana, por dia, com busca.
export default function ReformaTributaria() {
  const file = useDataFile('reforma-tributaria.json')
  const data = useMemo(() => { try { return file.data ? normalizeReforma(file.data) : null } catch { return null } }, [file.data])
  return (
    <>
      {file.status === 'loading' && <Estado>Carregando a reforma tributária…</Estado>}
      {file.status === 'error' && !data && <Estado tipo="erro" erro={file.error}>Reforma tributária indisponível no momento.</Estado>}
      {file.data && !data && <Estado tipo="erro">Arquivo da reforma tributária em formato inesperado.</Estado>}
      {data && <NoticiasPorDia data={data} ariaLabel="Reforma tributária: matérias da semana" />}
    </>
  )
}

// Resumo › "Eleições EUA" (e outros temas de temas.json): matérias da semana, por dia, com busca.
export function TemaNoticias({ id }) {
  const file = useDataFile('temas.json')
  const tema = useMemo(() => { try { return file.data ? normalizeTemas(file.data)[id] ?? null : null } catch { return null } }, [file.data, id])
  return (
    <>
      {file.status === 'loading' && <Estado>Carregando as matérias…</Estado>}
      {file.status === 'error' && !tema && <Estado tipo="erro" erro={file.error}>Matérias indisponíveis no momento.</Estado>}
      {file.data && !tema && file.status !== 'loading' && <Estado>Ainda não há matérias coletadas para este assunto; a coleta é de hora em hora.</Estado>}
      {tema && <NoticiasPorDia key={id} data={tema} ariaLabel={`${tema.label}: matérias da semana`} />}
    </>
  )
}

// Resumo › "Moedas": as moedas acompanhadas, com a cotação do momento, e as matérias da semana sobre a escolhida.
const fmt = (code, v) => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: code === 'JPY' ? 5 : 4, maximumFractionDigits: code === 'JPY' ? 5 : 4 }) : '—')
export function MoedasNoticias({ quotes }) {
  const [code, setCode] = useState('USD')
  return (
    <>
      <div className="moedas-escolha" role="group" aria-label="Moeda das notícias">
        {CURRENCIES.map((c) => {
          const q = quotes?.[c.code], pct = q?.pct
          return (
            <button key={c.code} type="button" aria-pressed={code === c.code} className={code === c.code ? 'on' : ''} onClick={() => setCode(c.code)} aria-label={`Notícias: ${c.name}, ${c.code}/BRL ${fmt(c.code, q?.bid)}`}>
              <span className="moeda-nome"><Flag code={c.code} width={16} height={11} />{c.code}/BRL</span>
              <b>{fmt(c.code, q?.bid)}</b>
              {Number.isFinite(pct) && <small className={pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'}>{pct > 0 ? '▲' : pct < 0 ? '▼' : '■'} {Math.abs(pct).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</small>}
            </button>
          )
        })}
      </div>
      <TemaNoticias id={`moeda-${code.toLowerCase()}`} />
    </>
  )
}
