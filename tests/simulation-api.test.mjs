import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../dist/app/api/simulation/route.js';
import { demo, DEMO_DATE } from '../dist/lib/demo.js';

function request(body, headers = {}) {
  return new Request('http://localhost:3000/api/simulation', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

test('simulation endpoint returns reproducible server-authoritative balances without caching', async () => {
  const response = await POST(request({ simulation: demo, asOf: DEMO_DATE }));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json(); assert.equal(result.report.totalBrlMinor, '2603080'); assert.equal(result.report.appliedTransactions, 10);
});
test('malformed JSON, absent data and null wrappers return validation errors', async () => {
  for (const body of ['{bad', 'null', '[]', '{}', JSON.stringify({ asOf: DEMO_DATE, simulation: null })]) {
    assert.equal((await POST(request(body))).status, 400);
  }
});
test('invalid transactions return actionable error without replacing a valid scenario', async () => {
  const scenario = structuredClone(demo); scenario.transactions = scenario.transactions.slice(2);
  const response = await POST(request({ simulation: scenario, asOf: DEMO_DATE }));
  assert.equal(response.status, 400); assert.match((await response.json()).error, /saldo insuficiente/);
});
test('cross-origin requests and unsupported media types are refused', async () => {
  assert.equal((await POST(request({ simulation: demo, asOf: DEMO_DATE }, { Origin: 'https://example.invalid' }))).status, 403);
  assert.equal((await POST(request('{}', { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await POST(request({ simulation: demo, asOf: DEMO_DATE }, { Origin: 'http://localhost:3000' }))).status, 200);
});
test('streamed body is capped independently of declared content length', async () => {
  assert.equal((await POST(request(' '.repeat(1_000_001)))).status, 413);
});
test('JSON backup export/import preserves history and strips unknown properties', async () => {
  const scenario = { ...structuredClone(demo), unrecognized: 'discard me' };
  const response = await POST(request({ simulation: scenario, asOf: '2026-10-02' }));
  const result = await response.json();
  assert.equal(response.status, 200); assert.equal(result.simulation.transactions.length, 10);
  assert.equal(result.simulation.unrecognized, undefined); assert.equal(result.report.appliedTransactions, 4);
  const again = await POST(request(JSON.parse(JSON.stringify({ simulation: result.simulation, asOf: DEMO_DATE }))));
  assert.equal((await again.json()).report.totalBrlMinor, '2603080');
});
