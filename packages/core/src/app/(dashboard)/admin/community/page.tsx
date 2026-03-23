// page.tsx — Panel de moderación de la comunidad para administradores

import { MessageSquare, Pin, EyeOff, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminPosts } from "@/actions/community.actions";
import { formatDate } from "@/lib/utils";
import CommunityModerationActions from "./CommunityModerationActions";

export default async function AdminCommunityPage() {
  const posts = await getAdminPosts();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comunidad</h1>
        <p className="text-muted-foreground">
          {posts.length} publicación{posts.length !== 1 ? "es" : ""} en total
        </p>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Comentarios</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay publicaciones en la comunidad
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id} className={!post.is_visible ? "opacity-60" : ""}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="flex items-center gap-2">
                      {post.is_pinned && <Pin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      <span className="truncate">{post.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {post.author?.full_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {post.comment_count ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.is_pinned && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Pin className="w-3 h-3" />
                          Fijado
                        </Badge>
                      )}
                      {!post.is_visible && (
                        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                          <EyeOff className="w-3 h-3" />
                          Oculto
                        </Badge>
                      )}
                      {post.is_visible && !post.is_pinned && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Eye className="w-3 h-3" />
                          Visible
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(post.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <CommunityModerationActions
                      postId={post.id}
                      isVisible={post.is_visible}
                      isPinned={post.is_pinned}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
