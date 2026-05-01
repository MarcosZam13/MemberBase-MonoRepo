// CommunityFeedClient.tsx — Feed de posts con patrón "Cargar más" (load more) a partir de lista server

"use client";

import { useState } from "react";
import { PostCard } from "@core/components/shared/PostCard";
import type { CommunityPost } from "@/types/database";

const PAGE_SIZE = 10;

interface CommunityFeedClientProps {
  posts: CommunityPost[];
  currentUserId: string | null;
}

export function CommunityFeedClient({ posts, currentUserId }: CommunityFeedClientProps): React.ReactNode {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const visiblePosts = posts.slice(0, visible);
  const hasMore = visible < posts.length;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="h-9 px-6 rounded-xl text-sm font-semibold border transition-colors"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              borderColor: "var(--gym-border)",
              color: "var(--gym-text-muted)",
            }}
          >
            Cargar más ({posts.length - visible} restantes)
          </button>
        </div>
      )}
    </>
  );
}
