"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, signOut, useSession, SessionProvider } from "next-auth/react";
import { 
  Search, Play, Settings, Grid, Bell, User, Home, Compass, Library, History, Clock, 
  ThumbsUp, Share2, Download, MoreHorizontal, TrendingUp, Music2, Gamepad2, Trophy, Flame,
  CheckCircle2, Volume2, Maximize2, SkipForward, SkipBack, Loader2, Menu, LogIn, LogOut, X, ArrowLeft
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
  id: string; title: string; channel: string; channelAvatar?: string; views: string; time: string; duration: string; thumbnail: string; isLive?: boolean;
}

const FALLBACK_VIDS: Video[] = [
    { id: "jfKfPfyJRdk", title: "lofi hip hop radio 💤 beats to sleep/chill to", channel: "Lofi Girl", channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_mKovZ_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z=s176-c-k-c0x00ffffff-no-rj", views: "34K watching", time: "LIVE", duration: "LIVE", thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg", isLive: true },
    { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", channel: "Rick Astley", views: "1.4B views", time: "14 years ago", duration: "3:33", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "kJQP7kiw5Fk", title: "Luis Fonsi - Despacito ft. Daddy Yankee", channel: "Luis Fonsi", views: "8.4B views", time: "7 years ago", duration: "4:42", thumbnail: "https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg" },
    { id: "V9fP6He_0oY", title: "OpenAI Sora - New Mind Blowing Videos!", channel: "Marques Brownlee", views: "8.2M views", time: "5 days ago", duration: "12:45", thumbnail: "https://img.youtube.com/vi/V9fP6He_0oY/maxresdefault.jpg" },
    { id: "ScMzIvxBSi4", title: "React 19 - Everything You Need to Know", channel: "FireShip", views: "450K views", time: "1 day ago", duration: "10:05", thumbnail: "https://img.youtube.com/vi/ScMzIvxBSi4/maxresdefault.jpg" },
    { id: "9bZkp7q19f0", title: "PSY - GANGNAM STYLE(강남스타일) M/V", channel: "officialpsy", views: "5.1B views", time: "11 years ago", duration: "4:12", thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg" },
    { id: "hT_nvWreIhg", title: "OneRepublic - Counting Stars", channel: "OneRepublic", views: "3.9B views", time: "10 years ago", duration: "4:43", thumbnail: "https://img.youtube.com/vi/hT_nvWreIhg/maxresdefault.jpg" },
    { id: "60ItHLz5WEA", title: "Alan Walker - Faded", channel: "Alan Walker", views: "3.5B views", time: "8 years ago", duration: "3:32", thumbnail: "https://img.youtube.com/vi/60ItHLz5WEA/maxresdefault.jpg" }
];

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
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const [page, setPage] = useState(1);
  const [relatedPage, setRelatedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);

  useEffect(() => { setSearchInput(query || ""); }, [query]);

  const fetchVideos = async (params: { q?: string, category?: string, page?: number, relatedId?: string }) => {
    const isRelated = !!params.relatedId;
    const pageNum = params.page || 1;
    
    if (pageNum === 1) {
        if (isRelated) setRelatedVideos([]);
        else { setLoading(true); setVideos([]); }
    }
    
    setSyncProgress(30);
    try {
      let url = '/api/youtube?';
      if (params.relatedId) url += `related=${params.relatedId}&`;
      else if (params.q) url += `q=${encodeURIComponent(params.q)}&`;
      else if (params.category && params.category !== 'All') url += `q=${encodeURIComponent(params.category)}&`;
      url += `page=${pageNum}`;

      const headers: Record<string, string> = {};
      if ((session as any)?.accessToken) {
        headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
      }

      const res = await fetch(url, { headers });
      setSyncProgress(70);
      const data = await res.json();
      
      if (data.videos && data.videos.length > 0) {
        if (isRelated) {
            const perPage = 10;
            const start = (pageNum - 1) * perPage;
            const chunk = data.videos.slice(start, start + perPage);
            setRelatedVideos(prev => {
                const next = pageNum === 1 ? chunk : [...prev, ...chunk];
                setHasMoreRelated(data.videos.length > next.length);
                return next;
            });
        } else {
            setVideos(prev => {
                const combined = pageNum === 1 ? (data.videos as Video[]) : [...prev, ...(data.videos as Video[])];
                const unique = Array.from(new Map(combined.map((v: Video) => [v.id, v])).values());
                return unique;
            });
            setHasMore(data.videos.length >= 5);
        }
      } else if (pageNum === 1 && !isRelated) {
          setVideos([]);
          setHasMore(false);
      } else if (!isRelated) {
          setHasMore(false);
      }
    } catch (e) { 
        if (pageNum === 1 && !isRelated) setVideos([]);
    } finally {
      setSyncProgress(100);
      setTimeout(() => { setLoading(false); setSyncProgress(0); }, 300);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchVideos({ q: query ?? undefined, category: category ?? undefined, page: 1 });
  }, [query, category]);

  useEffect(() => { if (videoId) { setRelatedPage(1); fetchVideos({ relatedId: videoId, page: 1 }); } }, [videoId]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastVideoRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || !hasMore || videoId) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(p => { const n = p + 1; fetchVideos({ q: query ?? undefined, category: category ?? undefined, page: n }); return n; });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, videoId, query, category]);

  const relObserver = useRef<IntersectionObserver | null>(null);
  const lastRelVideoRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || !hasMoreRelated || !videoId) return;
    if (relObserver.current) relObserver.current.disconnect();
    relObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setRelatedPage(p => { const n = p + 1; fetchVideos({ relatedId: videoId, page: n }); return n; });
      }
    });
    if (node) relObserver.current.observe(node);
  }, [loading, hasMoreRelated, videoId]);

  const categories = ["All", "Music", "Gaming", "News", "Bollywood", "Cricket", "Comedy", "Shorts", "Live", "Lo-fi"];

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
            <img src={session.user?.image || ""} className="w-8 h-8 rounded-full border border-white/10 cursor-pointer shadow-lg" onClick={() => signOut()} />
          ) : (
            <button onClick={() => signIn('google')} className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-[#3EA6FF] font-medium hover:bg-[#3EA6FF]/10 text-sm font-bold"><LogIn size={18} /> Sign in</button>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="w-[240px] hidden lg:flex flex-col p-3 gap-1 sticky top-14 h-[calc(100vh-56px)] border-r border-white/5 overflow-y-auto custom-scrollbar">
          <SidebarItem icon={<Home size={22} />} label="Home" active={!videoId && !query && (!category || category === "All")} onClick={() => router.push('/')} />
          <SidebarItem icon={<Flame size={22} />} label="Trending" active={category === "Trending"} onClick={() => router.push('/?category=Trending')} />
          <SidebarItem icon={<Music2 size={22} />} label="Music" active={category === "Music"} onClick={() => router.push('/?category=Music')} />
          <SidebarItem icon={<Gamepad2 size={22} />} label="Gaming" active={category === "Gaming"} onClick={() => router.push('/?category=Gaming')} />
        </aside>

        <main className="flex-1 p-4 min-w-0">
          {videoId ? (
            <div className="flex flex-col xl:flex-row gap-6 max-w-[1750px] mx-auto animate-in fade-in duration-500">
              <div className="flex-1 min-w-0">
                <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                  <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`} frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                </div>
                <div className="mt-4 space-y-3 px-1">
                  <h1 className="text-xl font-bold line-clamp-2 leading-snug">{relatedVideos.find(v => v.id === videoId)?.title || videos.find(v => v.id === videoId)?.title || "Premium Stream"}</h1>
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <img src={relatedVideos.find(v => v.id === videoId)?.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(relatedVideos.find(v => v.id === videoId)?.channel || 'Y')}&background=random&color=fff`} className="w-10 h-10 rounded-full object-cover border border-white/5 shadow-sm" />
                    <div className="flex-1"><p className="font-bold">{relatedVideos.find(v => v.id === videoId)?.channel || "Channel Name"}</p><p className="text-xs text-[#AAAAAA]">1.2M subscribers</p></div>
                    <button className="bg-[#F1F1F1] text-black px-4 py-2 rounded-full text-sm font-bold ml-4 hover:bg-[#D9D9D9] transition-colors">Subscribe</button>
                  </div>
                </div>
              </div>
              <div className="w-full xl:w-[400px] space-y-3">
                <h3 className="font-bold text-sm mb-2 text-slate-400 uppercase tracking-widest px-1">Related Videos</h3>
                {relatedVideos.filter(v => v.id !== videoId).map((video, index) => (
                  <div key={video.id + index} ref={index === relatedVideos.length - 1 ? lastRelVideoRef : null}><SidebarCard video={video} onClick={() => router.push(`/?v=${video.id}`)} /></div>
                ))}
                {hasMoreRelated && [...Array(3)].map((_, i) => <SkeletonSidebarCard key={i} />)}
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-4 sticky top-14 bg-[#0F0F0F] z-50 py-3 scrollbar-none">
                {categories.map(cat => (
                  <button key={cat} onClick={() => router.push(`/?category=${cat}`)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap active:scale-95", (category === cat || (!category && (!query && cat === "All"))) ? "bg-white text-black font-bold" : "bg-white/10 hover:bg-white/20")}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10 mt-2">
                {videos.map((video, index) => (
                  <div key={video.id + index} ref={index === videos.length - 1 ? lastVideoRef : null}><VideoCard video={video} onClick={() => router.push(`/?v=${video.id}`)} /></div>
                ))}
                {loading && [...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </>
          )}
        </main>
      </div>
      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
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
      <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-[#222] shadow-lg group-hover:shadow-2xl transition-all ring-1 ring-white/5">
        <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" loading="lazy" />
        <div className={cn("absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg", video.isLive ? "bg-[#CC0000] flex items-center gap-1" : "bg-black/80 text-white")}>
          {video.isLive && <div className="w-1 h-1 rounded-full bg-white animate-pulse" />}{video.isLive ? "LIVE" : (video.duration || "10:42")}
        </div>
      </div>
      <div className="flex gap-3 pr-2">
        <img src={video.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.channel || 'Y')}&background=random&color=fff`} className="w-9 h-9 rounded-full object-cover mt-1 border border-white/5 shadow-sm" />
        <div className="flex flex-col gap-1 overflow-hidden">
          <h3 className="text-sm font-bold line-clamp-2 leading-tight group-hover:text-[#3EA6FF] transition-colors">{video.title}</h3>
          <div className="text-xs text-[#AAAAAA] mt-1 font-medium"><p className="hover:text-white transition-colors">{video.channel}</p><p className={cn(video.isLive ? "text-[#FF4E45] font-bold" : "")}>{video.views} • {video.time}</p></div>
        </div>
      </div>
    </div>
  );
}

function SidebarCard({ video, onClick }: { video: Video, onClick: () => void }) {
  return (
    <div className="flex gap-2 group cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-all" onClick={onClick}>
      <div className="w-[168px] aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-[#222] relative ring-1 ring-white/5">
        <img src={video.thumbnail} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] font-bold">{video.isLive ? "LIVE" : (video.duration || "10:42")}</div>
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden py-1">
        <h3 className="text-[13px] font-bold line-clamp-2 leading-tight group-hover:text-[#3EA6FF] transition-colors">{video.title}</h3>
        <p className="text-[11px] text-[#AAAAAA] mt-1">{video.channel}</p>
        <p className="text-[11px] text-[#AAAAAA]">{video.views}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="aspect-video w-full rounded-xl bg-[#222]" />
      <div className="flex gap-3 px-1"><div className="w-9 h-9 rounded-full bg-[#222]" /><div className="flex-1 space-y-2"><div className="h-4 bg-[#222] rounded w-full" /><div className="h-3 bg-[#222] rounded w-2/3" /></div></div>
    </div>
  );
}

function SkeletonSidebarCard() {
  return (
    <div className="flex gap-2 animate-pulse p-1">
      <div className="w-[168px] aspect-video rounded-lg bg-[#222] flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1"><div className="h-3 bg-[#222] rounded w-full" /><div className="h-3 bg-[#222] rounded w-5/6" /><div className="h-2 bg-[#222] rounded w-1/2 mt-2" /></div>
    </div>
  );
}
