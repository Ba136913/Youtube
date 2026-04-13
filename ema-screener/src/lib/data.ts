
import { SignalAnalyzer, Candle, BreakoutSignal } from './analyzer';

export interface StockData {
  symbol: string;
  name: string;
  candles: Candle[];
  ema9: any[];
  ema15: any[];
  signals: BreakoutSignal[];
  lastSignal: BreakoutSignal | null;
  changePercent: number;
  lastPrice: number;
  prevClose: number;
}

export const NSE_FO_STOCKS = [
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'HUL', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'BAJFINANCE', 'LT', 'ASIANPAINT', 'AXISBANK', 'MARUTI', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'WIPRO', 'TATASTEEL', 'POWERGRID', 'M&M', 'NTPC', 'BAJAJFINSV', 'ADANIENT', 'TATAMOTORS', 'TECHM', 'HINDALCO', 'ONGC', 'JSWSTEEL', 'GRASIM', 'COALINDIA', 'INDUSINDBK', 'BRITANNIA', 'DRREDDY', 'CIPLA', 'APOLLOHOSP', 'EICHERMOT', 'TATACONSUM', 'DIVISLAB', 'BAJAJ-AUTO', 'HEROMOTOCO', 'UPL', 'BPCL', 'SHREECEM', 'ADANIPORTS', 'NESTLEIND', 'PIDILITIND', 'SIEMENS', 'DLF', 'BEL', 'HAL', 'PFC', 'RECLTD', 'TVSMOTOR', 'TRENT', 'CHOLAFIN', 'ACC', 'ADANIPOWER', 'AMBUJACEM', 'APOLLOTYRE', 'ASHOKLEY', 'AUBANK', 'AUROPHARMA', 'BALKRISIND', 'BANDHANBNK', 'BANKBARODA', 'BATAINDIA', 'BERGEPAINT', 'BHARATFORG', 'BHEL', 'BIOCON', 'BSOFT', 'CANBK', 'CANFINHOME', 'CHAMBLFERT', 'COFORGE', 'CONCOR', 'COROMANDEL', 'CROMPTON', 'CUB', 'CUMMINSIND', 'DALBHARAT', 'DEEPAKNTR', 'DELHIVERY', 'DIXON', 'ESCORTS', 'EXIDEIND', 'FEDERALBNK', 'GLENMARK', 'GNFC', 'GODREJCP', 'GODREJPROP', 'GRANULES', 'GUJGASLTD', 'HAVELLS', 'HDFCLIFE', 'HINDCOPPER', 'HINDPETRO', 'ICICIGI', 'ICICIPRULI', 'IDFC', 'IDFCFIRSTB', 'IEX', 'IGL', 'INDHOTEL', 'INDIACEM', 'INDIAMART', 'INDIGO', 'INDUSTOWER', 'IOC', 'IPCALAB', 'IRCTC', 'IRFC', 'JINDALSTEL', 'JKCEMENT', 'JUBLFOOD', 'KEI', 'L&TFH', 'LICI', 'LTTS', 'LTIM', 'LUPIN', 'MANAPPURAM', 'MARICO', 'MCX', 'METROPOLIS', 'MFSL', 'MGL', 'MOTHERSON', 'MPHASIS', 'MRF', 'MUTHOOTFIN', 'NATIONALUM', 'NAVINFLUOR', 'NMDC', 'OBEROIRLTY', 'OFSS', 'PAGEIND', 'PEL', 'PERSISTENT', 'PETRONET', 'PIIND', 'PNB', 'POLYCAB', 'POONAWALLA', 'PVRINOX', 'RAMCOCEM', 'RBLBANK', 'RVNL', 'SAIL', 'SBICARD', 'SBILIFE', 'SHRIRAMFIN', 'SRF', 'SYNGENE', 'TATACHEM', 'TATAELXSI', 'TATAPOWER', 'TORNTPHARM', 'VOLTAS', 'ZEEL', 'ASTRAL', 'ATUL', 'BALRAMCHIN', 'BOSCHLTD', 'COLPAL', 'JSL', 'LALPATHLAB', 'LAURUSLABS', 'MSUMI', 'PHOENIXLTD', 'SJVN'
];

export async function fetchBatchData(symbols: string[]): Promise<StockData[]> {
  try {
    const res = await fetch(`/api/market?symbols=${symbols.join(',')}`, { cache: 'no-store' });
    const rawData = await res.json();
    
    const processed: StockData[] = [];
    for (const sym of symbols) {
      const entry = rawData[sym];
      if (entry && entry.candles && entry.candles.length > 20) {
        const { candles, meta } = entry;
        const ema9 = SignalAnalyzer.calculateEMA(candles, 9);
        const ema15 = SignalAnalyzer.calculateEMA(candles, 15);
        const signals = SignalAnalyzer.detectBreakouts(candles, ema9, ema15);
        const lastPrice = candles[candles.length - 1].close;
        const prevClose = meta.previousClose || candles[0].close;
        
        const recentSignals = signals.filter(s => s.candleIndex >= candles.length - 45);
        const lastSignal = recentSignals.length > 0 ? recentSignals[recentSignals.length - 1] : null;

        processed.push({
          symbol: sym, name: sym, candles, ema9, ema15, signals, lastSignal,
          changePercent: ((lastPrice - prevClose) / prevClose) * 100,
          lastPrice, prevClose
        });
      }
    }
    return processed;
  } catch (err) {
    console.error('fetchBatchData Error:', err);
    return [];
  }
}
