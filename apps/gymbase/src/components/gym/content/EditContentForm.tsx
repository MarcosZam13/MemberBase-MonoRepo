// EditContentForm.tsx — Formulario para editar contenido existente desde el panel admin

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Video, FileText, FileDown, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { VideoEmbed } from "./VideoEmbed";
import { updateContent } from "@core/actions/content.actions";
import type { MembershipPlan, ContentCategory, ContentType, Content } from "@/types/database";

type VisibleType = "video" | "article" | "file" | "link";

const VISIBLE_TYPES: { value: VisibleType; label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; iconBg: string; iconColor: string }[] = [
  { value: "video",   label: "Video",    Icon: Video,    iconBg: "rgba(239,68,68,0.1)",  iconColor: "#EF4444" },
  { value: "article", label: "Artículo", Icon: FileText, iconBg: "rgba(56,189,248,0.1)", iconColor: "#38BDF8" },
  { value: "file",    label: "PDF",      Icon: FileDown, iconBg: "rgba(250,204,21,0.1)", iconColor: "#FACC15" },
  { value: "link",    label: "Enlace",   Icon: LinkIcon, iconBg: "rgba(34,197,94,0.1)",  iconColor: "#22C55E" },
];

const formSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  media_url: z.string().url("Ingresa una URL válida").optional().or(z.literal("")),
  thumbnail_url: z.string().url("Ingresa una URL válida").optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  is_published: z.boolean(),
  plan_ids: z.array(z.string().uuid()),
  sort_order: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditContentFormProps {
  content: Content & { plan_ids: string[] };
  plans: MembershipPlan[];
  categories: ContentCategory[];
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^?&\n]+)/,
    /youtube\.com\/shorts\/([^?&\n]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function EditContentForm({ content, plans, categories }: EditContentFormProps): React.ReactNode {
  const router = useRouter();

  // Inicializar tipo desde el contenido existente — "image" se trata como "file" en el selector
  const initialType: VisibleType =
    content.type === "image" ? "file" : (content.type as VisibleType) ?? "video";

  const [contentType, setContentType] = useState<VisibleType>(initialType);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>(content.plan_ids);
  const [serverError, setServerError] = useState<string | null>(null);
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: content.title,
      description: content.description ?? "",
      media_url: content.media_url ?? "",
      thumbnail_url: content.thumbnail_url ?? "",
      category_id: content.category_id ?? "",
      is_published: content.is_published,
      plan_ids: content.plan_ids,
      sort_order: content.sort_order ?? 0,
    },
  });

  const mediaUrl = watch("media_url");
  const isPublished = watch("is_published");

  useEffect(() => {
    if (!mediaUrl) { setYtVideoId(null); return; }
    const id = extractYouTubeId(mediaUrl);
    setYtVideoId(id);
    if (id) {
      const current = watch("thumbnail_url");
      // Solo auto-rellenar si el thumbnail está vacío o también era de YouTube
      if (!current || current.includes("img.youtube.com")) {
        setValue("thumbnail_url", `https://img.youtube.com/vi/${id}/mqdefault.jpg`);
      }
    }
  }, [mediaUrl, setValue, watch]);

  function togglePlan(planId: string): void {
    setSelectedPlanIds((prev) => {
      const next = prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId];
      setValue("plan_ids", next);
      return next;
    });
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setServerError(null);

    const payload = {
      id: content.id,
      ...values,
      type: contentType as ContentType,
      description: values.description || undefined,
      media_url: values.media_url || undefined,
      thumbnail_url: values.thumbnail_url || undefined,
      category_id: values.category_id || undefined,
      plan_ids: selectedPlanIds.length > 0 ? selectedPlanIds : plans.map((p) => p.id),
    };

    const result = await updateContent(payload);
    if (result.success) {
      toast.success("Contenido actualizado");
      router.push("/admin/content");
    } else {
      const error = typeof result.error === "string"
        ? result.error
        : "Verifica los campos del formulario";
      setServerError(error);
      toast.error(error);
    }
  }

  const sectionClass = "text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.1em] mb-3 mt-6 pb-2 border-b border-[#1a1a1a]";
  const labelClass = "text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-1.5 block";
  const inputClass = "h-9 bg-[#111] border-[#222] text-sm text-[#ddd] placeholder-[#3a3a3a] focus:border-[#FF5E14] rounded-lg";

  const activePlans = plans.filter((p) => p.is_active);
  const allPlansSelected = selectedPlanIds.length === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 max-w-2xl">
      {serverError && (
        <div className="flex gap-2.5 items-start p-3 bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] rounded-lg mb-4">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" className="mt-0.5 flex-shrink-0">
            <circle cx="7" cy="7" r="5.5" />
            <path d="M7 4.5v3M7 9.5v.1" />
          </svg>
          <p className="text-[11px] text-[#EF4444]">{serverError}</p>
        </div>
      )}

      {/* ── Tipo de contenido ── */}
      <div className={sectionClass}>Tipo de contenido</div>
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {VISIBLE_TYPES.map(({ value, label, Icon, iconBg, iconColor }) => {
          const isSelected = contentType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setContentType(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-[12px] border transition-all ${
                isSelected
                  ? "border-[rgba(255,94,20,0.4)] bg-[rgba(255,94,20,0.05)]"
                  : "border-[#1e1e1e] bg-[#0d0d0d] hover:border-[#2a2a2a]"
              }`}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
                <div style={{ color: iconColor }} className="flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              </div>
              <span className={`text-[11px] font-semibold ${isSelected ? "text-[#FF5E14]" : "text-[#666]"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Título ── */}
      <div className="mb-4">
        <label className={labelClass}>Título <span className="text-[#FF5E14]">*</span></label>
        <Input placeholder="Ej: Técnica correcta del press banca" className={inputClass} {...register("title")} />
        {errors.title && <p className="text-xs text-[#EF4444] mt-1">{errors.title.message}</p>}
      </div>

      {/* ── URL del recurso ── */}
      <div className="mb-4">
        <label className={labelClass}>
          {contentType === "video" ? "URL del video" : contentType === "file" ? "URL del PDF" : contentType === "link" ? "URL del enlace" : "URL del artículo"}
          {(contentType === "video" || contentType === "link") && <span className="text-[#FF5E14] ml-0.5">*</span>}
        </label>
        <Input
          type="url"
          placeholder={
            contentType === "video" ? "https://youtube.com/watch?v=..."
            : contentType === "file" ? "https://drive.google.com/file/..."
            : contentType === "link" ? "https://ejemplo.com/recurso"
            : "https://..."
          }
          className={inputClass}
          {...register("media_url")}
        />
        {errors.media_url && <p className="text-xs text-[#EF4444] mt-1">{errors.media_url.message}</p>}

        {contentType === "video" && mediaUrl && (mediaUrl.includes("youtube") || mediaUrl.includes("youtu.be") || mediaUrl.includes("vimeo")) ? (
          <div className="mt-2 rounded-xl overflow-hidden border border-[#1e1e1e]">
            <VideoEmbed url={mediaUrl} title="Preview" />
          </div>
        ) : contentType === "video" && (
          <div className="mt-2 h-8 bg-[#0d0d0d] border border-dashed border-[#1e1e1e] rounded-lg flex items-center justify-center">
            <p className="text-[10px] text-[#333]">El preview aparecerá al ingresar una URL de YouTube o Vimeo</p>
          </div>
        )}
      </div>

      {/* ── Categoría ── */}
      {categories.length > 0 && (
        <div className="mb-4">
          <label className={labelClass}>Categoría</label>
          <select
            className="w-full h-9 bg-[#111] border border-[#222] rounded-lg px-3 text-sm text-[#888] focus:border-[#FF5E14] focus:outline-none appearance-none"
            {...register("category_id")}
            style={{ colorScheme: "dark" }}
          >
            <option value="">Sin categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Descripción ── */}
      <div className="mb-4">
        <label className={labelClass}>Descripción</label>
        <textarea
          placeholder="Descripción del contenido..."
          className="w-full min-h-[80px] bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-[#888] placeholder-[#3a3a3a] focus:border-[#FF5E14] focus:outline-none resize-none font-sans"
          {...register("description")}
        />
      </div>

      {/* ── Imagen de portada ── */}
      <div className="mb-4">
        <label className={labelClass}>Imagen de portada (URL)</label>
        <Input type="url" placeholder="https://ejemplo.com/imagen.jpg" className={inputClass} {...register("thumbnail_url")} />
        {errors.thumbnail_url && <p className="text-xs text-[#EF4444] mt-1">{errors.thumbnail_url.message}</p>}
        {contentType === "video" && ytVideoId && (
          <p className="text-[10px] text-[#444] mt-1">Auto-rellenado con el thumbnail de YouTube · puedes sobreescribirlo</p>
        )}
      </div>

      {/* ── Visibilidad por plan ── */}
      {activePlans.length > 0 && (
        <div className="mb-4">
          <div className={sectionClass}>Visible para</div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setSelectedPlanIds([]); setValue("plan_ids", []); }}
              className={`h-7 px-3 flex items-center gap-1.5 rounded-full text-[11px] font-medium border transition-all ${
                allPlansSelected
                  ? "bg-[rgba(255,94,20,0.1)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                  : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 ${allPlansSelected ? "bg-[#FF5E14] border-[#FF5E14]" : "bg-[#1a1a1a] border-[#333]"}`}>
                {allPlansSelected && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M1 4l2 2 4-4" />
                  </svg>
                )}
              </div>
              Todos
            </button>
            {activePlans.map((plan) => {
              const isActive = selectedPlanIds.includes(plan.id);
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => togglePlan(plan.id)}
                  className={`h-7 px-3 flex items-center gap-1.5 rounded-full text-[11px] font-medium border transition-all ${
                    isActive
                      ? "bg-[rgba(255,94,20,0.1)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                      : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 ${isActive ? "bg-[#FF5E14] border-[#FF5E14]" : "bg-[#1a1a1a] border-[#333]"}`}>
                    {isActive && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M1 4l2 2 4-4" />
                      </svg>
                    )}
                  </div>
                  {plan.name}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[#444] mt-1.5">
            {allPlansSelected
              ? "Sin selección = visible para todos los miembros activos"
              : `Solo verán este contenido los miembros con: ${activePlans.filter((p) => selectedPlanIds.includes(p.id)).map((p) => p.name).join(", ")}`}
          </p>
        </div>
      )}

      {/* ── Orden de aparición ── */}
      <div className="mb-4">
        <label className={labelClass}>Orden de aparición</label>
        <Input
          type="number"
          min={0}
          placeholder="0"
          className={inputClass + " w-28"}
          {...register("sort_order", { valueAsNumber: true })}
        />
        <p className="text-[10px] text-[#444] mt-1">Número más bajo = aparece primero en la biblioteca</p>
      </div>

      {/* ── Toggle publicar ── */}
      <div className="flex items-center justify-between px-3.5 py-3 bg-[#111] border border-[#1a1a1a] rounded-xl mb-6">
        <div>
          <p className="text-[13px] font-medium text-[#ccc]">Publicado</p>
          <p className="text-[10px] text-[#555] mt-0.5">
            {isPublished ? "Visible para los miembros" : "Guardado como borrador"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setValue("is_published", !isPublished)}
          className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${isPublished ? "bg-[#FF5E14]" : "bg-[#2a2a2a]"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isPublished ? "translate-x-[18px]" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* ── Acciones ── */}
      <div className="flex gap-2.5 justify-end pt-4 border-t border-[#1a1a1a]">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="h-9 px-4 bg-[#1a1a1a] border-[#2a2a2a] text-[#777] hover:text-[#ccc] hover:bg-[#222]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-9 px-5 bg-[#FF5E14] hover:bg-[#e5540f] text-white gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
