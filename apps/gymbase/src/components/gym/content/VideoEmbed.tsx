// VideoEmbed.tsx — Reproductor embebido de YouTube y Vimeo con aspect ratio 16:9

import { useMemo } from "react";

interface VideoEmbedProps {
  url: string;
  title?: string;
}

// Extrae el ID de YouTube desde URLs estándar, cortas y de embed
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extrae el ID de Vimeo desde URLs estándar y de player
function getVimeoId(url: string): string | null {
  const match = url.match(/(?:vimeo\.com\/)(\d+)/);
  return match ? match[1] : null;
}

export function VideoEmbed({ url, title = "Video" }: VideoEmbedProps): React.ReactNode {
  const embedSrc = useMemo(() => {
    const youtubeId = getYouTubeId(url);
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;
    }

    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      return `https://player.vimeo.com/video/${vimeoId}?color=FF5E14&title=0&byline=0`;
    }

    return null;
  }, [url]);

  // Si no es un proveedor reconocido, mostrar un fallback con enlace
  if (!embedSrc) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center h-40 rounded-xl bg-[#1a1a1a] border border-[#222] text-[#FF5E14] text-sm font-medium hover:bg-[#222] transition-colors"
      >
        Abrir video →
      </a>
    );
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={embedSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full rounded-xl"
        style={{ border: "none" }}
      />
    </div>
  );
}
