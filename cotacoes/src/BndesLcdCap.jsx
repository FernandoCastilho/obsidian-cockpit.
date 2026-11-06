import { useMemo, useState } from 'react'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import { useDataFile } from './useDataFile.js'
import { dmy } from './format.js'
import { LCDCAP_SOURCE, lcdQuoteAt, parseLcdSchedule, simulateLcdCap } from './bndesLcdCap.js'
import { LCD_SNAPSHOT_AS_OF, withOfficialLcdSnapshot } from './lcdOfficialSnapshot.js'
import './BndesLcdCap.css'

const brl = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = text => text.trim().replace(',', '.')
const number = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
export function LcdIcon() { return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 20h18M5 17V9h4v8m2 0V5h4v12m2 0v-5h4v5M3 4l4 1 4-3 4 1 6-2" /></svg> }

function BalanceChart({ result }) {
  const points = [{ date: result.rows[0].from, value: result.totals.principalCents }, ...result.rows.map(row => ({ date: row.date, value: row.closingCents }))]
  const max = Math.max(...points.map(point => point.value)), from = Date.parse(points[0].date), duration = Date.parse(points.at(-1).date) - from
  const line = points.map(point => `${40 + (Date.parse(point.date) - from) / duration * 920},${160 - point.value / max * 140}`).join(' ')
  return <figure className="lcd-chart"><figcaption>Saldo após cada cobrança · projeção informada</figcaption><svg viewBox="0 0 1000 190" role="img" aria-label="Evolução projetada do saldo, da liberação à quitação. Valores disponíveis no cronograma abaixo."><path d="M40 20V160H960" fill="none" stroke="currentColor" opacity="0.3" /><polyline points={line} fill="none" stroke="var(--amber, #ffb000)" strokeWidth="3" /><text x="40" y="184">{dmy(points[0].date)}</text><text x="960" y="184" textAnchor="end">{dmy(points.at(-1).date)}</text><text x="45" y="16">Máximo {brl(max)}</text></svg></figure>
}

export default function BndesLcdCap({ onBack }) {
  const moedas = useDataFile('moedas.json')
  const moedasData = useMemo(() => withOfficialLcdSnapshot(moedas.data), [moedas.data])
  const [principalText, setPrincipal] = useState('')
  const [contractDate, setContractDate] = useState(''), [releaseDate, setReleaseDate] = useState('')
  const [ld1Text, setLd1] = useState(''), [fixingDate, setFixingDate] = useState(''), [ld1Source, setLd1Source] = useState('')
  const [bndes, setBndes] = useState(''), [intermediation, setIntermediation] = useState(''), [agent, setAgent] = useState('')
  const [selic, setSelic] = useState(''), [scenarioAccepted, setScenarioAccepted] = useState(false), [ld1Confirmed, setLd1Confirmed] = useState(false)
  const [scheduleText, setScheduleText] = useState(''), [scheduleSource, setScheduleSource] = useState(''), [scheduleConfirmed, setScheduleConfirmed] = useState(false)
  const principal = parseMoneyInput(principalText), schedule = parseLcdSchedule(scheduleText)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const quote = lcdQuoteAt(moedasData, contractDate, today)
  const result = simulateLcdCap({ mode: 'projection', principalCents: principal.ok ? Math.round(principal.value * 100) : null, contractDate, releaseDate,
    ld1: { annualPct: decimal(ld1Text), fixingDate, source: ld1Source, confirmed: ld1Confirmed },
    spreads: { bndes: decimal(bndes), intermediation: decimal(intermediation), agent: decimal(agent) },
    selicScenario: { annualPct: decimal(selic), acknowledged: scenarioAccepted }, schedule: { events: schedule.events, source: scheduleSource, confirmed: scheduleConfirmed } })
  const field = (id, label, value, setValue, type = 'text', hint) => <div className="cx-field"><label htmlFor={`lcd-${id}`}>{label}</label><input id={`lcd-${id}`} type={type} inputMode={type === 'text' && !['source', 'schedule-source'].includes(id) ? 'decimal' : undefined} value={value} onChange={event => setValue(event.target.value)} autoComplete="off" />{hint && <p className="cx-hint">{hint}</p>}</div>
  const selicPoints = moedasData?.series?.['143']?.points?.filter(point => point[0] <= today) ?? []
  const lastSelic = selicPoints.at(-1)
  return <section className="cx cx-lcd" aria-labelledby="lcd-title">
    <button type="button" className="cx-back" onClick={onBack}><span aria-hidden="true">‹</span> Calculadoras</button>
    <h2 id="lcd-title" className="cx-title"><span className="cx-icon"><LcdIcon /></span>BNDES · Selic capitalizada + LCD</h2>
    <p className="status">Projeção da modalidade LCDCAP para operações indiretas. A Selic aumenta o saldo; LD1 e remunerações são cobradas nos vencimentos. TLP exigível é uma modalidade diferente e não usa este motor.</p>
    <article className="desk-panel cx-panel"><header><h3>Condições da operação</h3></header><div className="cx-form">
      <div className="cx-field"><label htmlFor="lcd-principal">Valor liberado, sem encargos financiados</label><MoneyInput id="lcd-principal" value={principalText} onChange={setPrincipal} /></div>
      {field('contract', 'Data da contratação', contractDate, value => { setContractDate(value); setLd1Confirmed(false) }, 'date')}
      {field('release', 'Data da liberação', releaseDate, value => { setReleaseDate(value); setScheduleConfirmed(false) }, 'date')}
      {field('selic', 'Cenário constante de Selic (% a.a.)', selic, value => { setSelic(value); setScenarioAccepted(false) }, 'text', 'Hipótese fornecida por você para os dias úteis de toda a projeção. Não há taxa futura oficial preenchida automaticamente.')}
      <label className="lcd-check lcd-full"><input type="checkbox" checked={scenarioAccepted} onChange={event => setScenarioAccepted(event.target.checked)} />Confirmo que essa Selic é um cenário de projeção.</label>
      <p className="cx-hint lcd-full">Índice histórico Selic acumulada D-2 (143): {lastSelic ? `${number(lastSelic[1])} em ${dmy(lastSelic[0])}` : moedas.status === 'loading' ? 'carregando' : 'indisponível'}. É um índice, não uma taxa de 143% nem a Selic anual. D-2 já corresponde à defasagem de dois dias úteis. <a href="#bndes/moedas/143?p=12m">Ver gráfico 143</a>.</p>
      {field('ld1', 'Sobretaxa LCD fixada no contrato (% a.a.)', ld1Text, value => { setLd1(value); setLd1Confirmed(false) })}
      {field('fixing', 'Data da referência LD1 da contratação', fixingDate, value => { setFixingDate(value); setLd1Confirmed(false) }, 'date')}
      {field('source', 'Fonte da sobretaxa contratada', ld1Source, value => { setLd1Source(value); setLd1Confirmed(false) })}
      <div className="cx-field"><span className="cx-label">Referência LD1 do snapshot</span><p className="cx-hint">{quote ? `${number(Number(quote.annualPct))}% a.a. em ${dmy(quote.date)}${quote.retainedSince ? ' · snapshot, sem atualização automática' : ''}. Confirme a taxa do seu contrato.` : 'Sem referência verificada para a data da contratação. Informe a taxa e a fonte do contrato.'}</p><button type="button" disabled={!quote} onClick={() => { setLd1(quote.annualPct.replace('.', ',')); setFixingDate(quote.date); setLd1Source(quote.source); setLd1Confirmed(false) }}>Preencher com esta referência</button><p className="cx-hint">Histórico oficial consultado em {dmy(LCD_SNAPSHOT_AS_OF)}. Datas posteriores à cobertura não têm referência confirmada nesta versão.</p><a href="#bndes/moedas/LD1?p=12m">Ver gráfico LD1</a></div>
      <label className="lcd-check lcd-full"><input type="checkbox" checked={ld1Confirmed} onChange={event => setLd1Confirmed(event.target.checked)} />Conferi a sobretaxa fixada na contratação. Novas divulgações não reprecificam este contrato.</label>
      {field('bndes', 'Remuneração básica BNDES (% a.a.)', bndes, setBndes)}
      {field('intermediation', 'Intermediação financeira (% a.a.)', intermediation, setIntermediation)}
      {field('agent', 'Remuneração do agente (% a.a.)', agent, setAgent, 'text', 'Preencha inclusive zero quando não aplicável. As três remunerações e LD1 são somadas antes da conversão por DU/252.')}
    </div></article>
    <article className="desk-panel cx-panel"><header><h3>Cronograma completo informado</h3></header><div className="cx-form">
      <div className="cx-field lcd-full"><label htmlFor="lcd-schedule">Uma cobrança por linha: data; dias úteis; C ou A</label><textarea id="lcd-schedule" value={scheduleText} onChange={event => { setScheduleText(event.target.value); setScheduleConfirmed(false) }} rows="7" spellCheck="false" placeholder="AAAA-MM-DD; dias úteis; C (carência) ou A (amortização)" /><p className="cx-hint">Use datas de vencimento já ajustadas. Os dias úteis são contados desde a liberação ou cobrança anterior. C cobra somente juros fixos; A também amortiza o saldo corrigido dividido pelas amortizações restantes. A carência vem antes de todas as amortizações. Inclua o vencimento final.</p>{scheduleText && !schedule.ok && <p className="cx-error" role="alert">{schedule.error.message}</p>}</div>
      {field('schedule-source', 'Origem das datas e contagens de dias úteis', scheduleSource, value => { setScheduleSource(value); setScheduleConfirmed(false) })}
      <label className="lcd-check lcd-full"><input type="checkbox" checked={scheduleConfirmed} onChange={event => setScheduleConfirmed(event.target.checked)} />Conferi o cronograma, as periodicidades contratuais, datas ajustadas e dias úteis de cada período.</label>
    </div></article>
    <article className="desk-panel cx-panel" aria-live="polite"><header><h3>Projeção do fluxo</h3></header>{!result.ok ? <p className="status cx-pad" role="status">Resultado indisponível: {scheduleText && !schedule.ok ? schedule.error.message : result.error.message} Dados ausentes não são tratados como zero.</p> : <>
      <div className="fm-grade"><div className="fm-kpi"><span>Remunerações + LD1</span><b>{number(result.fixedAnnualPct)}% a.a.</b><small>Componente exigível · base 252</small></div><div className="fm-kpi"><span>Selic capitalizada</span><b>{brl(result.totals.capitalizedSelicCents)}</b><small>Incorporada ao saldo projetado</small></div><div className="fm-kpi"><span>Juros exigíveis</span><b>{brl(result.totals.interestCents)}</b><small>Sem duplicar a Selic no pagamento</small></div><div className="fm-kpi"><span>Pagamentos projetados</span><b>{brl(result.totals.paymentCents)}</b><small>Sem tributos e demais despesas</small></div></div>
      <BalanceChart result={result} />
      <div className="cx-wrap" role="region" tabIndex="0" aria-label="Cronograma da projeção LCDCAP"><table className="cx-matrix lcd-table"><caption>Valores projetados. Selic constante de {number(result.annualSelicScenarioPct)}% a.a.</caption><thead><tr><th>Data</th><th>DU</th><th>Saldo inicial</th><th>Selic no saldo</th><th>Saldo corrigido</th><th>Juros exigíveis</th><th>Amortização</th><th>Pagamento</th><th>Saldo final</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.date}><th scope="row">{dmy(row.date)}{row.phase === 'grace' && ' · carência'}</th><td>{row.businessDays}</td>{['openingCents', 'capitalizedSelicCents', 'correctedCents', 'interestCents', 'amortizationCents', 'paymentCents', 'closingCents'].map(key => <td key={key}>{brl(row[key])}</td>)}</tr>)}</tbody></table></div>
      <ul className="lcd-warnings">{result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    </>}</article>
    <details className="lcd-method"><summary>Memória de cálculo e limites</summary><p>Fator Selic do cenário = (1 + Selic anual / 100) elevado a (DU / 252). Saldo corrigido = saldo inicial × fator Selic. Fator de juros = (1 + (BNDES + intermediação + agente + LD1) / 100) elevado a (DU / 252). Juros exigíveis = saldo corrigido × (fator de juros − 1). A amortização reduz o saldo corrigido.</p><p>O cálculo contratual exige a trajetória diária da Selic com a defasagem D-2. O histórico 143 de seis casas não é convertido em taxa anual nem usado como fator contratual exato. Esta versão calcula apenas o cenário informado, com arredondamentos de projeção, e não certifica elegibilidade, condições comerciais ou CET.</p><p><a href={LCDCAP_SOURCE} target="_blank" rel="noreferrer">BNDES · Anexo IV, seção 5 (LCDCAP)</a>. Perfil separado do Finame/TFC e da TLP exigível.</p></details>
  </section>
}
