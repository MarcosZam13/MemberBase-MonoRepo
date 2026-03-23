// NewPostForm.tsx — Formulario de creación de post con validación del lado cliente

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { createPostAction } from "@/actions/community.actions";

export default function NewPostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get("title") as string,
      body: formData.get("body") as string,
    };

    startTransition(async () => {
      const result = await createPostAction(payload);
      if (!result.success) {
        const err = result.error;
        setError(typeof err === "string" ? err : "Revisa los campos del formulario");
        return;
      }
      router.push(`/portal/community/${result.data}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          placeholder="¿Sobre qué quieres hablar?"
          required
          minLength={5}
          maxLength={120}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Contenido</Label>
        <Textarea
          id="body"
          name="body"
          placeholder="Escribe tu publicación aquí..."
          required
          minLength={10}
          maxLength={5000}
          rows={8}
          disabled={isPending}
          className="resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Publicando..." : "Publicar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
