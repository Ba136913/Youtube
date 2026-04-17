"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, signOut, useSession, SessionProvider } from "next-auth/react";
import { 
  Search, Play, Settings, Grid, Bell, User, Home, Compass, Library, History, Clock, 
  ThumbsUp, Share2, Download, MoreHorizontal, TrendingUp, Music2, Gamepad2, Trophy, Flame,
  CheckCircle2, Volume2, Maximize2, SkipForward, SkipBack, Loader2, Menu, LogIn, LogOut, X, ArrowLeft,
  Youtube
} from "lucide-react";
import { cn } from "@/lib/utils";

function YouTubeIcon({ className, size = 24 }: { className?: string, size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="#FF0000">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

interface Video {
  id: string; title: string; channel: string; channelAvatar?: string; views: string; time: string; duration: string; thumbnail: string; isLive?: boolean; isShort?: boolean;
}

function YouTubeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const query = searchParams.get('q');
  const videoId = searchParams.get('v');
  const category = searchParams.get('category');

  const [searchInput, setSearchInput] = useState(query || "");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [currentVideoDetails, setCurrentVideoDetails] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);

  useEffect(() => { setSearchInput(query || ""); }, [query]);

  const fetchVideos = async (params: { q?: string, category?: string, page?: number, relatedId?: string, type?: string }) => {
    const isRelated = !!params.relatedId;
    const pageNum = params.page || 1;
    
    if (pageNum === 1) {
        if (isRelated) { setRelatedVideos([]); setCurrentVideoDetails(null); }
        else { setLoading(true); setVideos([]); }
    }
    
    setSyncProgress(30);
    try {
      let url = '/api/youtube?';
      if (params.relatedId) url += `related=${params.relatedId}&`;
      else if (params.q) url += `q=${encodeURIComponent(params.q)}&`;
      else if (params.category && params.category !== 'All') url += `q=${encodeURIComponent(params.category)}&`;
      else if (params.type) url += `type=${params.type}&`;
      url += `page=${pageNum}`;

      const headers: Record<string, string> = {};
      if ((session as any)?.accessToken) {
        headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      
      if (data.videos && data.videos.length > 0) {
        if (isRelated) {
            if (data.currentVideo) setCurrentVideoDetails(data.currentVideo);
            setRelatedVideos(prev => {
                const next = pageNum === 1 ? data.videos : [...prev, ...data.videos];
                return Array.from(new Map(next.map((v: any) => [v.id, v])).values()) as Video[];
            });
            setHasMoreRelated(data.videos.length >= 10);
        } else {
            setVideos(prev => {
                const combined = pageNum === 1 ? (data.videos as Video[]) : [...prev, ...(data.videos as Video[])];
                return Array.from(new Map(combined.map((v: Video) => [v.id, v])).values());
            });
            setHasMore(data.videos.length >= 5);
        }
      } else {
          if (isRelated) setHasMoreRelated(false);
          else setHasMore(false);
      }
    } catch (e) { console.error(e); }
    finally { setSyncProgress(100); setTimeout(() => { setLoading(false); setSyncProgress(0); }, 300); }
  };

  useEffect(() => {
    setPage(1);
    let type = undefined;
    if (category === 'History') type = 'liked';
    else if (category === 'Subscriptions') type = 'subscriptions';
    else if (category === 'Shorts') type = 'shorts';
    fetchVideos({ q: query ?? undefined, category: category ?? undefined, page: 1, type });
  }, [query, category]);

  useEffect(() => { if (videoId) fetchVideos({ relatedId: videoId, page: 1 }); }, [videoId]);

  const categories = ["All", "Music", "Gaming", "News", "Bollywood", "Shorts", "Cricket", "Comedy", "Live", "Lo-fi"];

  const currentVideo = currentVideoDetails || [...videos, ...relatedVideos].find(v => v.id === videoId);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F1F1F1] font-sans overflow-x-hidden">
      {syncProgress > 0 && <div className="fixed top-0 left-0 h-[3px] bg-red-600 z-[200] transition-all duration-300 shadow-[0_0_10px_#ff0000]" style={{ width: `${syncProgress}%` }} />}
      
      <header className="h-14 bg-[#0F0F0F] sticky top-0 z-[100] flex items-center justify-between px-4 border-b border-white/5">
        <div className={cn("items-center gap-4", showMobileSearch ? "hidden" : "flex")}>
          <button className="p-2 hover:bg-white/10 rounded-full transition-all"><Menu size={22} /></button>
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => { setSearchInput(""); router.push('/'); }}>
            <YouTubeIcon size={28} /><span className="text-xl font-bold tracking-tighter">YouTube<span className="text-[10px] text-slate-400 ml-0.5 uppercase">IN</span></span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (searchInput.trim()) { setShowMobileSearch(false); router.push(`/?q=${encodeURIComponent(searchInput)}`); } }} className={cn("flex-1 max-w-[720px] mx-4 items-center", showMobileSearch ? "flex" : "hidden md:flex")}>
          {showMobileSearch && <button type="button" onClick={() => setShowMobileSearch(false)} className="p-2 mr-2 hover:bg-white/10 rounded-full"><ArrowLeft size={22} /></button>}
          <div className="flex-1 flex items-center bg-[#121212] border border-[#303030] rounded-l-full pl-4 focus-within:border-[#3EA6FF] shadow-inner">
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search" className="bg-transparent outline-none flex-1 h-10 text-base placeholder:text-slate-500" />
            {searchInput && <button type="button" onClick={() => setSearchInput("")} className="p-2 text-slate-400 hover:text-white"><X size={18} /></button>}
          </div>
          <button type="submit" className="bg-[#222222] border border-l-0 border-[#303030] rounded-r-full px-5 h-10 hover:bg-[#333333] transition-all text-white"><Search size={20} /></button>
        </form>

        <div className={cn("items-center gap-2", showMobileSearch ? "hidden" : "flex")}>
          <button onClick={() => setShowMobileSearch(true)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><Search size={22} /></button>
          {session ? (
            <img src={session.user?.image || ""} className="w-8 h-8 rounded-full border border-white/10 cursor-pointer shadow-lg" onClick={() => signOut()} title={session.user?.name || ""} />
          ) : (
            <button onClick={() => signIn('google')} className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-[#3EA6FF] font-medium hover:bg-[#3EA6FF]/10 text-sm font-bold"><LogIn size={18} /> Sign in</button>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="w-[240px] hidden lg:flex flex-col p-3 gap-1 sticky top-14 h-[calc(100vh-56px)] border-r border-white/5 overflow-y-auto custom-scrollbar">
          <SidebarItem icon={<Home size={22} />} label="Home" active={!videoId && !query && (!category || category === "All")} onClick={() => router.push('/')} />
          <SidebarItem icon={<Play size={22} />} label="Shorts" active={category === "Shorts"} onClick={() => router.push('/?category=Shorts')} />
          <SidebarItem icon={<Library size={22} />} label="Subscriptions" active={category === "Subscriptions"} onClick={() => router.push('/?category=Subscriptions')} />
          <hr className="my-2 border-white/10" />
          <SidebarItem icon={<History size={22} />} label="History" active={category === "History"} onClick={() => router.push('/?category=History')} />
          <SidebarItem icon={<ThumbsUp size={22} />} label="Liked Videos" active={category === "Liked"} onClick={() => router.push('/?category=History')} />
          <hr className="my-2 border-white/10" />
          <SidebarItem icon={<Flame size={22} />} label="Trending" active={category === "Trending"} onClick={() => router.push('/?category=Trending')} />
          <SidebarItem icon={<Music2 size={22} />} label="Music" active={category === "Music"} onClick={() => router.push('/?category=Music')} />
        </aside>

        <main className="flex-1 p-4 min-w-0">
          {videoId ? (
            <div className="flex flex-col xl:flex-row gap-6 max-w-[1750px] mx-auto">
              <div className="flex-1 min-w-0">
                <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                  <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`} frameBorder="0" allowFullScreen />
                </div>
                <div className="mt-4 space-y-3 px-1">
                  <h1 className="text-xl font-bold line-clamp-2">{currentVideo?.title || "Loading video details..."}</h1>
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <img src={currentVideo?.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentVideo?.channel || 'Y')}&background=random&color=fff`} className="w-10 h-10 rounded-full" />
                    <div className="flex-1"><p className="font-bold">{currentVideo?.channel || "Channel"}</p><p className="text-xs text-[#AAAAAA]">{currentVideo?.views?.includes('views') ? '1.2M subscribers' : 'Official Channel'}</p></div>
                    <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-[#D9D9D9]">Subscribe</button>
                  </div>
                </div>
              </div>
              <div className="w-full xl:w-[400px] space-y-3">
                <h3 className="font-bold text-sm mb-2 text-slate-400 uppercase tracking-widest px-1">Up Next</h3>
                {relatedVideos.filter(v => v.id !== videoId).map((video) => (
                  <SidebarCard key={video.id} video={video} onClick={() => router.push(`/?v=${video.id}`)} />
                ))}
                {hasMoreRelated && <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonSidebarCard key={i} />)}</div>}
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-4 sticky top-14 bg-[#0F0F0F] z-50 py-3 scrollbar-none">
                {categories.map(cat => (
                  <button key={cat} onClick={() => router.push(`/?category=${cat}`)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all", (category === cat || (!category && (!query && cat === "All"))) ? "bg-white text-black font-bold" : "bg-white/10 hover:bg-white/20")}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10 mt-2">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={() => router.push(`/?v=${video.id}`)} />
                ))}
                {loading && [...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function YouTubePremium() { return (<SessionProvider><Suspense fallback={<div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center"><Loader2 className="animate-spin text-[#FF0000]" /></div>}><YouTubeContent /></Suspense></SessionProvider>); }

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (<button onClick={onClick} className={cn("flex items-center gap-6 px-3 py-2 rounded-xl w-full text-left transition-all font-medium", active ? "bg-white/10 font-bold text-white" : "text-slate-300 hover:bg-white/10")}>{icon} <span className="text-sm">{label}</span></button>);
}

function VideoCard({ video, onClick }: { video: Video, onClick: () => void }) {
  return (
    <div className="flex flex-col gap-3 group cursor-pointer" onClick={onClick}>
      <div className={cn("aspect-video w-full rounded-xl overflow-hidden relative bg-[#222] shadow-lg transition-all", video.isShort ? "aspect-[9/16]" : "")}>
        <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/80">{video.isLive ? "LIVE" : video.duration}</div>
      </div>
      <div className="flex gap-3">
        {!video.isShort && <img src={video.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.channel)}&background=random`} className="w-9 h-9 rounded-full" />}
        <div className="flex flex-col gap-1 overflow-hidden">
          <h3 className="text-sm font-bold line-clamp-2 leading-tight">{video.title}</h3>
          <div className="text-xs text-[#AAAAAA] font-medium"><p>{video.channel}</p><p>{video.views} • {video.time}</p></div>
        </div>
      </div>
    </div>
  );
}

function SidebarCard({ video, onClick }: { video: Video, onClick: () => void }) {
  return (
    <div className="flex gap-2 group cursor-pointer p-1 rounded-lg hover:bg-white/5" onClick={onClick}>
      <div className="w-[168px] aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-[#222] relative">
        <img src={video.thumbnail} className="w-full h-full object-cover" />
        <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] font-bold">{video.duration}</div>
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden py-1">
        <h3 className="text-[13px] font-bold line-clamp-2 leading-tight">{video.title}</h3>
        <p className="text-[11px] text-[#AAAAAA] mt-1">{video.channel}</p>
        <p className="text-[11px] text-[#AAAAAA]">{video.views}</p>
      </div>
    </div>
  );
}

function SkeletonCard() { return (<div className="flex flex-col gap-3 animate-pulse"><div className="aspect-video w-full rounded-xl bg-[#222]" /><div className="flex gap-3 px-1"><div className="w-9 h-9 rounded-full bg-[#222]" /><div className="flex-1 space-y-2"><div className="h-4 bg-[#222] rounded w-full" /><div className="h-3 bg-[#222] rounded w-2/3" /></div></div></div>); }
function SkeletonSidebarCard() { return (<div className="flex gap-2 animate-pulse p-1"><div className="w-[168px] aspect-video rounded-lg bg-[#222] flex-shrink-0" /><div className="flex-1 space-y-2 py-1"><div className="h-3 bg-[#222] rounded w-full" /><div className="h-3 bg-[#222] rounded w-5/6" /></div></div>); }
