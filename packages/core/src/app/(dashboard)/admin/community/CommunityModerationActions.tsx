// CommunityModerationActions.tsx — Acciones de moderación (pin/ocultar/eliminar) por post

"use client";

import { useTransition } from "react";
import { Pin, PinOff, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  togglePostVisibilityAction,
  togglePostPinnedAction,
  deletePostAction,
} from "@/actions/community.actions";
import { toast } from "sonner";

interface CommunityModerationActionsProps {
  postId: string;
  isVisible: boolean;
  isPinned: boolean;
}

export default function CommunityModerationActions({
  postId,
  isVisible,
  isPinned,
}: CommunityModerationActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggleVisibility() {
    startTransition(async () => {
      const result = await togglePostVisibilityAction(postId, !isVisible);
      if (!result.success) {
        toast.error(typeof result.error === "string" ? result.error : "Error al actualizar");
      } else {
        toast.success(isVisible ? "Post ocultado" : "Post visible");
      }
    });
  }

  function handleTogglePin() {
    startTransition(async () => {
      const result = await togglePostPinnedAction(postId, !isPinned);
      if (!result.success) {
        toast.error(typeof result.error === "string" ? result.error : "Error al actualizar");
      } else {
        toast.success(isPinned ? "Post desfijado" : "Post fijado");
      }
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este post y todos sus comentarios? Esta acción no se puede deshacer.")) return;

    startTransition(async () => {
      const result = await deletePostAction(postId);
      if (!result.success) {
        toast.error(typeof result.error === "string" ? result.error : "Error al eliminar");
      } else {
        toast.success("Post eliminado");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={isPending}
        onClick={handleTogglePin}
        title={isPinned ? "Desfijar" : "Fijar post"}
      >
        {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={isPending}
        onClick={handleToggleVisibility}
        title={isVisible ? "Ocultar" : "Mostrar"}
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        disabled={isPending}
        onClick={handleDelete}
        title="Eliminar post"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
