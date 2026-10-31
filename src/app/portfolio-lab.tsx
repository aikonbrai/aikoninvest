'use client';

import { useRef, useState, type FormEvent } from 'react';
import { demo, DEMO_DATE } from '../lib/demo';
import type { EventType, Report, Simulation, Transaction } from '../lib/ledger';

const STORAGE_KEY = 'aikon.simulation.v1';
const labels: Record<EventType, string> = { deposit: 'Aporte', withdrawal: 'Retirada', buy: 'Compra', sell: 'Venda', dividend: 'Dividendo', fee: 'Taxa avulsa', split: 'Desdobramento', transfer: 'Transferência de caixa', exchange: 'Conversão de moeda' };
function money(minor: string | null, currency = 'BRL') {
  if (minor === null) return 'Indisponível';
  const value = BigInt(minor), absolute = value < 0n ? -value : value;
  return `${value < 0n ? '−' : ''}${currency === 'BRL' ? 'R$' : 'US$'} ${(absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${(absolute % 100n).toString().padStart(2, '0')}`;
}
function number(form: FormData, name: string, fallback = '0') {
  const value = String(form.get(name) ?? '').trim();
  return value ? value.replace(',', '.') : fallback;
}
function field(form: FormData, name: string) { return String(form.get(name) ?? '').trim(); }
function day(value: string) { return value.split('-').reverse().join('/'); }
function priceMinor(value: string) { const [whole, fraction = ''] = value.split('.'); return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString(); }

export default function PortfolioLab({ initialSimulation, initialReport }: { initialSimulation: Simulation; initialReport: Report }) {
  const [simulation, setSimulation] = useState(initialSimulation);
  const [report, setReport] = useState(initialReport);
  const [asOf, setAsOf] = useState(initialReport.asOf);
  const [type, setType] = useState<EventType>('deposit');
  const [accountId, setAccountId] = useState(initialSimulation.accounts[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Cenário fictício de exemplo carregado. Para recuperar seu trabalho, use “Abrir rascunho salvo”.');
  const lock = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const account = simulation.accounts.find(a => a.id === accountId) ?? simulation.accounts[0];
  const trade = type === 'buy' || type === 'sell';
  const needsSecurity = trade || type === 'dividend' || type === 'split';
  const hasTarget = type === 'transfer' || type === 'exchange';
  const targets = simulation.accounts.filter(a => a.id !== account.id && (a.currency === account.currency) === (type === 'transfer'));

  async function apply(candidate: unknown, date: string, success: string, persist = true): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/simulation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ simulation: candidate, asOf: date }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível avaliar o cenário.');
      const next = data as { simulation: Simulation; report: Report };
      setSimulation(next.simulation); setReport(next.report); setAsOf(next.report.asOf);
      setAccountId(current => next.simulation.accounts.some(a => a.id === current) ? current : next.simulation.accounts[0].id);
      let storageMessage = '';
      if (persist) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ simulation: next.simulation, asOf: next.report.asOf })); storageMessage = ' Rascunho salvo neste navegador.'; }
        catch { storageMessage = ' Não foi possível salvar no navegador; exporte o JSON para preservar o cenário.'; }
      }
      setMessage(success + storageMessage);
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha na avaliação.'); return false; }
    finally { lock.current = false; setBusy(false); }
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget, form = new FormData(formElement), date = field(form, 'date');
    const tx: Transaction = {
      id: crypto.randomUUID(), date, type, accountId: account.id,
      amount: trade || type === 'split' ? '0' : number(form, 'amount'),
      fee: type === 'split' || type === 'fee' ? '0' : number(form, 'fee'),
      tax: type === 'split' || type === 'fee' ? '0' : number(form, 'tax'),
      fx: { date, rate: number(form, 'fx'), source: field(form, 'source') },
      provenance: { source: field(form, 'source'), recordedAt: new Date().toISOString() },
    };
    if (needsSecurity) tx.securityId = field(form, 'security');
    if (trade) { tx.quantity = number(form, 'quantity'); tx.unitPrice = number(form, 'price'); }
    if (hasTarget) tx.targetAccountId = field(form, 'target');
    if (type === 'split') { tx.numerator = number(form, 'numerator'); tx.denominator = number(form, 'denominator'); }
    const ok = await apply({ ...simulation, transactions: [...simulation.transactions, tx] }, asOf, 'Operação simulada registrada.');
    if (ok) formElement.reset();
  }

  async function restore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) { setError('Não há rascunho salvo neste navegador.'); return; }
      const parsed = JSON.parse(saved);
      await apply(parsed.simulation, parsed.asOf, 'Rascunho recuperado e revalidado.');
    } catch { setError('Rascunho inválido. Importe um backup JSON válido.'); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ simulation, asOf: report.asOf }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'aikon-carteira-simulada.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) { setError('Arquivo excede 1 MB.'); return; }
    try {
      const data = JSON.parse(await file.text());
      await apply(data.simulation, data.asOf, 'Backup importado e revalidado.');
    } catch { setError('Arquivo JSON inválido.'); }
    if (fileInput.current) fileInput.current.value = '';
  }

  async function addSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget, form = new FormData(element), symbol = field(form, 'symbol').toUpperCase();
    if (simulation.securities.some(s => s.symbol === symbol)) { setError('Símbolo já cadastrado.'); return; }
    const security = { id: crypto.randomUUID(), symbol, name: field(form, 'name'), currency: field(form, 'currency') };
    if (await apply({ ...simulation, securities: [...simulation.securities, security] }, asOf, 'Ativo simulado adicionado.')) element.reset();
  }

  async function addQuote(event: FormEvent<HTMLFormElement>, fx = false) {
    event.preventDefault();
    const element = event.currentTarget, form = new FormData(element), date = field(form, 'date'), source = field(form, 'source');
    let candidate: Simulation;
    if (fx) {
      candidate = { ...simulation, fxQuotes: [...simulation.fxQuotes.filter(q => q.date !== date), { date, rate: number(form, 'rate'), source }] };
    } else {
      const security = simulation.securities.find(s => s.id === field(form, 'security'));
      if (!security) { setError('Selecione um ativo.'); return; }
      candidate = { ...simulation, prices: [...simulation.prices.filter(q => q.securityId !== security.id || q.date !== date), { id: crypto.randomUUID(), date, source, securityId: security.id, currency: security.currency, price: number(form, 'price') }] };
    }
    if (await apply(candidate, asOf, 'Referência simulada registrada.')) element.reset();
  }

  const sourceLabel = <label className="wide">Fonte / hipótese (somente dados fictícios)<input name="source" required maxLength={180} defaultValue="Hipótese manual simulada" /></label>;
  return <div className="shell">
    <aside>
      <a className="brand" href="#inicio">AIKON<span>INVEST LAB</span></a>
      <p className="eyebrow">CARTEIRA SIMULADA</p>
      <nav aria-label="Navegação principal">
        <a href="#inicio">◇ Visão geral</a><a href="#carteira">◉ Posições e caixa</a><a href="#operacoes">↗ Registrar operação</a><a href="#historico">▤ Histórico e auditoria</a><a href="#risco">◎ Riscos e limites</a><a href="#fontes">◇ Preços e câmbio</a>
      </nav>
      <div className="aside-note"><span className="dot" /> M1 · Laboratório local<p>Simule, confira as hipóteses e acompanhe o resultado.</p></div>
    </aside>
    <main id="inicio">
      <header><span>Inteligência patrimonial / Carteira simulada</span><span className="badge">M1 · SIMULADO</span></header>
      <section className="hero lab-hero"><div><p className="eyebrow">APRENDER COM CADA OPERAÇÃO</p><h1>Sua carteira.<br /><em>Suas hipóteses, verificáveis.</em></h1><p>Registre operações fictícias em reais e dólares. Entenda o impacto dos aportes, custos, preços e câmbio.</p><a className="button" href="#operacoes">Registrar operação ↗</a></div><div className="hero-mark" aria-hidden="true"><span>α</span><small>OBSERVAR · ENTENDER · DECIDIR</small></div></section>
      <div className="notice"><strong>SIMULADO</strong> Use somente dados fictícios. Sem cotações ao vivo, corretoras ou ordens. Rascunhos ficam neste navegador; são enviados ao servidor local apenas para cálculo, sem gravação no servidor.</div>
      <div className="toolbar" aria-label="Gerenciar cenário">
        <button disabled={busy} onClick={restore}>Abrir rascunho salvo</button><button disabled={busy} onClick={download}>Exportar JSON</button><button disabled={busy} onClick={() => fileInput.current?.click()}>Importar backup JSON</button>
        <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" aria-label="Arquivo de backup" onChange={e => { void importFile(e.target.files?.[0]); }} />
        <button disabled={busy} onClick={() => void apply(demo, DEMO_DATE, 'Exemplo restaurado.', false)}>Ver exemplo original</button>
        <button disabled={busy} onClick={() => void apply({ ...simulation, transactions: [] }, asOf, 'Novo cenário sem operações criado.')} >Iniciar cenário vazio</button>
      </div>
      <p className="helper">Importar e iniciar um cenário substituem o rascunho salvo. Exporte antes para guardar outra versão. “Ver exemplo” preserva o rascunho até você editar ou salvar.</p>
      <div className="feedback" aria-live="polite" aria-atomic="true">{busy ? <p>Avaliando cenário…</p> : error ? <p className="error" role="alert">{error}</p> : message ? <p>{message}</p> : null}</div>
      <form className="valuation-toolbar" onSubmit={e => { e.preventDefault(); void apply(simulation, asOf, 'Avaliação atualizada.'); }}>
        <label>Avaliar até (UTC)<input type="date" required value={asOf} onChange={e => setAsOf(e.target.value)} /></label>
        <button disabled={busy} type="submit">Atualizar avaliação</button><span>Exibindo {day(report.asOf)} · {report.appliedTransactions} operações aplicadas</span>
      </form>
      <div className="metrics lab-metrics">
        <article><label>Patrimônio na data</label><strong>{money(report.totalBrlMinor)}</strong><small>Caixa + posições convertidos em BRL</small></article>
        <article><label>Aportes líquidos históricos</label><strong>{money(report.netContributionsBrlMinor)}</strong><small>Aportes − retiradas, no câmbio da operação</small></article>
        <article><label>Resultado nominal em BRL</label><strong>{money(report.resultBrlMinor)}</strong><small>Patrimônio − aportes líquidos; inclui câmbio e custos</small></article>
      </div>
      <div className="summary-strip"><span>Taxas: <b>{money(report.feesBrlMinor)}</b></span><span>Tributos informados: <b>{money(report.taxesBrlMinor)}</b></span><span>Resultado realizado em vendas: <b>{money(report.realizedBrlMinor)}</b></span><span>Exposição USD: <b>{report.usdExposureBps === null ? '—' : `${(Number(report.usdExposureBps) / 100).toFixed(2).replace('.', ',')}%`}</b></span></div>
      <section id="carteira" className="lab-panel">
        <div className="section-title"><div><p className="eyebrow">PORTFOLIO MANAGER</p><h2>{simulation.portfolio.name}</h2></div><span>Custo médio com taxas e tributos de compra</span></div>
        <div className="table-scroll"><table><caption className="sr-only">Posições simuladas na data de avaliação</caption><thead><tr><th>Ativo / conta</th><th>Quantidade</th><th>Custo original</th><th>Valor original</th><th>Valor em BRL</th><th>Resultado não realizado BRL</th></tr></thead><tbody>
          {report.holdings.map(h => <tr key={`${h.accountId}-${h.securityId}`}><td><b>{h.symbol}</b><small>{simulation.accounts.find(a => a.id === h.accountId)?.name} · {h.currency}</small></td><td>{h.quantity.replace(/\.?0+$/, '').replace('.', ',')}</td><td>{money(h.costMinor, h.currency)}</td><td>{money(h.valueMinor, h.currency)}</td><td>{money(h.valueBrlMinor)}</td><td>{money(h.unrealizedBrlMinor)}</td></tr>)}
          {!report.holdings.length && <tr><td colSpan={6}>Nenhuma posição na data selecionada. Registre um aporte e uma compra para começar.</td></tr>}
        </tbody></table></div>
        <div className="cash-grid">{report.accounts.map(a => <article key={a.id}><span>{a.name}</span><strong>{money(a.cashMinor, a.currency)}</strong><small>Saldo disponível · {a.currency}</small></article>)}</div>
      </section>
      <section id="operacoes" className="lab-panel">
        <div className="section-title"><div><p className="eyebrow">LEDGER SIMULADO</p><h2>Registrar operação</h2></div><span>Sem execução no mercado</span></div>
        <p className="helper">Aportes entram na moeda da conta. Para mover BRL para USD, registre uma conversão de moeda. Em cada dia, as operações seguem a ordem de cadastro.</p>
        <form onSubmit={addTransaction}>
          <fieldset disabled={busy} className="form-grid">
            <legend className="sr-only">Dados da operação simulada</legend>
            <label>Operação<select value={type} onChange={e => setType(e.target.value as EventType)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Data (UTC)<input type="date" name="date" required defaultValue={report.asOf} /></label>
            <label>Conta de origem<select value={account.id} onChange={e => setAccountId(e.target.value)}>{simulation.accounts.map(a => <option value={a.id} key={a.id}>{a.name} · {a.currency}</option>)}</select></label>
            {needsSecurity && <label>Ativo ({account.currency})<select name="security" required key={account.id}>{simulation.securities.filter(s => s.currency === account.currency).map(s => <option key={s.id} value={s.id}>{s.symbol}</option>)}</select></label>}
            {trade ? <><label>Quantidade (até 6 casas)<input name="quantity" inputMode="decimal" placeholder="Ex.: 1,5" required /></label><label>Preço unitário ({account.currency})<input name="price" inputMode="decimal" required /></label></> : type !== 'split' && <label>Valor bruto ({account.currency})<input name="amount" inputMode="decimal" required /></label>}
            {hasTarget && <label>Conta de destino<select key={`${type}-${account.id}`} name="target" required>{targets.map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>}
            {type === 'split' && <><label>Novas unidades<input name="numerator" inputMode="numeric" defaultValue="2" required /></label><label>Unidades antigas<input name="denominator" inputMode="numeric" defaultValue="1" required /></label></>}
            {type !== 'fee' && type !== 'split' && <><label>Taxas ({account.currency})<input name="fee" inputMode="decimal" defaultValue="0" required /></label><label>Tributos informados ({account.currency})<input name="tax" inputMode="decimal" defaultValue="0" required /></label></>}
            <label>USD/BRL na operação (até 6 casas)<input name="fx" inputMode="decimal" defaultValue="5,00" required /></label>
            {sourceLabel}
            <p className="helper wide">Câmbio: reais por US$ 1 na data da operação. Taxas e tributos são sempre na moeda da conta de origem. Desdobramentos preservam o custo e não movimentam caixa. Transferências são somente de caixa.</p>
            <button type="submit" className="button form-submit">Registrar no cenário</button>
          </fieldset>
        </form>
        <details><summary>Cadastrar outro ativo simulado</summary><form onSubmit={addSecurity}><fieldset disabled={busy} className="form-grid"><legend className="sr-only">Novo ativo</legend><label>Símbolo<input name="symbol" required maxLength={30} /></label><label>Nome fictício<input name="name" required maxLength={180} /></label><label>Moeda<select name="currency"><option>BRL</option><option>USD</option></select></label><button type="submit">Adicionar ativo</button></fieldset></form></details>
      </section>
      <section id="risco" className="lab-panel">
        <div className="section-title"><div><p className="eyebrow">RISK GUARDIAN</p><h2>Riscos e limites do cenário</h2></div><span>Alertas de concentração, sem avaliação de suitability</span></div>
        <ul className="alerts">{report.alerts.length ? report.alerts.map(alert => <li key={alert}>{alert}</li>) : <li>Nenhum alerta pelos limites definidos. Isso não significa ausência de risco.</li>}</ul>
        <form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void apply({ ...simulation, portfolio: { ...simulation.portfolio, name: field(form, 'name'), assetLimitBps: Number(field(form, 'assetLimit')), usdLimitBps: Number(field(form, 'usdLimit')) } }, asOf, 'Limites do cenário atualizados.'); }}>
          <fieldset disabled={busy} className="form-grid"><legend className="sr-only">Configurar carteira e limites</legend><label>Nome da carteira<input name="name" defaultValue={simulation.portfolio.name} key={simulation.portfolio.name} required maxLength={180} /></label><label>Limite por ativo (pontos-base)<input name="assetLimit" type="number" min="1" max="10000" step="1" defaultValue={simulation.portfolio.assetLimitBps} key={`asset-${simulation.portfolio.assetLimitBps}`} required /></label><label>Limite USD (pontos-base)<input name="usdLimit" type="number" min="1" max="10000" step="1" defaultValue={simulation.portfolio.usdLimitBps} key={`usd-${simulation.portfolio.usdLimitBps}`} required /></label><button type="submit">Salvar limites</button></fieldset>
        </form>
        <p className="helper">100 pontos-base = 1%. Limites iniciais: 40% por ativo e 50% em USD. Exposição inclui caixa em dólar e não representa a composição geográfica interna dos ETFs. Sem volatilidade, drawdown ou análise de crédito nesta fase.</p>
      </section>
      <section id="fontes" className="lab-panel">
        <div className="section-title"><div><p className="eyebrow">REFERÊNCIAS MANUAIS</p><h2>Preços e câmbio de avaliação</h2></div><span>Todos os registros são simulados · 00:00 UTC</span></div>
        <p className="helper">A avaliação usa a referência mais recente até a data escolhida. Mais de 7 dias corridos gera aviso de defasagem. Sem referência, o total fica indisponível. Registrar na mesma data substitui a referência do cenário.</p>
        <div className="quote-forms">
          <form onSubmit={e => void addQuote(e)}><fieldset disabled={busy} className="form-grid"><legend>Preço simulado por ativo</legend><label>Ativo<select name="security" required>{simulation.securities.map(s => <option key={s.id} value={s.id}>{s.symbol} · {s.currency}</option>)}</select></label><label>Data (UTC)<input type="date" name="date" defaultValue={report.asOf} required /></label><label>Preço na moeda do ativo<input name="price" inputMode="decimal" required /></label>{sourceLabel}<button type="submit">Registrar preço</button></fieldset></form>
          <form onSubmit={e => void addQuote(e, true)}><fieldset disabled={busy} className="form-grid"><legend>Câmbio simulado de avaliação</legend><label>USD/BRL<input name="rate" inputMode="decimal" required placeholder="Ex.: 5,20" /></label><label>Data (UTC)<input type="date" name="date" defaultValue={report.asOf} required /></label>{sourceLabel}<button type="submit">Registrar câmbio</button></fieldset></form>
        </div>
        <div className="table-scroll"><table><caption>Referências utilizadas na avaliação de {day(report.asOf)} · SIMULADAS</caption><thead><tr><th>Referência</th><th>Valor / moeda</th><th>Data UTC</th><th>Fonte</th><th>Estado</th></tr></thead><tbody>
          {report.holdings.map(h => <tr key={`quote-${h.accountId}-${h.securityId}`}><td>{h.symbol}</td><td>{h.quote ? money(priceMinor(h.quote.price), h.currency) : 'Ausente'}</td><td>{h.quote ? `${day(h.quote.date)} · 00:00` : '—'}</td><td>{h.quote?.source ?? '—'}</td><td>{h.stale ? 'SIMULADO · ausente/defasado' : 'SIMULADO'}</td></tr>)}
          <tr><td>USD/BRL</td><td>{report.fx ? `${report.fx.rate} BRL / USD` : 'Ausente'}</td><td>{report.fx ? `${day(report.fx.date)} · 00:00` : '—'}</td><td>{report.fx?.source ?? '—'}</td><td>SIMULADO{report.fx && Date.parse(report.asOf) - Date.parse(report.fx.date) > 7 * 86400000 ? ' · defasado' : ''}</td></tr>
        </tbody></table></div>
      </section>
      <section id="historico" className="lab-panel">
        <div className="section-title"><div><p className="eyebrow">TRILHA REPRODUZÍVEL</p><h2>Histórico de operações</h2></div><span>{simulation.transactions.length} eventos · ordem cronológica, depois cadastro</span></div>
        <p className="helper">Exclusões são revalidadas: remover um aporte que financia compras será bloqueado. Este histórico é editável e não substitui uma trilha de auditoria imutável.</p>
        <div className="table-scroll"><table><caption className="sr-only">Todos os eventos, inclusive posteriores à avaliação</caption><thead><tr><th>Data / ID</th><th>Operação / conta</th><th>Valor ou quantidade × preço</th><th>Taxas / tributos</th><th>Câmbio / fonte</th><th>Registro UTC</th><th>Ação</th></tr></thead><tbody>
          {[...simulation.transactions].sort((a, b) => a.date.localeCompare(b.date)).map(tx => {
            const currency = simulation.accounts.find(a => a.id === tx.accountId)!.currency;
            const details = tx.type === 'buy' || tx.type === 'sell' ? `${tx.quantity} × ${tx.unitPrice} ${currency}` : tx.type === 'split' ? `${tx.numerator}:${tx.denominator}` : `${tx.amount} ${currency}`;
            return <tr key={tx.id} className={tx.date > report.asOf ? 'future-row' : ''}><td>{day(tx.date)}<small>{tx.id}</small></td><td>{labels[tx.type]}<small>{simulation.accounts.find(a => a.id === tx.accountId)?.name}{tx.securityId ? ` · ${simulation.securities.find(s => s.id === tx.securityId)?.symbol}` : ''}{tx.targetAccountId ? ` → ${simulation.accounts.find(a => a.id === tx.targetAccountId)?.name}` : ''}</small></td><td>{details}{tx.date > report.asOf && <small>Após a data de avaliação</small>}</td><td>{tx.fee} / {tx.tax} {currency}</td><td>{tx.fx.rate} BRL/USD<small>{tx.fx.source} · {day(tx.fx.date)}</small><small>Operação: {tx.provenance.source}</small></td><td>{tx.provenance.recordedAt}</td><td><button className="danger-link" disabled={busy} onClick={() => void apply({ ...simulation, transactions: simulation.transactions.filter(t => t.id !== tx.id) }, asOf, 'Evento removido; cenário reconciliado.')} aria-label={`Excluir operação ${tx.id}`}>Excluir</button></td></tr>;
          })}
          {!simulation.transactions.length && <tr><td colSpan={7}>Nenhum evento cadastrado.</td></tr>}
        </tbody></table></div>
        <details><summary>Conferir movimentos de caixa ({report.cashflows.length})</summary><div className="table-scroll"><table><thead><tr><th>Data</th><th>Conta</th><th>Evento</th><th>Movimento líquido</th><th>Categoria</th></tr></thead><tbody>{report.cashflows.map((flow, index) => <tr key={`${flow.transactionId}-${index}`}><td>{day(flow.date)}</td><td>{simulation.accounts.find(a => a.id === flow.accountId)?.name}</td><td>{flow.transactionId}</td><td>{money(flow.minor, flow.currency)}</td><td>{flow.category}</td></tr>)}</tbody></table></div></details>
      </section>
      <footer>AIKON Invest Lab <span>Simulação educativa · sem recomendação de compra ou venda</span></footer>
    </main>
  </div>;
}
