import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, decimal } from '../dist/lib/ledger.js';
import { demo, DEMO_DATE } from '../dist/lib/demo.js';

const date = '2026-10-01';
function base() {
  const scenario = structuredClone(demo);
  scenario.transactions = [];
  scenario.prices = scenario.prices.map(q => ({ ...q, date, price: q.securityId === 'voo' ? '420' : '25' }));
  scenario.fxQuotes = [{ date, rate: '5.20', source: 'Test fixture, simulated' }];
  return scenario;
}
let sequence = 0;
function tx(type, values = {}) {
  const date = values.date ?? '2026-10-01';
  return { id: `test-${++sequence}`, date, accountId: 'brl', type, amount: '0', fee: '0', tax: '0', fx: { date, rate: '5', source: 'Test fixture, simulated' }, provenance: { source: 'Synthetic test', recordedAt: '2026-10-29T00:00:00Z' }, ...values };
}
function report(transactions, modify = () => {}, asOf = date) {
  const scenario = base(); scenario.transactions = transactions; modify(scenario);
  return evaluate(scenario, asOf).report;
}
const deposit = (amount = '1000', accountId = 'brl') => tx('deposit', { amount, accountId });
const buy = (values = {}) => tx('buy', { securityId: 'petr4', quantity: '10', unitPrice: '20', fee: '2', tax: '1', ...values });

test('reconcile deposit, buy, partial sell, fees, tax and remaining average cost', () => {
  const r = report([deposit(), buy(), tx('sell', { securityId: 'petr4', quantity: '4', unitPrice: '30', fee: '1', tax: '1' })]);
  assert.equal(r.accounts[0].cashMinor, '91500');
  assert.equal(r.holdings[0].quantity, '6.000000');
  assert.equal(r.holdings[0].costMinor, '12180');
  assert.equal(r.totalBrlMinor, '106500');
  assert.equal(r.netContributionsBrlMinor, '100000');
  assert.equal(r.resultBrlMinor, '6500');
  assert.equal(r.realizedBrlMinor, '3680');
  assert.equal(r.holdings[0].unrealizedBrlMinor, '2820');
  assert.equal(r.feesBrlMinor, '300'); assert.equal(r.taxesBrlMinor, '200');
  for (const account of r.accounts) assert.equal(r.cashflows.filter(f => f.accountId === account.id).reduce((sum, f) => sum + BigInt(f.minor), 0n).toString(), account.cashMinor);
});

test('complete sale removes entire basis without residual rounding', () => {
  const r = report([deposit(), buy(), tx('sell', { securityId: 'petr4', quantity: '3', unitPrice: '25' }), tx('sell', { securityId: 'petr4', quantity: '7', unitPrice: '25' })]);
  assert.equal(r.holdings.length, 0); assert.equal(r.realizedBrlMinor, '4700'); assert.equal(r.resultBrlMinor, '4700');
});

test('fractional USD quantity retains historical FX basis and current FX valuation', () => {
  const r = report([deposit('100', 'usd'), buy({ accountId: 'usd', securityId: 'voo', quantity: '0.125', unitPrice: '400', fee: '0.01', tax: '0' })]);
  assert.equal(r.accounts[2].cashMinor, '4999'); assert.equal(r.holdings[0].quantity, '0.125000');
  assert.equal(r.holdings[0].costBrlMinor, '25005'); assert.equal(r.holdings[0].valueBrlMinor, '27300');
  assert.equal(r.totalBrlMinor, '53295'); assert.equal(r.netContributionsBrlMinor, '50000'); assert.equal(r.resultBrlMinor, '3295');
  assert.equal(r.usdExposureBps, '10000');
});

test('FX exchange is internal and only fees plus revaluation affect result', () => {
  const r = report([deposit(), tx('exchange', { amount: '500', targetAccountId: 'usd', fee: '2' })]);
  assert.equal(r.accounts[0].cashMinor, '49800'); assert.equal(r.accounts[2].cashMinor, '10000');
  assert.equal(r.netContributionsBrlMinor, '100000'); assert.equal(r.totalBrlMinor, '101800'); assert.equal(r.resultBrlMinor, '1800');
});

test('USD to BRL exchange uses transaction FX, with fees in source currency', () => {
  const r = report([deposit('100', 'usd'), tx('exchange', { accountId: 'usd', amount: '50', fee: '1', targetAccountId: 'brl' })]);
  assert.equal(r.accounts[0].cashMinor, '25000'); assert.equal(r.accounts[2].cashMinor, '4900');
  assert.equal(r.feesBrlMinor, '500'); assert.equal(r.netContributionsBrlMinor, '50000');
});

test('cash transfer reconciles both legs and does not count as a contribution', () => {
  const r = report([deposit(), tx('transfer', { amount: '500', fee: '2', targetAccountId: 'reserve' })]);
  assert.equal(r.accounts[0].cashMinor, '49800'); assert.equal(r.accounts[1].cashMinor, '50000');
  assert.equal(r.resultBrlMinor, '-200'); assert.equal(r.netContributionsBrlMinor, '100000');
});

test('withdrawals reduce contributions, not investment result; costs remain expenses', () => {
  const r = report([deposit(), tx('withdrawal', { amount: '100', fee: '2' })]);
  assert.equal(r.netContributionsBrlMinor, '90000'); assert.equal(r.totalBrlMinor, '89800'); assert.equal(r.resultBrlMinor, '-200');
});

test('fees and taxes on incoming deposits reduce cash, not gross contributions', () => {
  const r = report([tx('deposit', { amount: '100', fee: '2', tax: '1' })]);
  assert.equal(r.totalBrlMinor, '9700'); assert.equal(r.netContributionsBrlMinor, '10000'); assert.equal(r.resultBrlMinor, '-300');
});

test('dividend net income and standalone fees do not become deposits', () => {
  const r = report([deposit(), tx('dividend', { amount: '10', securityId: 'petr4', fee: '1', tax: '2' }), tx('fee', { amount: '3' })]);
  assert.equal(r.resultBrlMinor, '400'); assert.equal(r.netContributionsBrlMinor, '100000'); assert.equal(r.feesBrlMinor, '400');
});

test('split and reverse split preserve basis and support fractional quantities', () => {
  const r = report([deposit(), buy(), tx('split', { securityId: 'petr4', numerator: '3', denominator: '2' })]);
  assert.equal(r.holdings[0].quantity, '15.000000'); assert.equal(r.holdings[0].costMinor, '20300');
  const reverse = report([deposit(), buy(), tx('split', { securityId: 'petr4', numerator: '1', denominator: '4' })]);
  assert.equal(reverse.holdings[0].quantity, '2.500000');
});

test('split rejects precision loss and an absent position', () => {
  assert.throws(() => report([tx('split', { securityId: 'petr4', numerator: '2', denominator: '1' })]), /posição existente/);
  assert.throws(() => report([deposit(), buy({ quantity: '0.000001', unitPrice: '100000', fee: '0', tax: '0' }), tx('split', { securityId: 'petr4', numerator: '1', denominator: '3' })]), /seis casas/);
});

test('valuation as of date excludes later events and never uses future prices', () => {
  const events = [deposit(), buy(), tx('deposit', { amount: '100', date: '2026-10-02', fx: { date: '2026-10-02', rate: '5', source: 'Synthetic' } })];
  const r = report(events, s => { s.prices.push({ ...s.prices[0], id: 'future-price', date: '2026-10-02', price: '900' }); });
  assert.equal(r.appliedTransactions, 2); assert.equal(r.holdings[0].valueMinor, '25000'); assert.equal(r.totalBrlMinor, '104700');
  const scenario = base(); scenario.transactions = events;
  assert.equal(evaluate(scenario, date).simulation.transactions.length, 3);
});

test('invalid future entries are rejected even when evaluating the past', () => {
  assert.throws(() => report([deposit(), tx('withdrawal', { amount: '2000', date: '2026-10-02', fx: { date: '2026-10-02', rate: '5', source: 'Synthetic' } })]), /saldo insuficiente/);
});

test('empty historical snapshot is zero without contamination from future holdings', () => {
  const r = report([deposit(), buy()], () => {}, '2026-09-30');
  assert.equal(r.totalBrlMinor, '0'); assert.equal(r.resultBrlMinor, '0'); assert.equal(r.holdings.length, 0); assert.equal(r.appliedTransactions, 0);
});

test('missing price or FX makes total and result unavailable instead of silently partial', () => {
  const missingPrice = report([deposit(), buy()], s => { s.prices = []; });
  assert.equal(missingPrice.complete, false); assert.equal(missingPrice.totalBrlMinor, null); assert.equal(missingPrice.resultBrlMinor, null);
  const missingFx = report([deposit('100', 'usd')], s => { s.fxQuotes = []; });
  assert.equal(missingFx.totalBrlMinor, null); assert.match(missingFx.alerts.join(' '), /Sem câmbio/);
});

test('staleness uses the chosen as-of date, not the host clock', () => {
  const r = report([deposit(), buy()], () => {}, '2026-10-09');
  assert.equal(r.complete, true); assert.equal(r.holdings[0].stale, true); assert.match(r.alerts.join(' '), /7 dias corridos/);
});

test('concentration aggregates the same asset across accounts and has strict thresholds', () => {
  const r = report([deposit('500'), deposit('500', 'reserve'), buy({ quantity: '30', unitPrice: '10', fee: '0', tax: '0' }), buy({ accountId: 'reserve', quantity: '30', unitPrice: '10', fee: '0', tax: '0' })], s => { s.prices[0].price = '10'; });
  assert.equal(r.totalBrlMinor, '100000'); assert.match(r.alerts.join(' '), /Concentração em PETR4/);
  const edge = report([deposit(), buy({ quantity: '16', unitPrice: '25', fee: '0', tax: '0' })]);
  assert.equal(edge.alerts.some(a => a.includes('Concentração')), false);
});

test('cash in USD is included in FX concentration even without equities', () => {
  const r = report([deposit('100', 'usd')]);
  assert.equal(r.usdExposureBps, '10000'); assert.match(r.alerts.join(' '), /Exposição USD/);
});

test('reject insufficient cash, overselling and mismatched account currency', () => {
  assert.throws(() => report([buy()]), /saldo insuficiente/);
  assert.throws(() => report([deposit(), buy(), tx('sell', { securityId: 'petr4', quantity: '11', unitPrice: '25' })]), /quantidade insuficiente/);
  assert.throws(() => report([deposit('1000', 'usd'), buy({ accountId: 'usd' })]), /mesma moeda/);
});

test('same-day operation ordering is explicit and deterministic', () => {
  assert.throws(() => report([buy(), deposit()]), /saldo insuficiente/);
  const events = [deposit(), buy()];
  assert.deepEqual(report(events), report(structuredClone(events)));
});

test('reject duplicate transaction IDs, duplicate quote dates and orphan imports', () => {
  const entry = deposit(); assert.throws(() => report([entry, entry]), /IDs duplicados/);
  assert.throws(() => report([], s => s.prices.push({ ...s.prices[0], id: 'duplicate' })), /Já existe cotação/);
  assert.throws(() => report([tx('deposit', { amount: '100', provenance: { source: 'Synthetic', recordedAt: '2026-10-01T00:00:00Z', importBatchId: 'missing' } })]), /Lote/);
});

test('reject negative amounts, invalid dates, invalid FX and excessive precision', () => {
  assert.throws(() => report([deposit('-1')]), /Número inválido/);
  assert.throws(() => report([deposit('0')]), /positivo/);
  assert.throws(() => report([buy({ date: '2026-02-30' })]), /Data inexistente/);
  assert.throws(() => report([tx('deposit', { amount: '1', fx: { date, rate: '0', source: 'Synthetic' } })]), /positivo/);
  assert.throws(() => report([deposit('1.001')]), /casas decimais/);
  assert.throws(() => report([buy({ quantity: '0.0000001' })]), /casas decimais/);
  assert.throws(() => report([tx('deposit', { amount: '1', fx: { date: '2026-10-02', rate: '5', source: 'Synthetic' } })]), /mesma data/);
  assert.throws(() => decimal('1e4', 2));
});

test('reject incompatible transfer, self-transfer and expense overload', () => {
  assert.throws(() => report([deposit(), tx('transfer', { amount: '1', targetAccountId: 'usd' })]), /mesma moeda/);
  assert.throws(() => report([deposit(), tx('transfer', { amount: '1', targetAccountId: 'brl' })]), /diferente/);
  assert.throws(() => report([deposit(), tx('dividend', { amount: '1', securityId: 'petr4', fee: '2' })]), /superam/);
  assert.throws(() => report([deposit(), tx('fee', { amount: '1', fee: '2' })]), /somente/);
});

test('reject malformed snapshots and unsafe ownership references', () => {
  assert.throws(() => evaluate(null, date)); assert.throws(() => evaluate({}, date));
  assert.throws(() => report([], s => { s.accounts[0].portfolioId = 'other'; }), /fora da carteira/);
  assert.throws(() => report([], s => { s.portfolio.userId = 'other'; }), /não pertence/);
  assert.throws(() => report([], s => { s.securities.push({ ...s.securities[0], id: 'another-id', symbol: 'petr4' }); }), /Símbolo duplicado/);
});

test('money above Number safe range is exact through full ledger replay', () => {
  const r = report([deposit('999999999999999.99'), tx('fee', { amount: '0.01' })]);
  assert.equal(r.totalBrlMinor, '99999999999999998'); assert.equal(r.resultBrlMinor, '-1');
});

test('demo snapshot roundtrip is reproducible and has reconciled expected totals', () => {
  const r = evaluate(demo, DEMO_DATE).report;
  assert.deepEqual(r, evaluate(JSON.parse(JSON.stringify(demo)), DEMO_DATE).report);
  assert.equal(r.netContributionsBrlMinor, '2500000');
  // BRL cash 1,321,000 + reserve 100,000 + USD 499 at 5.20 + holdings BRL 280,000 + 315,000 + USD 630 at 5.20.
  assert.equal(r.accounts[0].cashMinor, '1321000');
  assert.equal(r.totalBrlMinor, '2603080');
  assert.equal(r.resultBrlMinor, '103080');
});
