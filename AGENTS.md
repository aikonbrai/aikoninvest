# AIKON Invest Lab — Codex rules

## Mission
Build a secure, educational, read-only-first investment portfolio lab for Brazilian residents tracking Brazilian and foreign investments.

## Non-negotiable rules
- No live trading, broker credential collection, withdrawal, or order execution.
- Never present mocked market data as live. Every quote must display provider, timestamp, currency and delayed/stale state.
- Keep financial mathematics deterministic and independently tested; AI may explain but never calculate authoritative account balances.
- Use Decimal or integer minor units for money, never JS floating point for production accounting.
- Track original currency, trade-date exchange rate, fees and taxes, and transaction provenance.
- No personal financial data or API keys in client logs, prompts, source control or tests.
- Require authenticated ownership checks and RLS before production account data.
- Do not change schema, dependencies, licensing, or deployment settings without documenting impact.
- Prefer small commits, automated tests, and explicit acceptance criteria.
- API integrations require checking licensing, rate limits and data redistribution permissions.
- Nothing is deployed or connected to accounts without explicit approval.

## Workflow
1. Read docs/PRODUCT.md, docs/ROADMAP.md, and docs/DECISIONS.md.
2. Inspect repository and present an implementation plan for any meaningful change.
3. Implement one milestone at a time and run automated checks.
4. Record assumptions, risks, tests, and migrations in completion summary.
5. Never claim to have executed commands or tests that were not run.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
