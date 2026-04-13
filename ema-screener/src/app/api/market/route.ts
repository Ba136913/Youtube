
import { NextResponse } from 'next/server';
import { GhostEngine } from '@/lib/ghost-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');
  
  if (!symbolsParam) return NextResponse.json({ error: 'No symbols' }, { status: 400 });

  const symbols = symbolsParam.split(',');
  const results = await GhostEngine.fetchBatch(symbols);

  return NextResponse.json(results);
}
