"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SECTORS_LIST, STOCKS_BY_SECTOR } from "@/lib/market-data";
import { 
  LayoutGrid, List, ArrowUpCircle, ArrowDownCircle, 
  ExternalLink, ChevronRight, BarChart3, TrendingUp, 
  TrendingDown, Clock, Search, Activity, RefreshCcw, ShieldCheck, Zap, Globe, Cpu, Boxes, BadgeCheck, Network, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

type SourceType = 'tradingView' | 'yahoo' | 'google' | 'moneyControl';

export default function SectorScope() {
  const [trinityData, setTrinityData] = useState<any>(null);
  const [selectedSource, setSelectedSource] = useState<SourceType>('tradingView'); // DEFAULT: TRADINGVIEW
  const [selectedSector, setSelectedSector] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTimer, setRefreshTimer] = useState(0);

  const handleStockClick = (symbol: string) => {
    if (typeof window !== 'undefined') {
      window.open(`https://www.tradingview.com/chart/?symbol=NSE:${symbol}`, '_blank');
    }
  };

  const fetchTrinityData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/market', { cache: 'no-store' });
      const response = await res.json();
      if (response.data && response.data.tradingView) {
        setTrinityData(response.data);
        setLastUpdated(new Date(response.meta.timestamp).toLocaleTimeString('en-IN', { hour12: true }));
        setRefreshTimer(Math.floor(response.meta.refreshIn / 1000));
      }
    } catch (e) {
      console.error("Trinity Engine Sync Error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrinityData();
    const interval = setInterval(fetchTrinityData, 60000); 
    return () => clearInterval(interval);
  }, [fetchTrinityData]);

  useEffect(() => {
    if (refreshTimer > 0) {
        const timer = setInterval(() => setRefreshTimer(t => t - 1), 1000);
        return () => clearInterval(timer);
    }
  }, [refreshTimer]);

  const processedSectors = useMemo(() => {
    if (!trinityData || !trinityData[selectedSource]) return [];
    const sourceData = trinityData[selectedSource];

    return SECTORS_LIST.map(name => {
      const symbols = STOCKS_BY_SECTOR[name] || [];
      const stocks = symbols.map(s => {
        const live = sourceData[s] || { price: 0, chgPct: 0, isBullish: false };
        return {
          symbol: s,
          price: live.price || 0,
          chgPct: live.chgPct || 0,
          rFac: (Math.abs(live.chgPct || 0) * 1.1).toFixed(2) + "x",
          sign: live.isBullish ? 'bullish' : 'bearish',
          isBullish: live.isBullish
        };
      });

      const upCount = stocks.filter(s => s.isBullish).length;
      const downCount = symbols.length - upCount;
      const avgChg = stocks.reduce((acc, s) => acc + s.chgPct, 0) / (symbols.length || 1);

      return {
        id: name.toLowerCase().replace(/ /g, '-'),
        name,
        status: avgChg > 0 ? 'bullish' : 'bearish',
        upCount,
        downCount,
        totalCount: symbols.length,
        multiplier: (Math.abs(avgChg) * 3.5).toFixed(2) + "x",
        stocks
      };
    });
  }, [trinityData, selectedSource]);

  const activeSector = useMemo(() => {
    if (!selectedSector) return null;
    return processedSectors.find(s => s.id === selectedSector.id);
  }, [processedSectors, selectedSector]);

  const filteredSectors = processedSectors.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.stocks.some(st => st.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && !trinityData) {
    return (
        <div className="min-h-screen bg-[#000] flex flex-col items-center justify-center gap-6 font-sans">
            <Loader2 size={48} className="text-blue-500 animate-spin" />
            <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-xs">Synchronizing Neural Nodes...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020203] text-[#F1F5F9] font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* SOURCE SELECTOR */}
      <div className="bg-[#0A0A0F] border-b border-white/5 sticky top-0 z-[200] backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Market Node:</span>
                <div className="flex gap-2">
                    {(['tradingView', 'yahoo', 'google', 'moneyControl'] as SourceType[]).map(source => (
                        <button 
                            key={source}
                            onClick={() => setSelectedSource(source)}
                            className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all border",
                                selectedSource === source ? "bg-blue-600 border-blue-500 text-white shadow-lg" : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {source}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">REFRESH: {Math.floor(refreshTimer / 60)}m {refreshTimer % 60}s</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            </div>
        </div>
      </div>

      <header className="border-b border-white/5 bg-[#050608]/90 backdrop-blur-3xl sticky top-10 z-[140] py-4 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setSelectedSector(null)}>
              <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/30 rounded-xl flex items-center justify-center shadow-lg">
                <Boxes size={20} className="text-blue-500" />
              </div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
                  SECTOR<span className="text-blue-500">SCOPE</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
               <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Neural Scan..." className="bg-black/50 border border-white/10 rounded-xl pl-10 pr-6 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/40 w-[250px] font-bold" />
             </div>
             <button onClick={fetchTrinityData} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all shadow-lg group active:scale-95">
                <RefreshCcw size={16} className={cn("text-white", loading && "animate-spin")} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className={cn("flex-1 transition-all duration-700", selectedSector && "lg:w-[45%]")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSectors.map(sector => (
                <button
                  key={sector.id}
                  onClick={() => setSelectedSector(sector)}
                  className={cn(
                    "group relative overflow-hidden bg-[#0C0E14] border p-6 rounded-[24px] transition-all duration-500 hover:translate-y-[-4px] text-left flex flex-col justify-between min-h-[160px] shadow-lg",
                    selectedSector?.id === sector.id ? "border-blue-500 ring-4 ring-blue-500/10" : "border-white/5 hover:border-white/20 hover:bg-[#11131C]",
                  )}
                >
                  <div className="absolute top-4 right-4 bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] font-black text-blue-400 font-mono italic">
                    {sector.multiplier}
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-tighter group-hover:text-blue-400 transition-colors uppercase italic leading-none">{sector.name}</h3>
                    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest mt-2 border", sector.status === 'bullish' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                      <div className={cn("w-1 h-1 rounded-full", sector.status === 'bullish' ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]")} />
                      {sector.status} TREND
                    </div>
                  </div>
                  <div className="space-y-3 mt-6">
                    <div className="flex justify-between text-[9px] font-black tracking-widest text-slate-600 uppercase">
                      <span>{sector.upCount} UP</span>
                      <span>{sector.downCount} DOWN</span>
                    </div>
                    <div className="h-1 w-full bg-black rounded-full overflow-hidden flex shadow-inner">
                      <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${(sector.upCount/sector.totalCount)*100}%` }} />
                      <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${(sector.downCount/sector.totalCount)*100}%` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {activeSector && (
            <div className="lg:w-[55%] animate-in fade-in slide-in-from-right-20 duration-700 sticky top-32 h-[calc(100vh-160px)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
              <div className="bg-[#0C0E14] border border-blue-500/30 rounded-[32px] overflow-hidden shadow-2xl relative">
                <div className="p-10 bg-gradient-to-br from-blue-900/20 via-[#0C0E14] to-transparent">
                  <button onClick={() => setSelectedSector(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white mb-8">
                    <ChevronRight className="rotate-180" size={14} /> EXIT MATRIX
                  </button>
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic drop-shadow-2xl text-white/90">{activeSector.name}</h2>
                  <div className="flex items-center gap-6 mt-8">
                    <div className="bg-white text-black px-4 py-2 rounded-xl font-black font-mono text-2xl shadow-xl">{activeSector.multiplier}</div>
                    <div className="space-y-1">
                        <p className="text-xs font-black text-blue-400 tracking-widest uppercase italic">Neural Analysis</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] uppercase tracking-widest">TradingView Node Aligned</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-center justify-between mb-8 px-6 text-[9px] font-black uppercase tracking-[0.4em] text-slate-700 border-b border-white/5 pb-6">
                    <span>Neural Asset Code</span>
                    <div className="flex gap-24 pr-16">
                      <span>R.Fac</span>
                      <span>Volatility Chg%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activeSector.stocks.sort((a, b) => b.chgPct - a.chgPct).map(stock => (
                      <button 
                        key={stock.symbol} 
                        onClick={() => handleStockClick(stock.symbol)} 
                        className="w-full flex items-center justify-between p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-blue-500/60 hover:translate-x-4 transition-all duration-500 group"
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xl group-hover:text-blue-400 transition-colors uppercase italic">{stock.symbol}</span>
                            <BadgeCheck size={16} className={cn("transition-colors", stock.isBullish ? "text-green-500" : "text-red-500/40")} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 font-mono tracking-tighter">₹{(stock.price || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-12">
                          <span className="text-lg font-black font-mono w-24 text-right text-blue-400 italic">{(stock.rFac || "0.00x")}</span>
                          <div className="w-28 text-right">
                            <div className={cn("text-2xl font-black font-mono tracking-tighter leading-none", stock.isBullish ? "text-green-500" : "text-red-500")}>
                              {stock.chgPct >= 0 ? "+" : ""}{stock.chgPct.toFixed(2)}%
                            </div>
                            <div className="h-1 w-full bg-black rounded-full mt-2 overflow-hidden ring-1 ring-white/5 shadow-inner">
                                <div className={cn("h-full transition-all duration-1000", stock.isBullish ? "bg-green-500" : "bg-red-500")} style={{ width: `${Math.min(Math.abs(stock.chgPct) * 15, 100)}%` }} />
                            </div>
                          </div>
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-xl border", 
                            stock.isBullish ? "bg-green-500/10 border-green-500/20 text-green-500 group-hover:bg-green-500 group-hover:text-white" : "bg-red-500/10 border-red-500/20 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                          )}>
                            {stock.isBullish ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
