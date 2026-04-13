import { NextResponse } from 'next/server';

// GHOST ENGINE: List of robust API instances for rotation
const GHOST_PROVIDERS = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.lunar.icu',
    'https://pipedapi.smnz.de',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.astre.me',
    'https://api.piped.vicr.me'
];

async function fetchWithGhostEngine(endpoint: string) {
    let lastError = null;
    // Shuffle providers for true rotation
    const shuffled = [...GHOST_PROVIDERS].sort(() => 0.5 - Math.random());
    
    for (const instance of shuffled) {
        try {
            const url = `${instance}${endpoint}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            const res = await fetch(url, { 
                signal: controller.signal,
                next: { revalidate: 60 }
            });
            clearTimeout(timeoutId);
            
            if (!res.ok) continue;
            return await res.json();
        } catch (e) {
            lastError = e;
            console.warn(`Ghost Engine: Provider ${instance} failed, rotating...`);
        }
    }
    throw lastError || new Error("All Ghost Providers failed");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const relatedId = searchParams.get('related');
  const page = searchParams.get('page') || '1';
  
  try {
    let rawVideos = [];

    if (relatedId) {
        const data = await fetchWithGhostEngine(`/streams/${relatedId}`);
        rawVideos = data.relatedStreams || [];
    } else if (query && query !== 'All') {
        const data = await fetchWithGhostEngine(`/search?q=${encodeURIComponent(query)}&filter=all`);
        rawVideos = data.items || [];
    } else {
        // Rotational feed for Home page
        const regions = ['IN', 'US', 'GB'];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const data = await fetchWithGhostEngine(`/trending?region=${region}`);
        rawVideos = Array.isArray(data) ? data : (data.items || []);
    }

    const videos = rawVideos
        .filter((v: any) => v.type === 'stream' || v.videoId || v.url)
        .map((v: any) => {
            const id = v.videoId || v.url?.split('?v=')[1] || v.url?.replace('/watch?v=', '') || v.id;
            if (!id) return null;

            // Robust view count formatting
            let views = "LIVE";
            if (v.views && typeof v.views === 'number') {
                if (v.views >= 1000000) views = `${(v.views/1000000).toFixed(1)}M views`;
                else if (v.views >= 1000) views = `${(v.views/1000).toFixed(0)}K views`;
                else views = `${v.views} views`;
            }

            return {
                id,
                title: v.title || "YouTube Video",
                channel: v.uploaderName || v.uploader || "Channel",
                channelAvatar: v.uploaderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.uploaderName || 'Y')}&background=random&color=fff`,
                views: views,
                time: v.uploadedDate || v.uploadDate || "Recently",
                duration: v.duration === -1 ? "LIVE" : (typeof v.duration === 'number' ? new Date(v.duration * 1000).toISOString().substring(14, 19) : v.durationText || "10:42"),
                thumbnail: v.thumbnail || v.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
                isLive: v.duration === -1 || v.isLive
            };
        })
        .filter(Boolean);

    if (videos.length === 0) {
        return NextResponse.json({ error: "No Videos" }, { status: 404 });
    }

    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error("Ghost Engine Critical Failure:", error);
    return NextResponse.json({ error: "Offline", details: error.message }, { status: 503 });
  }
}
