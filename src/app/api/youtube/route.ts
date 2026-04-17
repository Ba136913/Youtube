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
        if (type === "subscriptions") url = `https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&mine=true&maxResults=50`;
        else if (type === "liked") url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=50`;
        else url = `https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&mine=true&maxResults=50`;
        
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) return null;
        const data = await res.json();
        
        return data.items.map((item: any) => {
            const snip = item.snippet;
            const vidId = item.id?.videoId || item.contentDetails?.upload?.videoId || item.contentDetails?.playlistItem?.resourceId?.videoId || snip.resourceId?.videoId || (type === 'liked' ? item.id : null);
            if (!vidId) return null;

            return {
                id: vidId,
                title: snip.title,
                channel: snip.channelTitle,
                channelAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(snip.channelTitle || 'Y')}&background=random&color=fff`,
                views: item.statistics?.viewCount ? `${(parseInt(item.statistics.viewCount)/1000).toFixed(0)}K views` : "New Activity",
                time: new Date(snip.publishedAt).toLocaleDateString(),
                duration: "VIDEO",
                thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url,
                isLive: snip.liveBroadcastContent === 'live'
            };
        }).filter(Boolean);
    } catch (e) { return null; }
}

async function directScrape(url: string) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
            next: { revalidate: 3600 }
        });
        const html = await res.text();
        const match = html.match(/ytInitialData\s*=\s*({.+?});/s);
        if (!match) return null;
        
        const data = JSON.parse(match[1]);
        const videos: any[] = [];
        let currentVideo = null;

        // Try to extract main video details if it's a watch page
        try {
            const videoData = data.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer;
            const ownerData = data.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer;
            if (videoData) {
                currentVideo = {
                    id: '', // filled by caller
                    title: videoData.title?.runs?.[0]?.text,
                    channel: ownerData?.title?.runs?.[0]?.text,
                    channelAvatar: ownerData?.thumbnail?.thumbnails?.[0]?.url,
                    views: videoData.viewCount?.videoViewCountRenderer?.viewCount?.simpleText || '0 views',
                    time: videoData.dateText?.simpleText || 'Recently',
                    duration: 'VIDEO',
                    thumbnail: '', 
                };
            }
        } catch (e) {}

        const findVids = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            const v = obj.videoRenderer || obj.compactVideoRenderer || obj.richItemRenderer?.content?.videoRenderer;
            if (v && v.videoId) {
                videos.push({
                    id: v.videoId,
                    title: v.title?.runs?.[0]?.text || v.title?.simpleText,
                    channel: (v.longBylineText || v.shortBylineText || v.ownerText)?.runs?.[0]?.text,
                    channelAvatar: v.channelThumbnail?.thumbnails?.[0]?.url || v.thumbnail?.thumbnails?.[0]?.url,
                    views: (v.shortViewCountText || v.viewCountText)?.simpleText || "New",
                    time: v.publishedTimeText?.simpleText || "Just now",
                    duration: v.lengthText?.simpleText || "10:00",
                    thumbnail: v.thumbnail?.thumbnails?.sort((a:any,b:any)=>b.width-a.width)[0]?.url,
                    isLive: v.lengthText?.simpleText === "LIVE"
                });
            }
            Object.values(obj).forEach(findVids);
        };
        
        findVids(data);
        return { videos: videos.length > 0 ? videos : null, currentVideo };
    } catch (e) { return null; }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const related = searchParams.get('related');
  const type = searchParams.get('type');
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  try {
    let videos: any[] | null = null;
    let currentVideo = null;

    if (token && (type === 'subscriptions' || type === 'liked' || (!q && !related))) {
        videos = await fetchUserYouTubeData(token, type || 'activities');
    }

    if (!videos || videos.length === 0) {
        let scrapeUrl = `https://www.youtube.com/?gl=IN&hl=en`;
        if (related) scrapeUrl = `https://www.youtube.com/watch?v=${related}`;
        else if (type === 'shorts') scrapeUrl = `https://www.youtube.com/results?search_query=%23shorts`;
        else if (q && q !== 'All') scrapeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
        
        const res = await directScrape(scrapeUrl);
        videos = res?.videos || null;
        currentVideo = res?.currentVideo || null;
    }

    if (!videos || videos.length < 5) {
        const pipedUrl = related ? `/streams/${related}` : (type === 'shorts' ? `/search?q=%23shorts` : (q && q !== 'All' ? `/search?q=${encodeURIComponent(q)}` : `/trending?region=IN`));
        const data = await fetchFromPiped(pipedUrl);
        const raw = data?.relatedStreams || data?.items || (Array.isArray(data) ? data : []);
        videos = raw.map((v: any) => ({
            id: v.videoId || v.url?.split('?v=')[1] || v.id,
            title: v.title,
            channel: v.uploaderName || v.uploader,
            channelAvatar: v.uploaderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.uploaderName || 'Y')}&background=random`,
            views: v.shortViewCountText || (v.views ? `${(v.views/1000).toFixed(0)}K views` : "LIVE"),
            time: v.uploadedDate || v.time || "Recently",
            duration: v.duration === -1 ? "LIVE" : (typeof v.duration === 'string' ? v.duration : `${Math.floor(v.duration/60)}:${v.duration%60}`),
            thumbnail: v.thumbnail,
            isShort: type === 'shorts'
        })).filter((v:any) => v.id);
    }

    if (related && currentVideo) currentVideo.id = related;
    return NextResponse.json({ videos: videos || [], currentVideo });
  } catch (e) { return NextResponse.json({ videos: [] }); }
}
