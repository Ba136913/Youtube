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
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) continue;
            const data = await res.json();
            if (data) return data;
        } catch (e) { continue; }
    }
    return null;
}

async function fetchUserYouTubeData(accessToken: string, type: string) {
    try {
        let url = "";
        if (type === "subscriptions") {
            url = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50`;
        } else if (type === "liked") {
            url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=20`;
        } else {
            url = `https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&mine=true&maxResults=40`;
        }
        
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) return null;
        const data = await res.json();
        
        return data.items.map((item: any) => {
            const snip = item.snippet;
            const vidId = item.id?.videoId || item.contentDetails?.upload?.videoId || item.contentDetails?.playlistItem?.resourceId?.videoId || snip.resourceId?.videoId || (type === 'liked' ? item.id : null);
            
            if (!vidId && type !== 'subscriptions') return null;

            return {
                id: vidId || snip.resourceId?.channelId,
                title: snip.title,
                channel: snip.channelTitle || snip.title,
                channelAvatar: snip.thumbnails?.default?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(snip.channelTitle || 'Y')}&background=random`,
                views: item.statistics?.viewCount ? `${(parseInt(item.statistics.viewCount)/1000).toFixed(0)}K views` : "Real Activity",
                time: new Date(snip.publishedAt).toLocaleDateString(),
                duration: item.contentDetails?.duration?.replace('PT', '').replace('M', ':').replace('S', '') || "VIDEO",
                thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url,
                isLive: snip.liveBroadcastContent === 'live'
            };
        }).filter(Boolean);
    } catch (e) { return null; }
}

async function directScrape(url: string) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
                const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || "YouTube Video";
                const channel = v.longBylineText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || v.ownerText?.runs?.[0]?.text || "Channel";
                const duration = v.lengthText?.simpleText || v.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || "10:00";
                const thumb = v.thumbnail?.thumbnails?.sort((a: any, b: any) => b.width - a.width)[0]?.url;
                
                if (!videos.find(x => x.id === v.videoId)) {
                    videos.push({
                        id: v.videoId,
                        title,
                        channel,
                        channelAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=random&color=fff`,
                        views: v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || "New",
                        time: v.publishedTimeText?.simpleText || "Just now",
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
  const type = searchParams.get('type'); // For history/subs
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  try {
    let videos: any[] | null = null;

    // 1. AUTHENTICATED USER DATA
    if (token) {
        if (type === 'subscriptions') videos = await fetchUserYouTubeData(token, "subscriptions");
        else if (type === 'liked') videos = await fetchUserYouTubeData(token, "liked");
        else if (!q && !related) {
            const activities = await fetchUserYouTubeData(token, "activities");
            if (activities && activities.length > 0) videos = activities;
        }
    }

    // 2. SCRAPER & RELATED
    if (!videos || videos.length === 0) {
        if (related) {
            videos = await directScrape(`https://www.youtube.com/watch?v=${related}`);
        } else if (q && q !== 'All') {
            videos = await directScrape(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
        } else {
            videos = await directScrape(`https://www.youtube.com/?gl=IN&hl=en`);
        }
    }

    // 3. PIPED FALLBACK
    if (!videos || videos.length < 5) {
        const pipedUrl = related ? `/streams/${related}` : (q && q !== 'All' ? `/search?q=${encodeURIComponent(q)}` : `/trending?region=IN`);
        const data = await fetchFromPiped(pipedUrl);
        const raw = data?.relatedStreams || data?.items || (Array.isArray(data) ? data : []);
        videos = raw.map((v: any) => ({
            id: v.videoId || v.url?.split('?v=')[1] || v.id,
            title: v.title,
            channel: v.uploaderName || v.uploader,
            channelAvatar: v.uploaderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.uploaderName || 'Y')}&background=random`,
            views: v.shortViewCountText || (v.views ? `${(v.views/1000).toFixed(0)}K views` : "LIVE"),
            time: v.uploadedDate || v.time || "Recently",
            duration: v.duration === -1 || v.isLive ? "LIVE" : (typeof v.duration === 'string' ? v.duration : `${Math.floor(v.duration/60)}:${v.duration%60}`),
            thumbnail: v.thumbnail || v.thumbnailUrl,
            isLive: v.duration === -1 || v.isLive
        })).filter((v:any) => v.id);
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (e) {
    return NextResponse.json({ videos: [] });
  }
}
