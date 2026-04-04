
import { EMA } from 'technicalindicators';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BreakoutSignal {
  type: 'EMA9' | 'EMA15' | 'COMBINED';
  direction: 'BULLISH' | 'BEARISH';
  candleIndex: number;
  emaValue: number;
  time: number;
  isVolumeSpike: boolean;
}

export class SignalAnalyzer {
  static calculateEMA(candles: Candle[], period: number) {
    const closes = candles.map(c => c.close);
    const emaValues = EMA.calculate({ period, values: closes });
    return candles.slice(period - 1).map((c, i) => ({
      time: c.time,
      value: emaValues[i]
    }));
  }

  static detectBreakouts(candles: Candle[], ema9: any[], ema15: any[]): BreakoutSignal[] {
    const signals: BreakoutSignal[] = [];

    const getEMAValue = (ema: any[], time: number) => {
        const entry = ema.find(e => e.time === time);
        return entry ? entry.value : null;
    };

    for (let i = 15; i < candles.length; i++) {
        const current = candles[i];
        const prev = candles[i - 1];
        
        const e9 = getEMAValue(ema9, prev.time);
        const e15 = getEMAValue(ema15, prev.time);

        if (!e9 || !e15) continue;

        const touch9 = prev.low <= e9 && prev.high >= e9;
        const touch15 = prev.low <= e15 && prev.high >= e15;

        // Volume Spike Detection: Current volume > 2x of prev 5-candle average
        const prev5Volumes = candles.slice(Math.max(0, i-6), i-1).map(c => c.volume);
        const avgVol = prev5Volumes.reduce((a, b) => a + b, 0) / prev5Volumes.length;
        const isVolumeSpike = current.volume > (avgVol * 2);

        // BULLISH
        if (current.close > prev.high) {
            const base = { candleIndex: i, time: current.time, isVolumeSpike };
            if (touch9 && touch15) signals.push({ ...base, type: 'COMBINED', direction: 'BULLISH', emaValue: e9 });
            else if (touch9) signals.push({ ...base, type: 'EMA9', direction: 'BULLISH', emaValue: e9 });
            else if (touch15) signals.push({ ...base, type: 'EMA15', direction: 'BULLISH', emaValue: e15 });
        }
        
        // BEARISH
        if (current.close < prev.low) {
            const base = { candleIndex: i, time: current.time, isVolumeSpike };
            if (touch9 && touch15) signals.push({ ...base, type: 'COMBINED', direction: 'BEARISH', emaValue: e9 });
            else if (touch9) signals.push({ ...base, type: 'EMA9', direction: 'BEARISH', emaValue: e9 });
            else if (touch15) signals.push({ ...base, type: 'EMA15', direction: 'BEARISH', emaValue: e15 });
        }
    }

    return signals;
  }
}
