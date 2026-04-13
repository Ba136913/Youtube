import { NextResponse } from 'next/server';

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.lunar.icu',
    'https://pipedapi.smnz.de'
];

async function fetchFromPiped(endpoint: string) {
    for (const instance of PIPED_INSTANCES) {
        try {
            const url = `${instance}${endpoint}`;
            const res = await fetch(url, { next: { revalidate: 300 } });
            if (!res.ok) continue;
            const data = await res.json();
            return data;
        } catch (e) {
            console.warn(`Failed fetching from ${instance}`, e);
        }
    }
    throw new Error("All Piped instances failed");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const relatedId = searchParams.get('related');
  
  try {
    let rawVideos = [];

    if (relatedId) {
        // Fetch related videos
        const data = await fetchFromPiped(`/streams/${relatedId}`);
        rawVideos = data.relatedStreams || [];
    } else if (query && query !== 'trending') {
        // Fetch search results
        const data = await fetchFromPiped(`/search?q=${encodeURIComponent(query)}&filter=all`);
        rawVideos = data.items || [];
    } else {
        // Fetch trending India
        const data = await fetchFromPiped(`/trending?region=IN`);
        rawVideos = data || [];
    }

    const videos = rawVideos
        .filter((v: any) => v.type === 'stream')
        .map((v: any) => ({
            id: v.url?.split('?v=')[1] || v.url?.replace('/watch?v=', '') || v.id,
            title: v.title,
            channel: v.uploaderName,
            channelAvatar: v.uploaderAvatar,
            views: v.views ? `${v.views.toLocaleString()} views` : "LIVE",
            time: v.uploadedDate || "Recently",
            duration: v.isShort ? "Short" : (v.duration === -1 ? "LIVE" : new Date(v.duration * 1000).toISOString().substring(14, 19)),
            thumbnail: v.thumbnail,
            isLive: v.duration === -1
        }));

    if (videos.length === 0) {
        return NextResponse.json({ error: "Empty" }, { status: 404 });
    }

    // Return a shuffled/paginated set to simulate infinite scroll if needed.
    // Piped gives large arrays. We can slice it or return all.
    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
