// PostCard.tsx — Tarjeta de post de comunidad con pin, autor, fecha y conteo de comentarios

import Link from "next/link";
import { Pin, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PostCardProps {
  id: string;
  title: string;
  author: string;
  date: string;
  commentCount: number;
  isPinned?: boolean;
}

export function PostCard({ id, title, author, date, commentCount, isPinned }: PostCardProps) {
  return (
    <Link href={`/portal/community/${id}`}>
      <Card className="hover:bg-[#F9FAFB] transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {isPinned && (
              <Pin className="w-4 h-4 text-[#2563EB] shrink-0 mt-1" fill="currentColor" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{author}</span>
                <span>•</span>
                <span>{date}</span>
                <span className="flex items-center gap-1 ml-auto">
                  <MessageCircle className="w-4 h-4" />
                  {commentCount}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
