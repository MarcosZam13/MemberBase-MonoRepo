// page.tsx — Feed de posts de la comunidad con filtros y reacciones estilo WhatsApp

import { Suspense } from "react";
import { MessageSquare } from "lucide-react";
import { PostCard } from "@/components/shared/PostCard";
import { getPosts } from "@/actions/community.actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { CommunityFilter } from "./CommunityFilter";

interface CommunityPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const { filter } = await searchParams;

  const [posts, user] = await Promise.all([
    getPosts(),
    getCurrentUser(),
  ]);

  // Aplicar filtro del tag activo
  const filteredPosts = (() => {
    if (filter === "pinned") return posts.filter((p) => p.is_pinned);
    if (filter === "recent") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return posts.filter((p) => new Date(p.created_at) >= sevenDaysAgo);
    }
    return posts;
  })();

  const pinnedCount = posts.filter((p) => p.is_pinned).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white font-barlow tracking-tight leading-none uppercase">
          Comunidad
        </h1>
        <p className="text-[#555] text-sm mt-1">
          {filteredPosts.length} publicación{filteredPosts.length !== 1 ? "es" : ""}
          {filter === "pinned" && " fijada" + (filteredPosts.length !== 1 ? "s" : "")}
          {filter === "recent" && " de los últimos 7 días"}
        </p>
      </div>

      {/* Filtros de tags — envuelto en Suspense porque usa useSearchParams */}
      <Suspense fallback={null}>
        <CommunityFilter totalCount={posts.length} pinnedCount={pinnedCount} />
      </Suspense>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-10 h-10 mx-auto mb-4 text-[#333]" />
          <p className="text-[#555] font-medium text-sm">
            {filter === "pinned"
              ? "No hay posts fijados aún"
              : filter === "recent"
              ? "No hay posts nuevos en los últimos 7 días"
              : "Aún no hay publicaciones"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
