
import axios from 'axios';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Edge/122.0.0.0'
];

export class GhostEngine {
  private static getHeaders() {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    return {
      'User-Agent': ua,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://finance.yahoo.com',
      'Referer': 'https://finance.yahoo.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    };
  }

  static async fetchCandles(symbol: string, interval: string = '5m', range: string = '2d', retries = 3) {
    let yfSymbol = symbol;
    if (yfSymbol === 'NIFTY') yfSymbol = '^NSEI';
    else if (yfSymbol === 'BANKNIFTY') yfSymbol = '^NSEBANK';
    else if (yfSymbol === 'FINNIFTY') yfSymbol = '^CNXFIN';
    else if (!yfSymbol.endsWith('.NS') && !yfSymbol.startsWith('^')) yfSymbol = yfSymbol + '.NS';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=${interval}&range=${range}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.get(url, {
          headers: this.getHeaders(),
          timeout: 8000
        });

        const result = response.data.chart.result?.[0];
        if (!result) throw new Error('Empty result');

        const { timestamp, indicators, meta } = result;
        const { quote } = indicators;
        const { open, high, low, close, volume } = quote[0];

        if (!timestamp) return null;

        const candles = timestamp.map((t: number, i: number) => ({
          time: t,
          open: open[i],
          high: high[i],
          low: low[i],
          close: close[i],
          volume: volume[i]
        })).filter((c: any) => c.open != null && c.close != null && c.high != null && c.low != null);

        return {
          candles,
          meta: {
            symbol,
            previousClose: meta.previousClose,
            regularMarketPrice: meta.regularMarketPrice
          }
        };
      } catch (error: any) {
        if (attempt === retries - 1) {
          console.error(`GhostEngine Final Failure [${symbol}]:`, error.message);
          return null;
        }
        // Jittered backoff
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1) + Math.random() * 1000));
      }
    }
    return null;
  }

  static async fetchBatch(symbols: string[]) {
    const results: Record<string, any> = {};
    const chunkSize = 15; // Optimal for speed vs safety

    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(s => this.fetchCandles(s)));

      chunkResults.forEach((res, idx) => {
        if (res) results[chunk[idx]] = res;
      });

      // Identity Rotation Delay
      if (i + chunkSize < symbols.length) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
      }
    }
    return results;
  }
}
