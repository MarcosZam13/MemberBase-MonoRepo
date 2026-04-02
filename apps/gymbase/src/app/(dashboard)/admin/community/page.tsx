// page.tsx — Panel de moderación de la comunidad para administradores con compose box

import { getAdminPosts } from "@core/actions/community.actions";
import { formatDate } from "@/lib/utils";
import { AdminPostComposer } from "@/components/gym/community/AdminPostComposer";
import CommunityModerationActions from "@core/app/(dashboard)/admin/community/CommunityModerationActions";

export default async function AdminCommunityPage(): Promise<React.ReactNode> {
  const posts = await getAdminPosts();

  // Separar fijados de normales para mostrar fijados al tope
  const pinned = posts.filter((p) => p.is_pinned);
  const rest = posts.filter((p) => !p.is_pinned);
  const ordered = [...pinned, ...rest];

  const pendingCount = posts.filter((p) => !p.is_visible).length;

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">
            Comunidad
          </h1>
          <p className="text-xs text-[#555] mt-1">{posts.length} publicaciones en total</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] text-[#FACC15]">
            {pendingCount} ocultos
          </span>
        )}
      </div>

      {/* Caja de publicación del admin */}
      <AdminPostComposer />

      {/* Lista de posts */}
      <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1a1a1a]">
          <span className="text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em]">
            Posts y publicaciones
          </span>
        </div>

        <div className="divide-y divide-[#0f0f0f]">
          {ordered.length === 0 ? (
            <p className="text-center text-[#444] text-sm py-12">
              No hay publicaciones en la comunidad
            </p>
          ) : (
            ordered.map((post) => (
              <div
                key={post.id}
                className={`px-5 py-4 flex items-start gap-4 transition-colors hover:bg-[#111] ${
                  !post.is_visible ? "opacity-50" : ""
                } ${post.is_pinned ? "border-l-2 border-[#FACC15]" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  {/* Header del post */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {post.is_pinned && (
                      <span className="text-[9px] font-bold text-[#FACC15] uppercase tracking-[0.06em] flex items-center gap-1">
                        📌 Admin
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-[#ddd] truncate">{post.title}</span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[10px] text-[#555]">
                    <span>{post.author?.full_name ?? "Anónimo"}</span>
                    <span>·</span>
                    <span>{post.comment_count ?? 0} comentarios</span>
                    <span>·</span>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                </div>

                {/* Estado badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {post.is_pinned && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] text-[#FACC15]">
                      Fijado
                    </span>
                  )}
                  {!post.is_visible && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#161616] border border-[#222] text-[#555]">
                      Oculto
                    </span>
                  )}
                </div>

                {/* Acciones de moderación */}
                <CommunityModerationActions
                  postId={post.id}
                  isVisible={post.is_visible}
                  isPinned={post.is_pinned}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
