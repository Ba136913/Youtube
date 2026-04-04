
import { NextResponse } from 'next/server';
import { MarketStore } from '@/lib/market-store';

export async function GET() {
  // MarketStore.getData() returns { stocks: [...], isSyncing, lastSync }
  const storeData = MarketStore.getData();
  
  return NextResponse.json({
    stocks: storeData.stocks,
    lastSync: storeData.lastSync,
    isSyncing: storeData.isSyncing,
    serverTime: Date.now()
  });
}
