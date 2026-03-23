// CommentForm.tsx — Formulario inline para agregar un comentario a un post

"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCommentAction } from "@/actions/community.actions";

interface CommentFormProps {
  postId: string;
}

export default function CommentForm({ postId }: CommentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const body = textareaRef.current?.value.trim() ?? "";
    if (!body) return;

    startTransition(async () => {
      const result = await addCommentAction(postId, { body });
      if (!result.success) {
        setError(typeof result.error === "string" ? result.error : "Error al enviar");
        return;
      }
      // Limpiar el textarea tras enviar exitosamente
      if (textareaRef.current) textareaRef.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2">
      <Textarea
        ref={textareaRef}
        name="body"
        placeholder="Escribe un comentario..."
        rows={3}
        maxLength={1000}
        disabled={isPending}
        className="resize-none"
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Enviando..." : "Comentar"}
      </Button>
    </form>
  );
}
