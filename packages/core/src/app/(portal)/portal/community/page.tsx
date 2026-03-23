// page.tsx — Feed de posts de la comunidad con filtros por tag y paginación visual

import { Suspense } from "react";
import Link from "next/link";
import { MessageSquare, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/shared/PostCard";
import { getPosts } from "@/actions/community.actions";
import { getUserSubscription } from "@/actions/payment.actions";
import { formatDate } from "@/lib/utils";
import { CommunityFilter } from "./CommunityFilter";

interface CommunityPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const { filter } = await searchParams;

  const [posts, subscription] = await Promise.all([
    getPosts(),
    getUserSubscription(),
  ]);

  const hasActiveSubscription = subscription?.status === "active";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Comunidad</h1>
          <p className="text-muted-foreground">
            {filteredPosts.length} publicación{filteredPosts.length !== 1 ? "es" : ""}
            {filter === "pinned" && " fijada" + (filteredPosts.length !== 1 ? "s" : "")}
            {filter === "recent" && " de los últimos 7 días"}
          </p>
        </div>
        {hasActiveSubscription && (
          <Button asChild>
            <Link href="/portal/community/new" className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Nuevo post
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros de tags — envuelto en Suspense porque usa useSearchParams */}
      <Suspense fallback={null}>
        <CommunityFilter totalCount={posts.length} pinnedCount={pinnedCount} />
      </Suspense>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">
            {filter === "pinned"
              ? "No hay posts fijados aún"
              : filter === "recent"
              ? "No hay posts nuevos en los últimos 7 días"
              : "Aún no hay publicaciones"}
          </p>
          {!filter && (
            <p className="text-sm mt-1">¡Sé el primero en compartir algo con la comunidad!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              author={post.author?.full_name ?? "Miembro"}
              date={formatDate(post.created_at)}
              commentCount={post.comment_count ?? 0}
              isPinned={post.is_pinned}
            />
          ))}
        </div>
      )}
    </div>
  );
}
