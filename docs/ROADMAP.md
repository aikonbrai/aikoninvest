# Implementation roadmap

## M0 — Foundation
- Private repository, Next.js App Router + TypeScript + Tailwind scaffold; documented threat model.
- CI for lint, typecheck, tests and dependency review.
- AGENTS.md, architecture decision log and project docs.
- Financial function tests for currency and transactions.

## M1 — Simulated ledger
- Data model: user, portfolio, security, account, transaction, cashflow, price quote, FX quote and import batch.
- Ledger transaction types: buy/sell, deposit/withdrawal, dividend, fee, split and transfer.
- Precise calculations (decimal / minor units) and reproducible valuation as of date.
- Demo portfolio labeled SIMULATED.

## M2 — Real manual holdings
- Supabase Auth, RLS ownership policies, backups and migration tests.
- Manual trades, CSV preview, audit trail, portfolio export and security validation.

## M3 — Quotes & benchmarks
- Server-side market-data adapters, caching, rate limiting, licensing review and stale-data flags.
- B3 and international instruments, BRL/USD exchange rates, dividends and corporate actions.

## M4 — AI & risk lab
- RAG grounded in approved data with citations and explicit uncertainty.
- Risk/concentration metrics, benchmarks and report generation.
- Opt-in AI processing and no trading tools.

## Release gate
No public deployment with real holdings until security review, RLS tests, source provenance and accounting reconciliation have passed.

## Local implementation status — M1
Implemented locally: versioned simulation model, all M1 cash/event types (plus FX exchange), server replay, as-of valuation, manual price/FX references, configurable concentration limits, interactive entry, browser drafts and JSON backup/restore. See M1.md and VALIDATION.md for acceptance evidence and limits. Custody transfers, real account data, CSV, database/Auth/RLS and licensed live feeds remain later work. M0 private remote/hosted CI and browser visual QA remain pending.
