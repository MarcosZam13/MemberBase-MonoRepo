// ContentClient.tsx — Gestión interactiva de contenido con CRUD y toggle de publicación

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, FileText, Video, Image as ImageIcon, FileDown, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import { createContentSchema, type CreateContentInput } from "@/lib/validations/content";
import { createContent, togglePublished, deleteContent } from "@/actions/content.actions";
import type { Content, MembershipPlan, ContentType, ContentCategory } from "@/types/database";

const TYPE_ICONS: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  article: FileText,
  video: Video,
  image: ImageIcon,
  file: FileDown,
  link: LinkIcon,
};

const TYPE_LABELS: Record<ContentType, string> = {
  article: "Artículo",
  video: "Video",
  image: "Imagen",
  file: "Archivo",
  link: "Enlace",
};

interface ContentClientProps {
  initialContent: Content[];
  plans: MembershipPlan[];
  categories: ContentCategory[];
}

export function ContentClient({ initialContent, plans, categories }: ContentClientProps) {
  const [content, setContent] = useState<Content[]>(initialContent);
  const [showDialog, setShowDialog] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>("article");

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<z.input<typeof createContentSchema>, unknown, CreateContentInput>({
    resolver: zodResolver(createContentSchema),
    defaultValues: { type: "article", is_published: false, sort_order: 0, plan_ids: [], category_id: "" },
  });

  const togglePlanSelection = (planId: string) => {
    const updated = selectedPlanIds.includes(planId)
      ? selectedPlanIds.filter((id) => id !== planId)
      : [...selectedPlanIds, planId];
    setSelectedPlanIds(updated);
    setValue("plan_ids", updated);
  };

  const handleDelete = async (item: Content) => {
    // Confirmación nativa antes de eliminar de forma permanente
    if (!window.confirm(`¿Eliminar "${item.title}"? Esta acción no se puede deshacer.`)) return;

    const result = await deleteContent(item.id);
    if (result.success) {
      setContent((prev) => prev.filter((c) => c.id !== item.id));
      toast.success("Contenido eliminado");
    } else {
      toast.error("Error al eliminar el contenido");
    }
  };

  const handleTogglePublished = async (item: Content) => {
    const result = await togglePublished(item.id, !item.is_published);
    if (result.success) {
      setContent((prev) =>
        prev.map((c) => c.id === item.id ? { ...c, is_published: !item.is_published } : c)
      );
      toast.success(item.is_published ? "Movido a borrador" : "Contenido publicado");
    } else {
      toast.error("Error al cambiar el estado");
    }
  };

  const onSubmit = async (data: CreateContentInput) => {
    setServerError(null);
    setIsPending(true);
    const result = await createContent({ ...data, plan_ids: selectedPlanIds });
    setIsPending(false);

    if (!result.success) {
      setServerError(typeof result.error === "string" ? result.error : "Error al crear el contenido");
      return;
    }

    toast.success("Contenido creado correctamente");
    setShowDialog(false);
    reset();
    setSelectedPlanIds([]);
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contenido</h1>
          <p className="text-muted-foreground">{content.length} elemento{content.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo contenido
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Planes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay contenido creado aún
                </TableCell>
              </TableRow>
            ) : (
              content.map((item) => {
                const TypeIcon = TYPE_ICONS[item.type];
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TypeIcon className="w-4 h-4" />
                        <span className="text-sm">{TYPE_LABELS[item.type]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="outline" className="text-xs" style={{ borderColor: (item.category as unknown as ContentCategory).color }}>
                          {(item.category as unknown as ContentCategory).name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(item.plans as unknown as MembershipPlan[] | undefined)?.map((p) => (
                          <Badge key={p.id} variant="outline" className="text-xs">{p.name}</Badge>
                        )) ?? <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_published ? "default" : "secondary"}>
                        {item.is_published ? "Publicado" : "Borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleTogglePublished(item)}
                        >
                          {item.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {item.is_published ? "Ocultar" : "Publicar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: crear contenido */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo contenido</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label>Tipo de contenido</Label>
              <Select
                defaultValue="article"
                onValueChange={(v) => { setContentType(v as ContentType); setValue("type", v as ContentType); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as ContentType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoría opcional */}
            {categories.length > 0 && (
              <div className="space-y-1.5">
                <Label>Categoría (opcional)</Label>
                <Select
                  defaultValue=""
                  onValueChange={(v) => setValue("category_id", v || undefined)}
                >
                  <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin categoría</SelectItem>
                    {categories.filter((c) => c.is_active).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register("title")} />
              {errors.title && <p className="text-sm text-danger">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea id="description" rows={2} {...register("description")} />
            </div>

            {(contentType === "video" || contentType === "image" || contentType === "file" || contentType === "link") && (
              <div className="space-y-1.5">
                <Label htmlFor="media_url">URL del contenido</Label>
                <Input id="media_url" type="url" placeholder="https://..." {...register("media_url")} />
                {errors.media_url && <p className="text-sm text-danger">{errors.media_url.message}</p>}
              </div>
            )}

            {contentType === "article" && (
              <div className="space-y-1.5">
                <Label htmlFor="body">Contenido del artículo</Label>
                <Textarea id="body" rows={6} placeholder="Escribe el contenido aquí..." {...register("body")} />
              </div>
            )}

            {/* Selección de planes */}
            <div className="space-y-2">
              <Label>Planes con acceso</Label>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">Crea un plan primero</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => togglePlanSelection(plan.id)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        selectedPlanIds.includes(plan.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {plan.name}
                    </button>
                  ))}
                </div>
              )}
              {errors.plan_ids && <p className="text-sm text-danger">{errors.plan_ids.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Crear contenido"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
