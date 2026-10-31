import type { Simulation, Transaction } from './ledger.ts';

export const DEMO_DATE = '2026-10-29';
function event(id: string, date: string, type: Transaction['type'], accountId: string, values: Partial<Transaction> = {}): Transaction {
  return { id, date, type, accountId, amount: '0', fee: '0', tax: '0', fx: { date, rate: '5.00', source: 'Cenário fictício AIKON' }, provenance: { source: 'Demonstração AIKON — operação fictícia', recordedAt: '2026-10-29T00:00:00Z' }, ...values };
}
export const demo: Simulation = {
  version: 1,
  user: { id: 'local-simulation', kind: 'simulation' },
  portfolio: { id: 'lab', userId: 'local-simulation', name: 'Meu laboratório BRL / USD', assetLimitBps: 4000, usdLimitBps: 5000 },
  accounts: [
    { id: 'brl', portfolioId: 'lab', name: 'Caixa Brasil', currency: 'BRL' },
    { id: 'reserve', portfolioId: 'lab', name: 'Reserva simulada', currency: 'BRL' },
    { id: 'usd', portfolioId: 'lab', name: 'Caixa internacional', currency: 'USD' },
  ],
  securities: [
    { id: 'petr4', symbol: 'PETR4', name: 'Ação brasileira — exemplo', currency: 'BRL' },
    { id: 'bova11', symbol: 'BOVA11', name: 'ETF brasileiro — exemplo', currency: 'BRL' },
    { id: 'voo', symbol: 'VOO', name: 'ETF em dólar — exemplo', currency: 'USD' },
  ],
  transactions: [
    event('demo-1', '2026-10-01', 'deposit', 'brl', { amount: '20000' }),
    event('demo-2', '2026-10-01', 'deposit', 'usd', { amount: '1000' }),
    event('demo-3', '2026-10-02', 'buy', 'brl', { securityId: 'petr4', quantity: '100', unitPrice: '30', fee: '5' }),
    event('demo-4', '2026-10-02', 'buy', 'brl', { securityId: 'bova11', quantity: '30', unitPrice: '100', fee: '2' }),
    event('demo-5', '2026-10-03', 'buy', 'usd', { securityId: 'voo', quantity: '1.5', unitPrice: '400', fee: '1' }),
    event('demo-6', '2026-10-04', 'exchange', 'brl', { amount: '500', targetAccountId: 'usd', fee: '2' }),
    event('demo-7', '2026-10-04', 'transfer', 'brl', { amount: '1000', targetAccountId: 'reserve' }),
    event('demo-8', '2026-10-08', 'dividend', 'brl', { securityId: 'petr4', amount: '30', tax: '3' }),
    event('demo-9', '2026-10-10', 'sell', 'brl', { securityId: 'petr4', quantity: '20', unitPrice: '35', fee: '2', tax: '1' }),
    event('demo-10', '2026-10-10', 'fee', 'brl', { amount: '5' }),
  ],
  prices: [
    { id: 'price-1', securityId: 'petr4', currency: 'BRL', price: '35', date: DEMO_DATE, source: 'Cenário fictício AIKON' },
    { id: 'price-2', securityId: 'bova11', currency: 'BRL', price: '105', date: DEMO_DATE, source: 'Cenário fictício AIKON' },
    { id: 'price-3', securityId: 'voo', currency: 'USD', price: '420', date: DEMO_DATE, source: 'Cenário fictício AIKON' },
  ],
  fxQuotes: [{ date: DEMO_DATE, rate: '5.20', source: 'Cenário fictício AIKON' }],
  importBatches: [],
};
