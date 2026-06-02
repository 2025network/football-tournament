import Link from "next/link";

type LivestreamEmbedProps = {
  url: string | null | undefined;
  platform?: string | null;
  title?: string;
};

export function LivestreamEmbed({ url, platform, title = "Livestream" }: LivestreamEmbedProps) {
  if (!url) {
    return null;
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(url);

  if (youtubeEmbedUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-cyan-300/20 bg-black shadow-[0_0_35px_rgba(14,165,233,0.16)]">
        <div className="aspect-video w-full">
          <iframe
            className="h-full w-full"
            src={youtubeEmbedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{formatPlatform(platform)}</p>
      <p className="mt-2 text-lg font-black text-white">External livestream</p>
      <Link href={url} target="_blank" className="mt-4 inline-block rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white">
        Open Stream
      </Link>
    </div>
  );
}

export function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;

      const liveMatch = parsed.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch?.[1]) return `https://www.youtube.com/embed/${liveMatch[1]}`;

      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }
  } catch {
    return null;
  }

  return null;
}

function formatPlatform(platform?: string | null) {
  if (!platform) return "Stream";
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
}