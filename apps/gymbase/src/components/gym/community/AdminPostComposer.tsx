// AdminPostComposer.tsx — Caja de publicación del admin en la comunidad con categoría y opción de fijar

"use client";

import { useState } from "react";
import { Pin } from "lucide-react";
import { createPostAction, togglePostPinnedAction } from "@core/actions/community.actions";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "logros", label: "Logros" },
  { value: "motivacion", label: "Motivación" },
  { value: "retos", label: "Retos" },
  { value: "anuncios", label: "Anuncios" },
];

export function AdminPostComposer(): React.ReactNode {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinAfterPost, setPinAfterPost] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);

    const result = await createPostAction({ title, body });

    if (result.success) {
      // Si el admin quiere fijar el post, llamar al action de pin con el id devuelto
      if (pinAfterPost && result.data) {
        await togglePostPinnedAction(result.data, true);
      }
      setTitle("");
      setBody("");
      setPinAfterPost(false);
      setFeedback({ type: "success", message: "Publicación creada correctamente" });
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al publicar";
      setFeedback({ type: "error", message: msg });
    }
    setIsSubmitting(false);
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4 mb-4">
      <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
        📌 Publicar como admin
      </p>

      {feedback && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${
          feedback.type === "success"
            ? "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22C55E]"
            : "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444]"
        }`}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex gap-2.5 items-start">
          {/* Avatar admin */}
          <div className="w-8 h-8 rounded-full bg-[#FF5E1420] border border-[#FF5E1440] flex items-center justify-center text-[11px] font-bold font-barlow text-[#FF5E14] flex-shrink-0">
            GB
          </div>
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del anuncio o post..."
              className="w-full h-8 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#FF5E1440]"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe un anuncio o post para la comunidad..."
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#FF5E1440] resize-none"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pl-10">
          {/* Toggle Fijar */}
          <button
            type="button"
            onClick={() => setPinAfterPost(!pinAfterPost)}
            className={`h-7 px-2.5 flex items-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all ${
              pinAfterPost
                ? "bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.25)] text-[#FACC15]"
                : "bg-[#1a1a1a] border-[#2a2a2a] text-[#666] hover:border-[#333]"
            }`}
          >
            <Pin className="w-3 h-3" />
            Fijar
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !body.trim()}
            className="h-7 px-3 bg-[#FF5E14] disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-opacity hover:opacity-90 ml-auto"
          >
            {isSubmitting ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
