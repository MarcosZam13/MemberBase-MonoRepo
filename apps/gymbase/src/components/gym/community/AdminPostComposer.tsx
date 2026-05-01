// AdminPostComposer.tsx — Compositor de posts para admins con imagen de portada y segmentación por plan

"use client";

import { useState, useRef, useTransition } from "react";
import { Pin, ImageIcon, X, ChevronDown, ChevronUp, Users } from "lucide-react";
import { createPostAction, uploadPostCover } from "@core/actions/community.actions";
import { toast } from "sonner";
import type { MembershipPlan } from "@core/types/database";

interface AdminPostComposerProps {
  plans: MembershipPlan[];
}

export function AdminPostComposer({ plans }: AdminPostComposerProps): React.ReactNode {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bodyChars = body.length;
  const bodyLimit = 5000;
  const isBodyNearLimit = bodyChars > bodyLimit * 0.9;

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    setCoverFile(file);
    // Preview local antes de subir
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  }

  function handleRemoveImage() {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function togglePlan(planId: string) {
    setSelectedPlanIds((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    startTransition(async () => {
      let cover_image_url: string | null = null;
      let cover_image_path: string | null = null;

      // Subir imagen si hay una seleccionada
      if (coverFile) {
        const fd = new FormData();
        fd.append("file", coverFile);
        const uploadResult = await uploadPostCover(fd);

        if (!uploadResult.success) {
          toast.error(typeof uploadResult.error === "string" ? uploadResult.error : "Error al subir la imagen");
          return;
        }
        cover_image_url = uploadResult.data!.url;
        cover_image_path = uploadResult.data!.path;
      }

      const result = await createPostAction({
        title: title.trim(),
        body: body.trim(),
        is_pinned: isPinned,
        cover_image_url,
        cover_image_path,
        plan_ids: selectedPlanIds.length > 0 ? selectedPlanIds : undefined,
      });

      if (result.success) {
        // Resetear formulario
        setTitle("");
        setBody("");
        setIsPinned(false);
        setSelectedPlanIds([]);
        setCoverFile(null);
        setCoverPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast.success("Publicación creada correctamente");
      } else {
        const msg = typeof result.error === "string" ? result.error : "Error al publicar";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-[16px] p-4 mb-4">
      <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
        📌 Publicar como admin
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Título */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del anuncio o post..."
          maxLength={100}
          className="w-full h-9 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 text-sm text-[#ccc] placeholder-[#444] outline-none focus:border-[#FF5E1440] transition-colors"
        />

        {/* Cuerpo con contador */}
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el contenido del post..."
            maxLength={bodyLimit}
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-[#ccc] placeholder-[#444] outline-none focus:border-[#FF5E1440] resize-none transition-colors"
          />
          <span
            className="absolute bottom-2 right-3 text-[10px]"
            style={{ color: isBodyNearLimit ? "#EF4444" : "#444" }}
          >
            {bodyChars}/{bodyLimit}
          </span>
        </div>

        {/* Preview de imagen de portada */}
        {coverPreview && (
          <div className="relative rounded-lg overflow-hidden" style={{ height: "120px" }}>
            <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selector de plan */}
        {showPlanSelector && plans.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 space-y-2">
            <p className="text-[10px] text-[#555] uppercase tracking-[0.06em]">Visible para los planes:</p>
            <div className="flex flex-wrap gap-1.5">
              {plans.map((plan) => {
                const isSelected = selectedPlanIds.includes(plan.id);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => togglePlan(plan.id)}
                    className="h-7 px-2.5 rounded-full text-[11px] font-medium transition-all cursor-pointer"
                    style={{
                      background: isSelected ? "rgba(255,94,20,0.12)" : "#1a1a1a",
                      border: `1px solid ${isSelected ? "rgba(255,94,20,0.3)" : "#2a2a2a"}`,
                      color: isSelected ? "#FF5E14" : "#666",
                    }}
                  >
                    {plan.name}
                  </button>
                );
              })}
            </div>
            {selectedPlanIds.length === 0 && (
              <p className="text-[10px] text-[#444]">Sin restricción → visible para todos los miembros</p>
            )}
          </div>
        )}

        {/* Barra de acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Upload imagen */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
            id="post-cover-input"
          />
          <label
            htmlFor="post-cover-input"
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
            style={{
              background: coverFile ? "rgba(34,197,94,0.08)" : "#1a1a1a",
              border: `1px solid ${coverFile ? "rgba(34,197,94,0.25)" : "#2a2a2a"}`,
              color: coverFile ? "#22C55E" : "#666",
            }}
          >
            <ImageIcon className="w-3 h-3" />
            {coverFile ? "Imagen lista" : "Imagen"}
          </label>

          {/* Segmentación por plan */}
          <button
            type="button"
            onClick={() => setShowPlanSelector((v) => !v)}
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
            style={{
              background: selectedPlanIds.length > 0 ? "rgba(34,197,94,0.08)" : "#1a1a1a",
              border: `1px solid ${selectedPlanIds.length > 0 ? "rgba(34,197,94,0.25)" : "#2a2a2a"}`,
              color: selectedPlanIds.length > 0 ? "#22C55E" : "#666",
            }}
          >
            <Users className="w-3 h-3" />
            {selectedPlanIds.length > 0 ? `${selectedPlanIds.length} plan${selectedPlanIds.length > 1 ? "es" : ""}` : "Todos"}
            {showPlanSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Toggle Fijar */}
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
            style={{
              background: isPinned ? "rgba(250,204,21,0.08)" : "#1a1a1a",
              border: `1px solid ${isPinned ? "rgba(250,204,21,0.25)" : "#2a2a2a"}`,
              color: isPinned ? "#FACC15" : "#666",
            }}
          >
            <Pin className="w-3 h-3" />
            Fijar
          </button>

          {/* Publicar */}
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !body.trim()}
            className="h-7 px-3 bg-[#FF5E14] disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-opacity hover:opacity-90 ml-auto cursor-pointer"
          >
            {isSubmitting ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
