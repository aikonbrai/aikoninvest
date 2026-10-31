import { evaluate, LedgerError } from '../../../lib/ledger.ts';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'Envie um cenário JSON.' }, { status: 415, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Origem não permitida.' }, { status: 403, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new LedgerError('Cenário ausente.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) { await reader.cancel(); return Response.json({ error: 'Limite de 1 MB por cenário.' }, { status: 413, headers }); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder().decode(buffer));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new LedgerError('Cenário inválido.');
    if (typeof body.asOf !== 'string') throw new LedgerError('Data de avaliação obrigatória.');
    return Response.json(evaluate(body.simulation, body.asOf), { headers });
  } catch (error) {
    if (error instanceof LedgerError || error instanceof SyntaxError) return Response.json({ error: error instanceof SyntaxError ? 'JSON inválido.' : error.message }, { status: 400, headers });
    return Response.json({ error: 'Não foi possível avaliar o cenário.' }, { status: 500, headers });
  }
}
