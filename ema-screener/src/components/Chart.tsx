
'use client';

import { useEffect, useRef, useState } from 'react';
import { StockData } from '@/lib/data';
import { 
  Zap, ArrowUpRight, ArrowDownRight, Maximize2, 
  ShieldCheck, Cpu, Globe, Target, Activity
} from 'lucide-react';

interface ChartProps {
  data: StockData;
}

export default function Chart({ data }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const ema9SeriesRef = useRef<any>(null);
  const ema15SeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [lib, setLib] = useState<any>(null);
  const [showEma9, setShowEma9] = useState(true);
  const [showEma15, setShowEma15] = useState(true);

  useEffect(() => {
    import('lightweight-charts').then((LWCharts) => setLib(LWCharts));
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || !lib) return;

    const { createChart, ColorType, CrosshairMode, LineStyle } = lib;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#030406' },
        textColor: '#475569',
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.15)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.15)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        barSpacing: 18,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.03)',
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(59, 130, 246, 0.3)', width: 1, style: LineStyle.Solid },
        horzLine: { color: 'rgba(59, 130, 246, 0.3)', width: 1, style: LineStyle.Solid },
      },
    });

    chartRef.current = chart;

    candlestickSeriesRef.current = chart.addCandlestickSeries({
      upColor: '#00ff9d',
      downColor: '#ff2e5d',
      borderVisible: false,
      wickUpColor: '#00ff9d',
      wickDownColor: '#ff2e5d',
    });

    volumeSeriesRef.current = chart.addHistogramSeries({
      color: '#00ff9d',
      priceFormat: { type: 'volume' },
      priceScaleId: '', 
    });

    volumeSeriesRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.9, bottom: 0 },
    });

    ema9SeriesRef.current = chart.addLineSeries({ color: '#3b82f6', lineWidth: 3, priceLineVisible: false });
    ema15SeriesRef.current = chart.addLineSeries({ color: '#fbbf24', lineWidth: 3, priceLineVisible: false });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) chartRef.current.remove();
    };
  }, [lib]);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    candlestickSeriesRef.current.setData(data.candles.map(c => ({
      time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
    })));
    
    volumeSeriesRef.current.setData(data.candles.map(c => ({
      time: c.time, value: c.volume,
      color: c.close >= c.open ? 'rgba(0, 255, 157, 0.15)' : 'rgba(255, 46, 93, 0.15)',
    })));

    ema9SeriesRef.current.setData(showEma9 ? data.ema9 : []);
    ema15SeriesRef.current.setData(showEma15 ? data.ema15 : []);
    
    const markers = [];
    if (data.lastSignal) {
        markers.push({
            time: data.lastSignal.time,
            position: data.lastSignal.direction === 'BULLISH' ? 'belowBar' : 'aboveBar',
            color: data.lastSignal.direction === 'BULLISH' ? '#00ff9d' : '#ff2e5d',
            shape: data.lastSignal.direction === 'BULLISH' ? 'arrowUp' : 'arrowDown',
            text: `${data.lastSignal.type} ${data.lastSignal.direction}`,
            size: 2
        });
    }

    candlestickSeriesRef.current.setMarkers(markers);
    chartRef.current.timeScale().fitContent();

  }, [data, showEma9, showEma15]);

  return (
    <div className="w-full h-full relative bg-[#030406] overflow-hidden group">
      
      {/* HUD: Left Stats */}
      <div className="absolute top-8 left-8 z-20 pointer-events-none space-y-4">
        <div className="bg-black/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 pointer-events-auto shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <Cpu size={24} className="text-white" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{data.symbol}</h2>
                <div className="flex items-center gap-2">
                    <Globe size={12} className="text-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Global_Market_Layer</span>
                </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Realtime_Value</span>
                <span className={`text-2xl font-bold font-mono ${data.changePercent >= 0 ? 'text-[#00ff9d]' : 'text-[#ff2e5d]'}`}>
                    {data.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Session_Change</span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${data.changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {data.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(data.changePercent).toFixed(2)}%
                </div>
            </div>
          </div>
        </div>

        {/* EMA Toggles HUD */}
        <div className="flex gap-2 pointer-events-auto">
            <button onClick={() => setShowEma9(!showEma9)} className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${showEma9 ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-600'}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,1)]"></div>
                <span className="text-xs font-black uppercase">EMA 9</span>
            </button>
            <button onClick={() => setShowEma15(!showEma15)} className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${showEma15 ? 'bg-amber-600/10 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-gray-600'}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[0_0_10px_rgba(251,191,36,1)]"></div>
                <span className="text-xs font-black uppercase">EMA 15</span>
            </button>
        </div>
      </div>

      {/* HUD: Right Controls */}
      <div className="absolute top-8 right-8 z-20 flex flex-col gap-4 items-end pointer-events-none">
        <div className="bg-black/40 backdrop-blur-3xl p-3 rounded-2xl border border-white/5 pointer-events-auto flex items-center gap-4">
            <button onClick={() => chartRef.current?.timeScale().fitContent()} className="p-3 text-gray-400 hover:text-white bg-white/5 rounded-xl hover:bg-blue-600 transition-all shadow-xl"><Maximize2 size={20} /></button>
            <div className="w-[1px] h-8 bg-white/10"></div>
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-500">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Quantum_Safe</span>
            </div>
        </div>
      </div>

      {/* HUD: Terminal Decoration */}
      <div className="absolute bottom-8 left-8 z-20 opacity-30 pointer-events-none">
          <div className="flex items-center gap-4 font-mono text-[10px] text-gray-600">
              <span className="animate-pulse">● SYSTEM_ID: 0x992B1</span>
              <span>● LATENCY: 12MS</span>
              <span>● CORE: STABLE</span>
          </div>
      </div>

      <div className="w-full h-full" ref={chartContainerRef}></div>
      
      {/* Visual Glitch Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <Activity size={800} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
      </div>
    </div>
  );
}
