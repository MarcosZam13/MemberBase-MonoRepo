// DeletePostButton.tsx — Botón de borrado de post para el propio autor

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteOwnPostAction } from "@/actions/community.actions";

interface DeletePostButtonProps {
  postId: string;
}

export function DeletePostButton({ postId }: DeletePostButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    // Confirmación antes de eliminar permanentemente
    if (!window.confirm("¿Eliminar este post y todos sus comentarios? Esta acción no se puede deshacer.")) return;

    setIsPending(true);
    const result = await deleteOwnPostAction(postId);
    setIsPending(false);

    if (result.success) {
      toast.success("Post eliminado");
      router.push("/portal/community");
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al eliminar el post");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="w-4 h-4" />
      {isPending ? "Eliminando..." : "Eliminar post"}
    </Button>
  );
}
