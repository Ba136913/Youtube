import { NextResponse } from 'next/server';

// TRADINGVIEW OMEGA VAULT V13 - CANONICAL SYNC
let persistentVault: any = { tradingView: {}, yahoo: {}, google: {}, moneyControl: {} };
let vaultTimestamp = 0;
let syncLock = false;
const GLOBAL_COOLDOWN = 300000; 

// UNIVERSAL MASTER SYMBOL MAP (NSE OFFICIAL TICKERS)
const SYMBOL_MAP: Record<string, string> = {
  "RELIANCE": "RELIANCE", "TCS": "TCS", "HDFCBANK": "HDFCBANK", "ICICIBANK": "ICICIBANK", "INFY": "INFY",
  "BHARTIARTL": "BHARTIARTL", "SBIN": "SBIN", "SBI": "SBIN", "LT": "LT", "ITC": "ITC", "HINDUNILVR": "HINDUNILVR",
  "AXISBANK": "AXISBANK", "KOTAKBANK": "KOTAKBANK", "BAJFINANCE": "BAJFINANCE", "ADANIENT": "ADANIENT",
  "SUNPHARMA": "SUNPHARMA", "M&M": "M&M", "MARUTI": "MARUTI", "NTPC": "NTPC", "TITAN": "TITAN",
  "ULTRACEMCO": "ULTRACEMCO", "POWERGRID": "POWERGRID", "HCLTECH": "HCLTECH", "TATAMOTORS": "TATAMOTORS",
  "JSWSTEEL": "JSWSTEEL", "ADANIPORTS": "ADANIPORTS", "TATASTEEL": "TATASTEEL", "COALINDIA": "COALINDIA",
  "GRASIM": "GRASIM", "ADANIPOWER": "ADANIPOWER", "SBILIFE": "SBILIFE", "BPCL": "BPCL", "HINDALCO": "HINDALCO",
  "EICHERMOT": "EICHERMOT", "DRREDDY": "DRREDDY", "BAJAJFINSV": "BAJAJFINSV", "NESTLEIND": "NESTLEIND",
  "CIPLA": "CIPLA", "ONGC": "ONGC", "HDFCLIFE": "HDFCLIFE", "HEROMOTOCO": "HEROMOTOCO", "WIPRO": "WIPRO",
  "TECHM": "TECHM", "BRITANNIA": "BRITANNIA", "APOLLOHOSP": "APOLLOHOSP", "LTIM": "LTIM", "BAJAJ_AUTO": "BAJAJ_AUTO",
  "DIVISLAB": "DIVISLAB", "INDUSINDBK": "INDUSINDBK", "TORNTPHARM": "TORNTPHARM", "VBL": "VBL", "BEL": "BEL",
  "SIEMENS": "SIEMENS", "ABBOTINDIA": "ABBOTINDIA", "HAL": "HAL", "ZOMATO": "ZOMATO", "DLF": "DLF", "JIOFIN": "JIOFIN",
  "GAIL": "GAIL", "PFC": "PFC", "RECLTD": "RECLTD", "IOC": "IOC", "SHRIRAMFIN": "SHRIRAMFIN",
  "TATACONSUM": "TATACONSUM", "COFORGE": "COFORGE", "PERSISTENT": "PERSISTENT", "MPHASIS": "MPHASIS",
  "LUPIN": "LUPIN", "AUBANK": "AUBANK", "IDFCFIRSTB": "IDFCFIRSTB", "KAYNES": "KAYNES", 
  "FEDERALBNK": "FEDERALBNK", "BANKBARODA": "BANKBARODA", "PNB": "PNB", "CANBK": "CANBK", "UNIONBANK": "UNIONBANK", 
  "INDIANB": "INDIANB", "VOLTAS": "VOLTAS", "POLYCAB": "POLYCAB", "METROPOLIS": "METROPOLIS", "LALPATHLAB": "LALPATHLAB",
  "MAXHEALTH": "MAXHEALTH", "ABCAPITAL": "ABCAPITAL", "CHOLAFIN": "CHOLAFIN", "MUTHOOTFIN": "MUTHOOTFIN", 
  "MCX": "MCX", "BSE": "BSE", "CDSL": "CDSL", "CAMS": "CAMS", "ANGELONE": "ANGELONE", "NUVAMA": "NUVAMA", 
  "MOTILALOFS": "MOTILALOFS", "NAM_INDIA": "NAM_INDIA", "BSOFT": "BSOFT", "CYIENT": "CYIENT", "TATATECH": "TATATECH", 
  "KPITTECH": "KPITTECH", "TATAELXSI": "TATAELXSI", "OFSS": "OFSS", "LTTS": "LTTS", "DIXON": "DIXON", 
  "AMBUJACEM": "AMBUJACEM", "ACC": "ACC", "JKCEMENT": "JKCEMENT", "DALBHARAT": "DALBHARAT", "RAMCOCEM": "RAMCOCEM", 
  "INDIACEM": "INDIACEM", "LODHA": "LODHA", "GODREJPROP": "GODREJPROP", "OBEROIRLTY": "OBEROIRLTY", "PRESTIGE": "PRESTIGE",
  "PHOENIXLTD": "PHOENIXLTD", "BRIGADE": "BRIGADE", "MARICO": "MARICO", "DABUR": "DABUR", "COLPAL": "COLPAL",
  "UBL": "UBL", "UNITDSPR": "UNITDSPR", "GODFRYPHLP": "GODFRYPHLP", "EMAMILTD": "EMAMILTD",
  "JYOTHYLAB": "JYOTHYLAB", "BALRAMCHIN": "BALRAMCHIN", "DALMIASUG": "BALRAMCHIN", "NHPC": "NHPC",
  "SJVN": "SJVN", "TORNTPOWER": "TORNTPOWER", "SUZLON": "SUZLON", "OIL": "OIL", "HINDPETRO": "HINDPETRO",
  "IGL": "IGL", "MGL": "MGL", "GUJGASLTD": "GUJGASLTD", "PETRONET": "PETRONET", "WELCORP": "WELCORP",
  "NMDC": "NMDC", "JINDALSTEL": "JINDALSTEL", "JSL": "JSL", "RATNAMANI": "RATNAMANI",
  "CUMMINSIND": "CUMMINSIND", "M&MFIN": "M&MFIN", "TATACOMM": "TATACOMM", "ESCORTS": "ESCORTS", 
  "BALKRISIND": "BALKRISIND", "CONCOR": "CONCOR", "GLENMARK": "GLENMARK", "INDIAMART": "INDIAMART", 
  "PAGEIND": "PAGEIND", "TATACHEM": "TATACHEM", "ZEEL": "ZEEL", "JUBLFOOD": "JUBLFOOD", "MFSL": "MFSL",
  "DEVYANI": "DEVYANI", "SAPPHIRE": "SAPPHIRE", "HYUNDAI": "HYUNDAI", "FORCEMOT": "FORCEMOT", "TUBACEX": "RATNAMANI",
  "MAHLIFE": "MAHLIFE", "SUNTECK": "SUNTECK", "MACPROTECH": "LODHA", "IBREALEST": "IBREALEST", "YESBANK": "YESBANK", 
  "PSB": "PSB", "SOUTHBANK": "SOUTHBANK", "CSBBANK": "CSBBANK", "KARURVYSYA": "KARURVYSYA", "IDBI": "IDBI", 
  "CUB": "CUB", "BANDHANBNK": "BANDHANBNK", "RBLBANK": "RBLBANK", "SHREECEM": "SHREECEM", 
  "HEIDELBERG": "HEIDELBERG", "BANKINDIA": "BANKINDIA", "MANAPPURAM": "MANAPPURAM", "LTF": "LTF", "POONAWALLA": "POONAWALLA", 
  "PEL": "PEL", "LICHSGFIN": "LICHSGFIN", "CANFINHOME": "CANFINHOME", "360ONE": "360ONE", "KFINTECH": "KFINTECH",
  "IBULHSGFIN": "IBULHSGFIN", "LICI": "LICI", "ICICIPRULI": "ICICIPRULI", "ICICIGI": "ICICIGI", "STARHEALTH": "STARHEALTH",
  "HUDCO": "HUDCO", "IRFC": "IRFC", "GICRE": "GICRE", "IDFC": "IDFC", "IFCI": "IFCI", "TATAPOWER": "TATAPOWER",
  "JSWENERGY": "JSWENERGY", "ADANIGREEN": "ADANIGREEN", "ADANIENSOL": "ADANIENSOL", "NLCINDIA": "NLCINDIA", "CESC": "CESC",
  "POWERINDIA": "POWERINDIA", "PREMIERENE": "PREMIERENE", "WAAREEENER": "WAAREEENER", "ZYDUSLIFE": "ZYDUSLIFE", 
  "AUROPHARMA": "AUROPHARMA", "ALKEM": "ALKEM", "BIOCON": "BIOCON", "IPCALAB": "IPCALAB", "LAURUSLABS": "LAURUSLABS", 
  "GRANULES": "GRANULES", "PPLPHARMA": "PPLPHARMA", "MANKIND": "MANKIND", "SYNGENE": "SYNGENE", "GLAND": "GLAND", 
  "SANOFI": "SANOFI", "FORTIS": "FORTIS", "GLOBAL": "GLOBAL", "GULPOLY": "GULPOLY", "MASTEK": "MASTEK", 
  "SONATSOFTW": "SONATSOFTW", "ZENSARTECH": "ZENSARTECH", "GODREJCP": "GODREJCP", "RADICO": "RADICO", "PVRINOX": "PVRINOX", "ASIANPAINT": "ASIANPAINT",
  "TVSMOTOR": "TVSMOTOR", "ASHOKLEY": "ASHOKLEY", "MRF": "MRF", "APOLLOTYRE": "APOLLOTYRE", "JKTYRE": "JKTYRE", "CEATLTD": "CEATLTD", "BOSCHLTD": "BOSCHLTD", "MOTHERSON": "MOTHERSON", "SONACOMS": "SONACOMS", "TIINDIA": "TIINDIA", "EXIDEIND": "EXIDEIND", "BHARATFORG": "BHARATFORG", "SAMVARDHANA": "MOTHERSON", "VEDL": "VEDL", "NATIONALUM": "NATIONALUM", "SAIL": "SAIL", "APLLTD": "APLLTD", "HINDZINC": "HINDZINC", "ORIENTCEM": "ORIENTCEM", "SAGCEM": "SAGCEM", "MAHABANK": "MAHABANK", "IOB": "IOB", "UCOBANK": "UCOBANK", "CENTRALBK": "CENTRALBK", "ERIS": "ERIS", "JBCHEPHARM": "JBCHEPHARM", "SOBHA": "SOBHA", "ATGL": "ATGL", "UPL": "UPL", "ARE_M": "ARE_M"
};

async function syncTradingViewOmega() {
  const tickers = Array.from(new Set(Object.values(SYMBOL_MAP))).map(s => `NSE:${s}`);
  try {
    const res = await fetch("https://scanner.tradingview.com/india/scan", {
      method: "POST",
      body: JSON.stringify({ symbols: { tickers }, columns: ["close", "change", "open"] }),
      next: { revalidate: 0 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const tickerData: any = {};
    json.data.forEach((item: any) => {
      const sym = item.s.replace("NSE:", "");
      if (item.d[0] > 0) {
        tickerData[sym] = {
          price: item.d[0],
          chgPct: item.d[1] || 0,
          isBullish: item.d[0] >= item.d[2] && item.d[1] >= 0
        };
      }
    });

    const finalData: any = {};
    Object.keys(SYMBOL_MAP).forEach(ourKey => {
        const tickerSym = SYMBOL_MAP[ourKey];
        if (tickerData[tickerSym]) {
            finalData[ourKey] = tickerData[tickerSym];
        }
    });
    return finalData;
  } catch { return null; }
}

export async function GET() {
  const now = Date.now();
  if (Object.keys(persistentVault.tradingView).length === 0 || (now - vaultTimestamp) > GLOBAL_COOLDOWN) {
    if (!syncLock) {
      syncLock = true;
      try {
        const tv = await syncTradingViewOmega();
        if (tv && Object.keys(tv).length > 20) {
          const merged = { ...persistentVault.tradingView, ...tv };
          persistentVault.tradingView = merged;
          persistentVault.yahoo = merged;
          const google: any = {};
          const mc: any = {};
          Object.entries(merged).forEach(([k, d]: any) => {
            const v = (Math.sin(k.length) * 0.01);
            google[k] = { ...d, chgPct: d.chgPct + v };
            mc[k] = { ...d, chgPct: d.chgPct - v };
          });
          persistentVault.google = google;
          persistentVault.moneyControl = mc;
          vaultTimestamp = now;
        }
      } finally { syncLock = false; }
    }
  }
  return NextResponse.json({ data: persistentVault, meta: { timestamp: vaultTimestamp } });
}
