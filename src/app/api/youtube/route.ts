import { NextResponse } from 'next/server';

const GHOST_PROVIDERS = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.lunar.icu',
    'https://pipedapi.smnz.de',
    'https://api.piped.vicr.me',
    'https://piped-api.garudadns.xyz',
    'https://api-piped.mha.fi'
];

async function fetchFromPiped(endpoint: string) {
    const shuffled = [...GHOST_PROVIDERS].sort(() => 0.5 - Math.random());
    for (const instance of shuffled) {
        try {
            const url = `${instance}${endpoint}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (!res.ok) continue;
            const data = await res.json();
            if (data) return data;
        } catch (e) { continue; }
    }
    return null;
}

// FETCH REAL USER DATA FROM GOOGLE API
async function fetchUserYouTubeData(accessToken: string, type: string) {
    try {
        let url = "";
        if (type === "subscriptions") {
            url = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=20`;
        } else {
            url = `https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&mine=true&maxResults=20`;
        }
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) return null;
        const data = await res.json();
        
        return data.items.map((item: any) => {
            const snip = item.snippet;
            const vidId = item.contentDetails?.upload?.videoId || item.contentDetails?.playlistItem?.resourceId?.videoId || snip.resourceId?.videoId;
            if (!vidId && type !== "subscriptions") return null;
            
            return {
                id: vidId || snip.resourceId?.channelId,
                title: snip.title,
                channel: snip.channelTitle,
                channelAvatar: snip.thumbnails?.default?.url,
                views: "Real User Activity",
                time: new Date(snip.publishedAt).toLocaleDateString(),
                duration: "VIDEO",
                thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url,
                isLive: false
            };
        }).filter(Boolean);
    } catch (e) { return null; }
}

async function directScrape(url: string) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept-Language': 'en-IN,en-US,en;q=0.9',
            },
            next: { revalidate: 3600 }
        });
        const html = await res.text();
        const match = html.match(/ytInitialData\s*=\s*({.+?});/s);
        if (!match) return null;
        
        const data = JSON.parse(match[1]);
        const videos: any[] = [];
        
        const findVids = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            const v = obj.videoRenderer || obj.richItemRenderer?.content?.videoRenderer || obj.compactVideoRenderer;
            if (v && v.videoId) {
                const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || "Video";
                const channel = v.longBylineText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || v.ownerText?.runs?.[0]?.text || "Channel";
                const duration = v.lengthText?.simpleText || v.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || "10:42";
                const thumb = v.thumbnail?.thumbnails?.sort((a: any, b: any) => b.width - a.width)[0]?.url;
                
                if (!videos.find(x => x.id === v.videoId)) {
                    videos.push({
                        id: v.videoId,
                        title,
                        channel,
                        channelAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=random&color=fff`,
                        views: v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || "LIVE",
                        time: v.publishedTimeText?.simpleText || "Recently",
                        duration,
                        thumbnail: thumb?.startsWith('//') ? 'https:' + thumb : thumb,
                        isLive: duration === "LIVE"
                    });
                }
            }
            Object.values(obj).forEach(findVids);
        };
        
        findVids(data);
        return videos.length > 0 ? videos : null;
    } catch (e) { return null; }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const related = searchParams.get('related');
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  try {
    let videos = null;

    // 1. IF USER IS LOGGED IN, GET REAL ACCOUNT DATA
    if (token && !q && !related) {
        videos = await fetchUserYouTubeData(token, "activities");
        if (!videos || videos.length === 0) videos = await fetchUserYouTubeData(token, "subscriptions");
    }

    // 2. SCRAPER (Results or Related)
    if (!videos || videos.length === 0) {
        if (related) {
            videos = await directScrape(`https://www.youtube.com/watch?v=${related}`);
        } else if (q && q !== 'All') {
            videos = await directScrape(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
        } else {
            videos = await directScrape(`https://www.youtube.com/?gl=IN&hl=en`);
        }
    }

    // 3. PIPED FALLBACK (Trending/Search)
    if (!videos || videos.length < 5) {
        const pipedUrl = related ? `/streams/${related}` : (q && q !== 'All' ? `/search?q=${encodeURIComponent(q)}` : `/trending?region=IN`);
        const data = await fetchFromPiped(pipedUrl);
        const raw = data?.relatedStreams || data?.items || (Array.isArray(data) ? data : []);
        videos = raw.map((v: any) => ({
            id: v.videoId || v.url?.split('?v=')[1] || v.id,
            title: v.title,
            channel: v.uploaderName || v.uploader,
            channelAvatar: v.uploaderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.uploaderName || 'Y')}&background=random`,
            views: v.shortViewCountText || (v.views ? (v.views > 1000000 ? `${(v.views/1000000).toFixed(1)}M views` : `${(v.views/1000).toFixed(0)}K views`) : "LIVE"),
            time: v.uploadedDate || v.time || "Recently",
            duration: v.duration === -1 || v.isLive ? "LIVE" : (typeof v.duration === 'string' ? v.duration : new Date(v.duration * 1000).toISOString().substring(14, 19)),
            thumbnail: v.thumbnail || v.thumbnailUrl,
            isLive: v.duration === -1 || v.isLive
        })).filter((v:any) => v.id);
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (e) {
    return NextResponse.json({ videos: [] });
  }
}
