# Architecture decisions

## ADR-001: Read-only / non-trading MVP
**Chosen:** records, education, simulation and risk analysis. **Reason:** isolate learning from execution and limit harm.

## ADR-002: Original currency first
**Chosen:** every transaction stores its original currency, with a distinct FX observation and conversion provenance. **Reason:** BRL performance and USD performance are different measurements.

## ADR-003: Deterministic math
**Chosen:** accounting calculations must use a precise decimal representation on the server. **Reason:** LLM calculations and binary floating-point can be wrong for financial accounting.

## ADR-004: Independent repository
**Chosen:** do not modify AIKON Finance during MVP. **Reason:** isolate data, deployment and regression risks.

## ADR-005: Third-party OSS
**Chosen:** use Ghostfolio for product research, and evaluate QuantStats as a Python analytical service in a later milestone. **Reason:** do not silently inherit incompatible licenses or unnecessary dependencies.

## ADR-006: M0 local web foundation
Chosen: Next.js App Router, React, TypeScript, Tailwind CSS via PostCSS, ESLint 9 and Next config. Dependencies pinned by npm with package-lock for reproducible installs; no external component, font, analytics or market-data service. Impact: Node.js 24 used for local and CI checks; separate tsconfig.financial.json preserves independent arithmetic tests. No database schema or migration in M0. Supabase integration deferred to M2. No deployment configuration changed or accounts connected.

## ADR-007: Demonstration scope
The homepage shows three fictitious aggregate positions and a fictitious FX observation dated 2026-01-01. This is not a ledger, a suitability assessment or a functional AI assistant. All eight product modules are labeled planned. Original financial prototype remains illustrative, not production accounting.

Compatibility note: TypeScript pinned to 5.9.3 because TypeScript 7 is rejected by the installed typescript-eslint parser. ESLint 9 retained for compatibility with the Next configuration. Review upgrades together.

## ADR-008: M1 deterministic simulated ledger
Chosen: server-side pure replay of a version-1 JSON snapshot; no new dependency, database, broker, deployment or schema migration. The model now includes a simulated user, portfolio, accounts, securities, transactions, derived cashflows, dated price/FX quotes and import-batch provenance. Accounts are isolated inside the simulated portfolio; these checks do not replace authentication/RLS for real data.

Money and prices use integer BRL/USD cents, quantities use six fixed decimal places and FX uses six decimal places. Intermediate arithmetic uses bigint. Round half-up at each monetary event, conversion and proportional average-cost removal; split quantities must be exactly representable or are rejected. Complete liquidation removes the full residual basis. No lot selection or tax reporting. Manually entered taxes are cash costs, not calculated tax liabilities.

Original-currency cost and historical BRL cost include buy fees/taxes. Sell proceeds net of fees/taxes minus the removed historical BRL cost are realized BRL result. Total nominal BRL result = dated portfolio value minus historical-FX net external contributions. This includes dividends, costs and FX; it is not a time-weighted return or annualized return. Dividend entry may represent an externally documented distribution without requiring a position at payment date.

Events sort by UTC date, preserving array order within a day. All events are validated, even when evaluating an earlier prefix; future events and future quotes never enter historical balances. A valid future purchase can be invisible in an earlier report; an invalid future purchase invalidates the snapshot. Transfer supports cash in the same currency; exchange moves cash between BRL/USD accounts using transaction FX, with fees/taxes in the source currency. Security custody transfers are deferred.

## ADR-009: M1 persistence, provenance and valuation limits
Browser localStorage stores only simulated drafts after successful server validation. Startup shows the fixed demo; restoring a saved draft is an explicit action. JSON export/import is a complete versioned snapshot backup, not the CSV import planned for M2. Editing/deleting events and replacing a same-date quote are permitted and revalidated; JSON backups preserve prior versions. This is reproducibility, not immutable audit storage. No server-side persistence or cross-device backup.

The calculation endpoint accepts up to 1 MB, limits record counts, rejects cross-origin browser requests and returns no-store responses. It performs no external service calls and does not log request bodies. Production authentication, rate limiting, secure storage, RLS and immutable auditing remain M2/release gates.

All quotes are explicitly simulated, daily observations at 00:00 UTC. The latest quote at or before the chosen valuation date is used. No quote means no total/result instead of a partial total. More than seven calendar days generates a stale warning; this is a lab policy, not an exchange calendar. Concentration aggregates the same security across accounts; USD exposure includes USD cash. Initial thresholds (40% asset, 50% USD) are configurable lab rules, not personal advice. ETF look-through, volatility, drawdown and corporate-action price adjustment are not inferred. Enter post-split price references explicitly.

Build compatibility: explicit .ts relative imports are accepted by the Next bundler; tsconfig.financial.json uses TypeScript 5.9 rewriteRelativeImportExtensions to emit .js imports for Node tests. The main no-emit configuration enables allowImportingTsExtensions. No dependency or deployment change.
