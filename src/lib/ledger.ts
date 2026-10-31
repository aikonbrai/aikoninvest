import { allocationBasisPoints, usdToBrl, type Currency } from './financial.ts';

export type EventType = 'deposit' | 'withdrawal' | 'buy' | 'sell' | 'dividend' | 'fee' | 'split' | 'transfer' | 'exchange';
export type Provenance = { source: string; recordedAt: string; importBatchId?: string };
export type FxObservation = { date: string; rate: string; source: string };
export type Security = { id: string; symbol: string; name: string; currency: Currency };
export type Account = { id: string; name: string; currency: Currency; portfolioId: string };
export type Transaction = {
  id: string; date: string; type: EventType; accountId: string; provenance: Provenance;
  fx: FxObservation; amount: string; fee: string; tax: string;
  securityId?: string; quantity?: string; unitPrice?: string;
  targetAccountId?: string; numerator?: string; denominator?: string;
};
export type PriceQuote = { id: string; securityId: string; currency: Currency; date: string; price: string; source: string };
export type Simulation = {
  version: 1;
  user: { id: string; kind: 'simulation' };
  portfolio: { id: string; userId: string; name: string; assetLimitBps: number; usdLimitBps: number };
  accounts: Account[]; securities: Security[]; transactions: Transaction[];
  prices: PriceQuote[]; fxQuotes: FxObservation[];
  importBatches: { id: string; source: string; recordedAt: string }[];
};
export type Cashflow = { transactionId: string; accountId: string; currency: Currency; date: string; minor: string; category: string };
export type Holding = {
  accountId: string; securityId: string; symbol: string; currency: Currency; quantity: string;
  costMinor: string; costBrlMinor: string; valueMinor: string | null; valueBrlMinor: string | null;
  unrealizedBrlMinor: string | null; quote: PriceQuote | null; stale: boolean;
};
export type Report = {
  asOf: string; complete: boolean; totalBrlMinor: string | null; netContributionsBrlMinor: string;
  resultBrlMinor: string | null; feesBrlMinor: string; taxesBrlMinor: string; realizedBrlMinor: string;
  usdExposureBps: string | null; accounts: { id: string; name: string; currency: Currency; cashMinor: string }[];
  holdings: Holding[]; cashflows: Cashflow[]; alerts: string[]; fx: FxObservation | null;
  appliedTransactions: number;
};

const SCALE = 1_000_000n;
const TYPES: EventType[] = ['deposit', 'withdrawal', 'buy', 'sell', 'dividend', 'fee', 'split', 'transfer', 'exchange'];

export class LedgerError extends Error {}
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new LedgerError(message);
}
export function decimal(value: string, places: number): bigint {
  check(typeof value === 'string' && value.length <= 24 && new RegExp(`^\\d{1,15}(?:\\.\\d{1,${places}})?$`).test(value), `Número inválido; use até ${places} casas decimais e ponto decimal.`);
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, '0'));
}
export function quantityText(value: bigint): string {
  return `${value / SCALE}.${(value % SCALE).toString().padStart(6, '0')}`;
}
function round(numerator: bigint, denominator: bigint): bigint {
  check(denominator > 0n && numerator >= 0n, 'Arredondamento inválido.');
  return (numerator + denominator / 2n) / denominator;
}
function date(value: string): string {
  check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Data deve estar no formato AAAA-MM-DD.');
  check(Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Data inexistente.');
  return value;
}
function object(value: unknown): Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'Registro inválido.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  check(typeof value === 'string' && value.trim().length > 0 && value.length <= 180, 'Texto obrigatório ou longo demais.');
  return value;
}
function money(value: unknown): string { const result = text(value); decimal(result, 2); return result; }
function list(value: unknown, max = 2000): unknown[] {
  check(Array.isArray(value) && value.length <= max, `Lista inválida ou acima de ${max} itens.`);
  return value;
}
function currency(value: unknown): Currency { check(value === 'BRL' || value === 'USD', 'Moeda não suportada.'); return value; }
function timestamp(value: unknown): string {
  const result = text(value);
  check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(result) && Number.isFinite(Date.parse(result)), 'Horário de registro inválido.');
  date(result.slice(0, 10));
  return result;
}
function fxObservation(value: unknown): FxObservation {
  const item = object(value), rate = text(item.rate);
  check(decimal(rate, 6) > 0n, 'Câmbio deve ser positivo.');
  return { date: date(text(item.date)), rate, source: text(item.source) };
}
function unique(items: { id: string }[], description: string) {
  check(new Set(items.map(item => item.id)).size === items.length, `IDs duplicados: ${description}.`);
}

/** Parse untrusted snapshots on the server. Unknown fields are discarded. No personal identity accepted. */
export function parseSimulation(input: unknown): Simulation {
  const data = object(input), user = object(data.user), portfolio = object(data.portfolio);
  check(data.version === 1 && user.kind === 'simulation', 'Somente snapshots simulados versão 1 são aceitos.');
  const threshold = (value: unknown) => {
    check(typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10000, 'Limite deve estar entre 1 e 10000 pontos-base.');
    return value;
  };
  const simulation: Simulation = {
    version: 1, user: { id: text(user.id), kind: 'simulation' },
    portfolio: { id: text(portfolio.id), userId: text(portfolio.userId), name: text(portfolio.name), assetLimitBps: threshold(portfolio.assetLimitBps), usdLimitBps: threshold(portfolio.usdLimitBps) },
    accounts: list(data.accounts, 20).map(raw => {
      const item = object(raw);
      return { id: text(item.id), name: text(item.name), currency: currency(item.currency), portfolioId: text(item.portfolioId) };
    }),
    securities: list(data.securities, 100).map(raw => {
      const item = object(raw);
      return { id: text(item.id), symbol: text(item.symbol).toUpperCase(), name: text(item.name), currency: currency(item.currency) };
    }),
    transactions: list(data.transactions).map(raw => {
      const item = object(raw), provenance = object(item.provenance);
      const type = text(item.type) as EventType;
      check(TYPES.includes(type), 'Tipo de operação não suportado.');
      const transaction: Transaction = {
        id: text(item.id), date: date(text(item.date)), type, accountId: text(item.accountId),
        fx: fxObservation(item.fx), amount: money(item.amount), fee: money(item.fee), tax: money(item.tax),
        provenance: { source: text(provenance.source), recordedAt: timestamp(provenance.recordedAt) },
      };
      if (provenance.importBatchId !== undefined) transaction.provenance.importBatchId = text(provenance.importBatchId);
      if (item.securityId !== undefined) transaction.securityId = text(item.securityId);
      if (item.targetAccountId !== undefined) transaction.targetAccountId = text(item.targetAccountId);
      if (item.quantity !== undefined) { transaction.quantity = text(item.quantity); check(decimal(transaction.quantity, 6) > 0n, 'Quantidade deve ser positiva.'); }
      if (item.unitPrice !== undefined) { transaction.unitPrice = money(item.unitPrice); check(decimal(transaction.unitPrice, 2) > 0n, 'Preço deve ser positivo.'); }
      for (const key of ['numerator', 'denominator'] as const) {
        if (item[key] !== undefined) {
          const ratio = text(item[key]);
          check(/^[1-9]\d{0,5}$/.test(ratio), 'Proporção deve ser um inteiro positivo de até seis dígitos.');
          transaction[key] = ratio;
        }
      }
      return transaction;
    }),
    prices: list(data.prices).map(raw => {
      const item = object(raw), price = money(item.price);
      check(decimal(price, 2) > 0n, 'Cotação deve ser positiva.');
      return { id: text(item.id), securityId: text(item.securityId), currency: currency(item.currency), date: date(text(item.date)), price, source: text(item.source) };
    }),
    fxQuotes: list(data.fxQuotes).map(fxObservation),
    importBatches: list(data.importBatches).map(raw => {
      const item = object(raw);
      return { id: text(item.id), source: text(item.source), recordedAt: timestamp(item.recordedAt) };
    }),
  };
  check(simulation.portfolio.userId === simulation.user.id, 'Carteira não pertence ao usuário simulado.');
  for (const [items, name] of [[simulation.accounts, 'contas'], [simulation.securities, 'ativos'], [simulation.transactions, 'operações'], [simulation.prices, 'preços'], [simulation.importBatches, 'lotes']] as const) unique(items, name);
  check(simulation.accounts.length > 0, 'Informe ao menos uma conta.');
  const accounts = new Map(simulation.accounts.map(a => [a.id, a]));
  const securities = new Map(simulation.securities.map(s => [s.id, s]));
  const symbols = simulation.securities.map(s => JSON.stringify([s.symbol, s.currency]));
  check(new Set(symbols).size === symbols.length, 'Símbolo duplicado na mesma moeda.');
  for (const account of simulation.accounts) check(account.portfolioId === simulation.portfolio.id, 'Conta fora da carteira.');
  for (const quote of simulation.prices) check(securities.get(quote.securityId)?.currency === quote.currency, 'Cotação incompatível com o ativo.');
  const quoteKeys = simulation.prices.map(q => JSON.stringify([q.securityId, q.date]));
  check(new Set(quoteKeys).size === quoteKeys.length, 'Já existe cotação para esse ativo nessa data.');
  check(new Set(simulation.fxQuotes.map(q => q.date)).size === simulation.fxQuotes.length, 'Já existe câmbio de avaliação nessa data.');
  for (const tx of simulation.transactions) {
    check(accounts.has(tx.accountId), 'Conta da operação inexistente.');
    check(tx.fx.date === tx.date, 'Câmbio da operação deve ter a mesma data da operação.');
    if (tx.provenance.importBatchId) check(simulation.importBatches.some(b => b.id === tx.provenance.importBatchId), 'Lote de importação inexistente.');
    const trade = tx.type === 'buy' || tx.type === 'sell';
    const split = tx.type === 'split';
    if (trade || split || tx.type === 'dividend') {
      check(tx.securityId && securities.has(tx.securityId), 'Ativo obrigatório e deve existir.');
      check(securities.get(tx.securityId)?.currency === accounts.get(tx.accountId)?.currency, 'Ativo e conta devem ter a mesma moeda.');
    } else check(tx.securityId === undefined, 'Este tipo de evento não recebe ativo.');
    if (trade) {
      check(tx.quantity && tx.unitPrice, 'Quantidade e preço são obrigatórios.');
      check(decimal(tx.amount, 2) === 0n, 'Compras/vendas usam quantidade × preço; valor deve ser zero.');
    } else check(tx.quantity === undefined && tx.unitPrice === undefined, 'Quantidade/preço não aplicáveis ao evento.');
    if (split) {
      check(tx.numerator && tx.denominator, 'Informe numerador e denominador do desdobramento.');
      check(decimal(tx.amount, 2) + decimal(tx.fee, 2) + decimal(tx.tax, 2) === 0n, 'Desdobramento não movimenta dinheiro.');
    } else check(tx.numerator === undefined && tx.denominator === undefined, 'Proporção só se aplica a desdobramento.');
    const transfer = tx.type === 'transfer' || tx.type === 'exchange';
    if (transfer) {
      const target = accounts.get(tx.targetAccountId ?? '');
      check(target && target.id !== tx.accountId, 'Conta destino deve existir e ser diferente.');
      check((target.currency === accounts.get(tx.accountId)?.currency) === (tx.type === 'transfer'), 'Transferência exige mesma moeda; câmbio exige moedas diferentes.');
    } else check(tx.targetAccountId === undefined, 'Conta destino não aplicável.');
    if (!trade && !split) check(decimal(tx.amount, 2) > 0n, 'Valor deve ser positivo.');
    if (tx.type === 'fee') check(decimal(tx.fee, 2) + decimal(tx.tax, 2) === 0n, 'Evento de taxa usa somente o campo valor.');
  }
  return simulation;
}

/** Replay in UTC date order; original array order is the tie-breaker within a day. */
export function evaluate(input: unknown, asOfInput: string): { simulation: Simulation; report: Report } {
  const simulation = parseSimulation(input), asOf = date(asOfInput);
  const accounts = new Map(simulation.accounts.map(a => [a.id, a]));
  const securities = new Map(simulation.securities.map(s => [s.id, s]));
  const cash = new Map(simulation.accounts.map(a => [a.id, 0n]));
  const lots = new Map<string, { accountId: string; securityId: string; quantity: bigint; cost: bigint; costBrl: bigint }>();
  const cashflows: Cashflow[] = [];
  let contributions = 0n, fees = 0n, taxes = 0n, realized = 0n, applied = 0;
  const transactions = [...simulation.transactions].sort((a, b) => a.date.localeCompare(b.date));
  // Validate later events too, then replay only the requested prefix for historical valuation.
  if (transactions.some(tx => tx.date > asOf)) evaluate(simulation, transactions[transactions.length - 1].date);
  for (const tx of transactions.filter(tx => tx.date <= asOf)) {
    const included = tx.date <= asOf;
    const account = accounts.get(tx.accountId)!;
    const amount = decimal(tx.amount, 2), fee = decimal(tx.fee, 2), tax = decimal(tx.tax, 2);
    const fx = decimal(tx.fx.rate, 6);
    const brl = (value: bigint) => account.currency === 'BRL' ? value : usdToBrl(value, fx);
    const move = (accountId: string, delta: bigint, category: string) => {
      const balance = cash.get(accountId)! + delta;
      check(balance >= 0n, `Operação ${tx.id}: saldo insuficiente na conta ${accounts.get(accountId)!.name}.`);
      cash.set(accountId, balance);
      if (included) cashflows.push({ transactionId: tx.id, accountId, currency: accounts.get(accountId)!.currency, date: tx.date, minor: delta.toString(), category });
    };
    const key = JSON.stringify([tx.accountId, tx.securityId]);
    if (tx.type === 'buy' || tx.type === 'sell') {
      const quantity = decimal(tx.quantity!, 6), gross = round(quantity * decimal(tx.unitPrice!, 2), SCALE);
      check(gross > 0n, 'Operação abaixo de um centavo.');
      const lot = lots.get(key) ?? { accountId: tx.accountId, securityId: tx.securityId!, quantity: 0n, cost: 0n, costBrl: 0n };
      if (tx.type === 'buy') {
        move(account.id, -gross - fee - tax, 'trade');
        lot.quantity += quantity; lot.cost += gross + fee + tax; lot.costBrl += brl(gross + fee + tax);
      } else {
        check(lot.quantity >= quantity, `Operação ${tx.id}: quantidade insuficiente para venda.`);
        check(gross >= fee + tax, 'Taxas e tributos superam o valor da venda.');
        const removed = round(lot.cost * quantity, lot.quantity), removedBrl = round(lot.costBrl * quantity, lot.quantity);
        move(account.id, gross - fee - tax, 'trade');
        if (included) realized += brl(gross - fee - tax) - removedBrl;
        lot.quantity -= quantity; lot.cost -= removed; lot.costBrl -= removedBrl;
      }
      lots.set(key, lot);
    } else if (tx.type === 'split') {
      const lot = lots.get(key);
      check(lot && lot.quantity > 0n, 'Desdobramento exige posição existente.');
      const numerator = BigInt(tx.numerator!), denominator = BigInt(tx.denominator!);
      check(lot.quantity * numerator % denominator === 0n, 'Desdobramento excede seis casas de quantidade; ajuste manual documentado necessário.');
      lot.quantity = lot.quantity * numerator / denominator;
    } else if (tx.type === 'transfer' || tx.type === 'exchange') {
      move(account.id, -amount - fee - tax, 'internal');
      const received = tx.type === 'transfer' ? amount : account.currency === 'USD' ? usdToBrl(amount, fx) : round(amount * SCALE, fx);
      check(received > 0n, 'Câmbio produz menos de um centavo na conta destino.');
      move(tx.targetAccountId!, received, 'internal');
    } else if (tx.type === 'deposit' || tx.type === 'dividend') {
      check(amount >= fee + tax, 'Taxas e tributos superam o recebimento.');
      move(account.id, amount - fee - tax, tx.type === 'deposit' ? 'external' : 'income');
      if (included && tx.type === 'deposit') contributions += brl(amount);
    } else if (tx.type === 'withdrawal') {
      move(account.id, -amount - fee - tax, 'external');
      if (included) contributions -= brl(amount);
    } else {
      move(account.id, -amount, 'expense');
      if (included) fees += brl(amount);
    }
    if (included) { fees += brl(fee); taxes += brl(tax); applied++; }
  }

  const fxQuote = [...simulation.fxQuotes].filter(q => q.date <= asOf).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const stale = (observed: string) => (Date.parse(asOf) - Date.parse(observed)) / 86400000 > 7;
  const convert = (value: bigint, currency: Currency): bigint | null => currency === 'BRL' ? value : fxQuote ? usdToBrl(value, decimal(fxQuote.rate, 6)) : value === 0n ? 0n : null;
  let complete = true, total = 0n, usdTotal = 0n;
  const alerts: string[] = [];
  const add = (value: bigint | null, currency: Currency) => {
    if (value === null) { complete = false; return; }
    total += value; if (currency === 'USD') usdTotal += value;
  };
  const accountReport = simulation.accounts.map(a => {
    const balance = cash.get(a.id)!;
    add(convert(balance, a.currency), a.currency);
    return { id: a.id, name: a.name, currency: a.currency, cashMinor: balance.toString() };
  });
  const assetValues = new Map<string, bigint>();
  const holdings: Holding[] = [...lots.values()].filter(lot => lot.quantity > 0n).map(lot => {
    const security = securities.get(lot.securityId)!;
    const quote = [...simulation.prices].filter(q => q.securityId === security.id && q.date <= asOf).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
    const value = quote ? round(lot.quantity * decimal(quote.price, 2), SCALE) : null;
    const valueBrl = value === null ? null : convert(value, security.currency);
    add(valueBrl, security.currency);
    if (valueBrl !== null) assetValues.set(security.id, (assetValues.get(security.id) ?? 0n) + valueBrl);
    if (!quote) alerts.push(`Sem preço até ${asOf} para ${security.symbol}; patrimônio e resultado indisponíveis.`);
    else if (stale(quote.date)) alerts.push(`Preço de ${security.symbol} tem mais de 7 dias corridos.`);
    return { accountId: lot.accountId, securityId: security.id, symbol: security.symbol, currency: security.currency, quantity: quantityText(lot.quantity), costMinor: lot.cost.toString(), costBrlMinor: lot.costBrl.toString(), valueMinor: value?.toString() ?? null, valueBrlMinor: valueBrl?.toString() ?? null, unrealizedBrlMinor: valueBrl === null ? null : (valueBrl - lot.costBrl).toString(), quote, stale: quote ? stale(quote.date) : true };
  });
  if (!fxQuote && (holdings.some(h => h.currency === 'USD') || accountReport.some(a => a.currency === 'USD' && a.cashMinor !== '0'))) alerts.push('Sem câmbio de avaliação até a data escolhida.');
  if (fxQuote && stale(fxQuote.date)) alerts.push('Câmbio de avaliação tem mais de 7 dias corridos.');
  const exposure = complete && total > 0n ? allocationBasisPoints(usdTotal, total) : null;
  if (complete && total > 0n) for (const [id, value] of assetValues) {
    if (value * 10000n > total * BigInt(simulation.portfolio.assetLimitBps)) alerts.push(`Concentração em ${securities.get(id)!.symbol} acima do limite de ${(simulation.portfolio.assetLimitBps / 100).toFixed(2)}%.`);
  }
  if (complete && total > 0n && usdTotal * 10000n > total * BigInt(simulation.portfolio.usdLimitBps)) alerts.push(`Exposição USD acima do limite de ${(simulation.portfolio.usdLimitBps / 100).toFixed(2)}%.`);
  return { simulation, report: { asOf, complete, totalBrlMinor: complete ? total.toString() : null, netContributionsBrlMinor: contributions.toString(), resultBrlMinor: complete ? (total - contributions).toString() : null, feesBrlMinor: fees.toString(), taxesBrlMinor: taxes.toString(), realizedBrlMinor: realized.toString(), usdExposureBps: exposure?.toString() ?? null, accounts: accountReport, holdings, cashflows, alerts: [...new Set(alerts)], fx: fxQuote, appliedTransactions: applied } };
}
