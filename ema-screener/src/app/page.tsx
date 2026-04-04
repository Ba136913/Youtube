
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Chart from '@/components/Chart';
import { fetchLiveMarketData, StockData } from '@/lib/data';
import { 
  Menu, RefreshCcw, SearchIcon, Activity, 
  Loader2, ArrowUpRight, ArrowDownRight, 
  ShieldCheck, Clock, Bell, Volume2, Database
} from 'lucide-react';

export default function Home() {
  const [allData, setAllData] = useState<StockData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  const [activeTab, setActiveTab] = useState<'COMBINED' | 'EMA9' | 'EMA15' | 'ALL'>('COMBINED');
  const [directionFilter, setDirectionFilter] = useState<'BULLISH' | 'BEARISH'>('BULLISH');
  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);
  
  const lastSignalCount = useRef<number>(0);

  const loadMarketData = useCallback(async () => {
    setSyncStatus('SYNCING');
    try {
        const stocks = await fetchLiveMarketData();
        if (stocks && stocks.length > 0) {
            // Alert logic for new combined breakouts
            const combinedCount = stocks.filter(s => s.lastSignal?.type === 'COMBINED').length;
            if (combinedCount > lastSignalCount.current && lastSignalCount.current !== 0) {
                playAlert();
                showToast("New Combined Breakout Detected", "BULLISH");
            }
            lastSignalCount.current = combinedCount;
            setAllData(stocks);
            setSyncStatus('IDLE');
        }
    } catch (e) {
        setSyncStatus('ERROR');
    }
  }, []);

  const playAlert = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  const showToast = (msg: string, type: string) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 15000);
    return () => clearInterval(interval);
  }, [loadMarketData]);

  const selectedStock = useMemo(() => {
    return allData.find(d => d.symbol === selectedSymbol) || allData[0];
  }, [allData, selectedSymbol]);

  const categorizedData = useMemo(() => {
    const filtered = allData.filter(s => s.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
    const getSignals = (type: string, direction: string) => {
        return filtered.filter(s => {
            if (type === 'ALL') return s.lastSignal?.direction === direction;
            return s.lastSignal?.type === type && s.lastSignal?.direction === direction;
        }).sort((a,b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    };

    return {
        combined_bull: getSignals('COMBINED', 'BULLISH'),
        combined_bear: getSignals('COMBINED', 'BEARISH'),
        ema9_bull: getSignals('EMA9', 'BULLISH'),
        ema9_bear: getSignals('EMA9', 'BEARISH'),
        ema15_bull: getSignals('EMA15', 'BULLISH'),
        ema15_bear: getSignals('EMA15', 'BEARISH'),
        all_bull: getSignals('ALL', 'BULLISH'),
        all_bear: getSignals('ALL', 'BEARISH'),
    };
  }, [allData, searchTerm]);

  const displayList = useMemo(() => {
    const key = `${activeTab.toLowerCase()}_${directionFilter === 'BULLISH' ? 'bull' : 'bear'}` as keyof typeof categorizedData;
    return categorizedData[key] || [];
  }, [activeTab, directionFilter, categorizedData]);

  if (allData.length === 0) {
    return (
      <div className="min-h-screen bg-[#030406] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
        <Loader2 className="text-blue-500 animate-spin mb-6" size={48} />
        <h2 className="text-xl font-bold tracking-tight text-white/90">Synchronizing Market Layers...</h2>
        <p className="text-gray-600 text-xs font-medium">Ghost Engine Engaging (Est. 15s)</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#030406] overflow-hidden font-sans text-gray-400 antialiased relative">
      
      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'w-[400px]' : 'w-0'} transition-all duration-300 border-r border-white/5 bg-[#080a0d] flex flex-col z-20 shadow-2xl overflow-hidden`}>
        <div className="p-6 border-b border-white/5 bg-black/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  <Activity size={18} className="text-white" />
              </div>
              <h1 className="font-black text-xs text-white tracking-widest uppercase">Quantum_EMA</h1>
            </div>
            <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black uppercase ${syncStatus === 'SYNCING' ? 'text-blue-500 animate-pulse' : 'text-green-500'}`}>
                    {syncStatus === 'SYNCING' ? 'Sync' : 'Live'}
                </div>
                <button onClick={loadMarketData} className="p-2 text-gray-500 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5">
                    <RefreshCcw size={14} className={syncStatus === 'SYNCING' ? 'animate-spin' : ''} />
                </button>
            </div>
          </div>

          <div className="relative mb-6">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
              <input 
                  type="text" 
                  placeholder="Intercept Node..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 focus:border-blue-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-white focus:outline-none transition-all"
              />
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl border border-white/5 mb-4">
              {['COMBINED', 'EMA9', 'EMA15', 'ALL'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-2 rounded-lg text-[9px] font-black tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}>
                    {tab}
                  </button>
              ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setDirectionFilter('BULLISH')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${directionFilter === 'BULLISH' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-transparent text-gray-700'}`}>
                <ArrowUpRight size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Bull</span>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/20 px-1.5 rounded">{categorizedData[`${activeTab.toLowerCase()}_bull` as keyof typeof categorizedData]?.length || 0}</span>
            </button>
            <button onClick={() => setDirectionFilter('BEARISH')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${directionFilter === 'BEARISH' ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-white/5 border-transparent text-gray-700'}`}>
                <ArrowDownRight size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Bear</span>
                <span className="text-[9px] font-mono font-bold bg-rose-500/20 px-1.5 rounded">{categorizedData[`${activeTab.toLowerCase()}_bear` as keyof typeof categorizedData]?.length || 0}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
            {displayList.map((stock) => (
                <div key={stock.symbol} onClick={() => setSelectedSymbol(stock.symbol)} className={`p-4 cursor-pointer rounded-2xl transition-all border group relative overflow-hidden ${selectedSymbol === stock.symbol ? 'bg-blue-600/10 border-blue-500/30 shadow-xl' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${selectedSymbol === stock.symbol ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-600 group-hover:text-gray-400'}`}>
                                {stock.symbol.slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className={`font-black text-sm tracking-tight uppercase ${selectedSymbol === stock.symbol ? 'text-blue-400' : 'text-white/90'}`}>{stock.symbol}</h3>
                                    {stock.lastSignal?.isVolumeSpike && (
                                        <div className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[7px] font-black text-blue-400 uppercase tracking-widest">Vol_Spike</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter ${stock.lastSignal?.direction === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {stock.lastSignal?.type} Signal
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-mono font-bold text-white/90 tracking-tighter">{stock.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                            <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] font-black ${stock.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {Math.abs(stock.changePercent).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest leading-none mb-1">Nodes</span>
                    <span className="text-xs font-black text-white/70">{allData.length}</span>
                </div>
                <div className="w-[1px] h-6 bg-white/5"></div>
                <Database size={14} className="text-gray-700" />
            </div>
            <div className="flex items-center gap-2">
                <Volume2 size={14} className="text-gray-700" />
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Audio_Enabled</span>
            </div>
        </div>
      </div>

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#030406] relative">
        
        {/* SMALL TOAST NOTIFICATION (Top Right) */}
        {notification && (
            <div className="absolute top-20 right-8 z-50 flex items-center gap-3 px-4 py-3 bg-[#080a0d] border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-right-8 fade-in duration-500">
                <div className={`p-2 rounded-xl ${notification.type === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    <Bell size={16} />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-tight">{notification.msg}</span>
            </div>
        )}

        <div className="h-16 border-b border-white/5 bg-black/20 flex items-center justify-between px-8 z-10 shadow-xl">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-600 hover:text-white transition-all"><Menu size={20} /></button>
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_blue]"></div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">Neural_Interface</span>
                </div>
                <h2 className="text-white font-black text-xl tracking-tighter uppercase">{selectedStock?.symbol || 'Select Node'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <ShieldCheck size={16} className="text-blue-500" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Ghost_Safe</span>
             </div>
          </div>
        </div>

        <div className="flex-1 relative bg-black">
          {selectedStock ? (
            <Chart key={selectedSymbol} data={selectedStock} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-10"><Activity size={64} className="animate-pulse" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
