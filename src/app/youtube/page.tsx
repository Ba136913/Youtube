"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { 
  Search, Play, Settings, Grid, Bell, 
  User, Home, Compass, Library, History, Clock, 
  ThumbsUp, Share2, Download, MoreHorizontal,
  TrendingUp, Music2, Gamepad2, Trophy, Flame,
  CheckCircle2, Volume2, Maximize2, SkipForward, SkipBack, Loader2, Menu, LogIn, LogOut
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
  id: string;
  title: string;
  channel: string;
  channelAvatar?: string;
  views: string;
  time: string;
  duration: string;
  thumbnail: string;
  isLive?: boolean;
}

function YouTubeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const query = searchParams.get('q');
  const videoId = searchParams.get('v');
  const category = searchParams.get('category');

  const [searchInput, setSearchInput] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [relatedPage, setRelatedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);

  // Sync search input with URL query but allow local typing
  useEffect(() => {
    setSearchInput(query || "");
  }, [query]);

  const fetchVideos = async (params: { q?: string, category?: string, page?: number, relatedId?: string }) => {
    const isRelated = !!params.relatedId;
    const pageNum = params.page || 1;
    
    if (pageNum === 1) {
        if (isRelated) setRelatedVideos([]);
        else {
            setLoading(true);
            setVideos([]);
        }
    }
    
    setSyncProgress(20);
    try {
      let url = '/api/youtube?';
      if (params.relatedId) url += `related=${params.relatedId}&`;
      else if (params.q) url += `q=${encodeURIComponent(params.q)}&`;
      else if (params.category && params.category !== 'All') url += `q=${encodeURIComponent(params.category)}&`;
      
      url += `page=${pageNum}`;

      const res = await fetch(url);
      setSyncProgress(60);
      const data = await res.json();
      
      if (data.videos && data.videos.length > 0) {
        if (isRelated) {
            // Piped gives all related at once, we pseudo-paginate for scroll effect
            const perPage = 10;
            const start = (pageNum - 1) * perPage;
            const chunk = data.videos.slice(0, start + perPage);
            setRelatedVideos(chunk);
            setHasMoreRelated(data.videos.length > start + perPage);
        } else {
            setVideos(prev => pageNum === 1 ? data.videos : [...prev, ...data.videos]);
            setHasMore(data.videos.length >= 10);
        }
      } else {
        if (isRelated) setHasMoreRelated(false);
        else setHasMore(false);
      }
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setSyncProgress(100);
      setTimeout(() => {
          setLoading(false);
          setSyncProgress(0);
      }, 400);
    }
  };

  // Trigger fetch on URL changes
  useEffect(() => {
    setPage(1);
    fetchVideos({ q: query, category, page: 1 });
  }, [query, category]);

  // Trigger related fetch on videoId changes
  useEffect(() => {
    if (videoId) {
        setRelatedPage(1);
        fetchVideos({ relatedId: videoId, page: 1 });
    }
  }, [videoId]);

  // Handle Infinite Scroll for Main Grid
  const observer = useRef<IntersectionObserver | null>(null);
  const lastVideoRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || !hasMore || videoId) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(p => {
            const next = p + 1;
            fetchVideos({ q: query, category, page: next });
            return next;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, videoId, query, category]);

  // Handle Infinite Scroll for Related Sidebar
  const relObserver = useRef<IntersectionObserver | null>(null);
  const lastRelVideoRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || !hasMoreRelated || !videoId) return;
    if (relObserver.current) relObserver.current.disconnect();
    relObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setRelatedPage(p => {
            const next = p + 1;
            fetchVideos({ relatedId: videoId, page: next });
            return next;
        });
      }
    });
    if (node) relObserver.current.observe(node);
  }, [loading, hasMoreRelated, videoId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    router.push(`/?q=${encodeURIComponent(searchInput)}`);
  };

  const categories = ["All", "Music", "Gaming", "News", "Bollywood", "Cricket", "Comedy", "Shorts", "Live", "Lo-fi"];

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F1F1F1] font-sans selection:bg-[#3EA6FF]/30">
      {syncProgress > 0 && (
          <div className="fixed top-0 left-0 h-[3px] bg-red-600 z-[200] transition-all duration-300 ease-out shadow-[0_0_15px_#ff0000]" style={{ width: `${syncProgress}%` }} />
      )}

      <header className="h-14 bg-[#0F0F0F] sticky top-0 z-[100] flex items-center justify-between px-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full transition-all"><Menu size={22} /></button>
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => { setSearchInput(""); router.push('/'); }}>
            <YouTubeIcon size={28} />
            <span className="text-xl font-bold tracking-tighter flex items-center">YouTube<span className="text-[10px] font-normal text-slate-400 ml-0.5 self-start pt-1 uppercase">IN</span></span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-[720px] mx-4 items-center">
          <div className="flex-1 flex items-center bg-[#121212] border border-[#303030] rounded-l-full pl-4 focus-within:border-[#3EA6FF] focus-within:ring-1 focus-within:ring-[#3EA6FF]">
            <input 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search" 
              className="bg-transparent border-none outline-none flex-1 h-10 text-base placeholder:text-slate-500" 
            />
          </div>
          <button type="submit" className="bg-[#222222] border border-l-0 border-[#303030] rounded-r-full px-5 h-10 hover:bg-[#333333] transition-all text-white"><Search size={20} /></button>
        </form>

        <div className="flex items-center gap-2">
          {session ? (
            <div className="group relative">
                <img src={session.user?.image || ""} alt="Profile" className="w-8 h-8 rounded-full border border-white/10 cursor-pointer shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                <div className="absolute right-0 top-10 hidden group-hover:block bg-[#282828] border border-white/10 rounded-xl p-2 w-48 shadow-2xl animate-in fade-in zoom-in duration-200">
                    <div className="px-3 py-2 text-sm font-bold truncate">{session.user?.name}</div>
                    <button onClick={() => signOut()} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-2 text-red-400 mt-1"><LogOut size={16} /> Sign out</button>
                </div>
            </div>
          ) : (
            <button onClick={() => signIn('google')} className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-[#3EA6FF] font-medium hover:bg-[#3EA6FF]/10 transition-all text-sm"><LogIn size={18} /> Sign in</button>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="w-[240px] hidden lg:flex flex-col p-3 gap-1 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto custom-scrollbar border-r border-white/5">
          <SidebarItem icon={<Home size={22} />} label="Home" active={!videoId && !query && !category} onClick={() => router.push('/')} />
          <SidebarItem icon={<Compass size={22} />} label="Shorts" />
          <SidebarItem icon={<CheckCircle2 size={22} />} label="Subscriptions" />
          <div className="h-px bg-white/10 my-3" />
          <h3 className="px-3 py-2 text-sm font-bold text-slate-400 uppercase">Explore</h3>
          <SidebarItem icon={<Flame size={22} />} label="Trending" onClick={() => router.push('/?category=trending')} />
          <SidebarItem icon={<Music2 size={22} />} label="Music" onClick={() => router.push('/?category=Music')} />
          <SidebarItem icon={<Gamepad2 size={22} />} label="Gaming" onClick={() => router.push('/?category=Gaming')} />
          <SidebarItem icon={<Trophy size={22} />} label="Sports" onClick={() => router.push('/?category=Sports')} />
        </aside>

        <main className="flex-1 min-w-0 p-4">
          {videoId ? (
            <div className="flex flex-col xl:flex-row gap-6 max-w-[1750px] mx-auto animate-in fade-in duration-500">
              <div className="flex-1 min-w-0">
                <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                  <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`} frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                </div>
                <div className="mt-4 space-y-3 px-1">
                  <h1 className="text-xl font-bold line-clamp-2 leading-snug">{relatedVideos.find(v => v.id === videoId)?.title || videos.find(v => v.id === videoId)?.title || "Premium Stream"}</h1>
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <img src={relatedVideos.find(v => v.id === videoId)?.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(relatedVideos.find(v => v.id === videoId)?.channel || 'Y')}&background=random&color=fff`} className="w-10 h-10 rounded-full object-cover border border-white/5" />
                    <div className="flex-1">
                        <p className="font-bold">{relatedVideos.find(v => v.id === videoId)?.channel || "Channel Name"}</p>
                        <p className="text-xs text-[#AAAAAA]">1.2M subscribers</p>
                    </div>
                    <button className="bg-[#F1F1F1] text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-[#D9D9D9] transition-colors">Subscribe</button>
                  </div>
                </div>
              </div>
              <div className="w-full xl:w-[400px] space-y-3">
                <h3 className="font-bold text-sm mb-2 text-slate-400 uppercase tracking-widest px-1">Related Videos</h3>
                {relatedVideos.filter(v => v.id !== videoId).map((video, index) => (
                  <div key={video.id + index} ref={index === relatedVideos.length - 1 ? lastRelVideoRef : null}>
                    <SidebarCard video={video} onClick={() => router.push(`/?v=${video.id}`)} />
                  </div>
                ))}
                {hasMoreRelated && [...Array(3)].map((_, i) => <SkeletonSidebarCard key={i} />)}
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none sticky top-14 bg-[#0F0F0F] z-50 py-3">
                {categories.map(cat => (
                  <button key={cat} onClick={() => router.push(`/?category=${cat}`)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap active:scale-95", (category === cat || (!category && cat === "All")) ? "bg-white text-black font-bold" : "bg-white/10 hover:bg-white/20")}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10 mt-2">
                {videos.map((video, index) => (
                  <div key={video.id + index} ref={index === videos.length - 1 ? lastVideoRef : null}>
                    <VideoCard video={video} onClick={() => router.push(`/?v=${video.id}`)} />
                  </div>
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

import { SessionProvider } from "next-auth/react";

export default function YouTubePremium() {
    return (
        <SessionProvider>
            <Suspense fallback={<div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center"><Loader2 className="animate-spin text-[#FF0000]" /></div>}>
                <YouTubeContent />
            </Suspense>
        </SessionProvider>
    );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-6 px-3 py-2 rounded-xl w-full text-left transition-all", active ? "bg-white/10 font-bold" : "hover:bg-white/10")}>{icon} <span className="text-sm">{label}</span></button>
  );
}

function VideoCard({ video, onClick }: { video: Video, onClick: () => void }) {
  return (
    <div className="flex flex-col gap-3 group cursor-pointer" onClick={onClick}>
      <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-[#222] shadow-lg group-hover:shadow-2xl transition-all ring-1 ring-white/5">
        <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className={cn("absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg", video.isLive ? "bg-[#CC0000] flex items-center gap-1" : "bg-black/80 text-white")}>
          {video.isLive && <div className="w-1 h-1 rounded-full bg-white animate-pulse" />}
          {video.isLive ? "LIVE" : (video.duration || "10:42")}
        </div>
      </div>
      <div className="flex gap-3 pr-2">
        <img src={video.channelAvatar} className="w-9 h-9 rounded-full object-cover mt-1 border border-white/5 shadow-sm" />
        <div className="flex flex-col gap-1 overflow-hidden">
          <h3 className="text-sm font-bold line-clamp-2 leading-tight group-hover:text-[#3EA6FF] transition-colors">{video.title}</h3>
          <div className="text-xs text-[#AAAAAA] mt-1 font-medium">
            <p className="hover:text-white transition-colors">{video.channel}</p>
            <p className={cn(video.isLive ? "text-[#FF4E45] font-bold" : "")}>{video.views} • {video.time}</p>
          </div>
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
      <div className="flex gap-3 px-1">
        <div className="w-9 h-9 rounded-full bg-[#222]" />
        <div className="flex-1 space-y-2"><div className="h-4 bg-[#222] rounded w-full" /><div className="h-3 bg-[#222] rounded w-2/3" /></div>
      </div>
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
