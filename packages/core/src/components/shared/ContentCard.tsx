// ContentCard.tsx — Tarjeta de contenido con tipo, categoría con color y descripción recortada

import Link from "next/link";
import { FileText, Video, Image as ImageIcon, FileDown, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentType } from "@/types/database";

const TYPE_ICONS: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  article: FileText,
  video:   Video,
  image:   ImageIcon,
  file:    FileDown,
  link:    LinkIcon,
};

const TYPE_LABELS: Record<ContentType, string> = {
  article: "Artículo",
  video:   "Video",
  image:   "Imagen",
  file:    "Archivo",
  link:    "Enlace",
};

interface ContentCardProps {
  id: string;
  type: ContentType;
  category: string;
  categoryColor: string;
  title: string;
  description: string;
}

export function ContentCard({ id, type, category, categoryColor, title, description }: ContentCardProps) {
  const Icon = TYPE_ICONS[type];

  return (
    <Link href={`/portal/content/${id}`}>
      <Card className="h-full hover:border-[#2563EB] transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-[#F9FAFB] text-[#6B7280] px-2 py-1 gap-1">
                <Icon className="w-3 h-3" />
                {TYPE_LABELS[type]}
              </Badge>
              {category && (
                <Badge
                  variant="secondary"
                  style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
                  className="px-2 py-1"
                >
                  {category}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
