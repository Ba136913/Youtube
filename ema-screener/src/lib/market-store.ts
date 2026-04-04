
import { GhostEngine } from './ghost-engine';
import { SignalAnalyzer } from './analyzer';

const PRIORITY_STOCKS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'HUL', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK'];

const FULL_FO = [
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'BAJFINANCE', 'LT', 'ASIANPAINT', 'AXISBANK', 'MARUTI', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'WIPRO', 'TATASTEEL', 'POWERGRID', 'M&M', 'NTPC', 'BAJAJFINSV', 'ADANIENT', 'TATAMOTORS', 'TECHM', 'HINDALCO', 'ONGC', 'JSWSTEEL', 'GRASIM', 'COALINDIA', 'INDUSINDBK', 'BRITANNIA', 'DRREDDY', 'CIPLA', 'APOLLOHOSP', 'EICHERMOT', 'TATACONSUM', 'DIVISLAB', 'BAJAJ-AUTO', 'HEROMOTOCO', 'UPL', 'BPCL', 'SHREECEM', 'ADANIPORTS', 'NESTLEIND', 'PIDILITIND', 'SIEMENS', 'DLF', 'BEL', 'HAL', 'PFC', 'RECLTD', 'TVSMOTOR', 'TRENT', 'CHOLAFIN', 'ACC', 'ADANIPOWER', 'AMBUJACEM', 'APOLLOTYRE', 'ASHOKLEY', 'AUBANK', 'AUROPHARMA', 'BALKRISIND', 'BANDHANBNK', 'BANKBARODA', 'BATAINDIA', 'BERGEPAINT', 'BHARATFORG', 'BHEL', 'BIOCON', 'BSOFT', 'CANBK', 'CANFINHOME', 'CHAMBLFERT', 'COFORGE', 'CONCOR', 'COROMANDEL', 'CROMPTON', 'CUB', 'CUMMINSIND', 'DALBHARAT', 'DEEPAKNTR', 'DELHIVERY', 'DIXON', 'ESCORTS', 'EXIDEIND', 'FEDERALBNK', 'GLENMARK', 'GNFC', 'GODREJCP', 'GODREJPROP', 'GRANULES', 'GUJGASLTD', 'HAVELLS', 'HDFCLIFE', 'HINDCOPPER', 'HINDPETRO', 'ICICIGI', 'ICICIPRULI', 'IDFC', 'IDFCFIRSTB', 'IEX', 'IGL', 'INDHOTEL', 'INDIACEM', 'INDIAMART', 'INDIGO', 'INDUSTOWER', 'IOC', 'IPCALAB', 'IRCTC', 'IRFC', 'JINDALSTEL', 'JKCEMENT', 'JUBLFOOD', 'KEI', 'L&TFH', 'LICI', 'LTTS', 'LTIM', 'LUPIN', 'MANAPPURAM', 'MARICO', 'MCX', 'METROPOLIS', 'MFSL', 'MGL', 'MOTHERSON', 'MPHASIS', 'MRF', 'MUTHOOTFIN', 'NATIONALUM', 'NAVINFLUOR', 'NMDC', 'OBEROIRLTY', 'OFSS', 'PAGEIND', 'PEL', 'PERSISTENT', 'PETRONET', 'PIIND', 'PNB', 'POLYCAB', 'POONAWALLA', 'PVRINOX', 'RAMCOCEM', 'RBLBANK', 'RVNL', 'SAIL', 'SBICARD', 'SBILIFE', 'SHRIRAMFIN', 'SRF', 'SYNGENE', 'TATACHEM', 'TATAELXSI', 'TATAPOWER', 'TORNTPHARM', 'VOLTAS', 'ZEEL', 'ASTRAL', 'ATUL', 'BALRAMCHIN', 'BOSCHLTD', 'COLPAL', 'JSL', 'LALPATHLAB', 'LAURUSLABS', 'MSUMI', 'PHOENIXLTD', 'SJVN'
];

export class MarketStore {
  private static cache: Record<string, any> = {};
  private static isSyncing = false;
  private static lastSyncTime = 0;

  static async syncBatch(symbols: string[]) {
    try {
      const results = await GhostEngine.fetchBatch(symbols);
      for (const sym of symbols) {
        const entry = results[sym];
        if (entry && entry.candles) {
          const { candles, meta } = entry;
          const ema9 = SignalAnalyzer.calculateEMA(candles, 9);
          const ema15 = SignalAnalyzer.calculateEMA(candles, 15);
          const signals = SignalAnalyzer.detectBreakouts(candles, ema9, ema15);
          const lastPrice = candles[candles.length - 1].close;
          const prevClose = meta.previousClose || candles[0].close;
          const recentSignals = signals.filter(s => s.candleIndex >= candles.length - 45);
          const lastSignal = recentSignals.length > 0 ? recentSignals[recentSignals.length - 1] : null;

          this.cache[sym] = {
            symbol: sym, candles, ema9, ema15, signals, lastSignal,
            changePercent: ((lastPrice - prevClose) / prevClose) * 100,
            lastPrice, prevClose
          };
        }
      }
    } catch (e) {
      console.error("Batch Sync Error:", e);
    }
  }

  static async startSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log("MARKET SYNC STARTED...");

    try {
      // 1. FAST START: Priority stocks first
      await this.syncBatch(PRIORITY_STOCKS);
      this.lastSyncTime = Date.now();

      // 2. FULL FILL: Rest of F&O in background
      const batches = [];
      for (let i = 0; i < FULL_FO.length; i += 15) {
        batches.push(FULL_FO.slice(i, i + 15));
      }

      for (const batch of batches) {
        await this.syncBatch(batch);
        await new Promise(r => setTimeout(r, 300));
      }
      this.lastSyncTime = Date.now();
    } finally {
      this.isSyncing = false;
      console.log("MARKET SYNC COMPLETE.");
    }
  }

  static getData() {
    return {
      stocks: Object.values(this.cache),
      count: Object.keys(this.cache).length,
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncTime
    };
  }
}

// Global hook to ensure sync starts once
if (!(global as any).syncStarted) {
  MarketStore.startSync();
  setInterval(() => MarketStore.startSync(), 300000);
  (global as any).syncStarted = true;
}
