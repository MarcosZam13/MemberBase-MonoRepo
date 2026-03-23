// page.tsx — Grid de contenido accesible según el plan del cliente con filtro por categoría

import { Suspense } from "react";
import Link from "next/link";
import { FileText, Video, Image as ImageIcon, FileDown, Link as LinkIcon, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContentForUser } from "@/actions/content.actions";
import { getUserSubscription } from "@/actions/payment.actions";
import { getCategories } from "@/actions/category.actions";
import { CategoryFilter } from "./CategoryFilter";
import type { ContentType } from "@/types/database";

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

interface PortalContentPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function PortalContentPage({ searchParams }: PortalContentPageProps) {
  const { category: categorySlug } = await searchParams;

  const [contentItems, subscription, categories] = await Promise.all([
    getContentForUser(),
    getUserSubscription(),
    getCategories(true), // solo activas
  ]);

  const hasActiveSubscription = subscription?.status === "active";

  // Si no tiene membresía activa, mostrar CTA para suscribirse
  if (!hasActiveSubscription) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Contenido exclusivo</h1>
        <div className="text-center py-16 space-y-4">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Necesitas una membresía activa para acceder al contenido.
          </p>
          <Button asChild>
            <Link href="/portal/plans">Ver planes disponibles</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Filtrar por categoría si hay un slug activo
  const filtered = categorySlug
    ? contentItems.filter((item) => {
        const cat = item.category as { slug: string } | null | undefined;
        return cat?.slug === categorySlug;
      })
    : contentItems;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contenido exclusivo</h1>
        <p className="text-muted-foreground">
          {filtered.length} elemento{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtro de categorías — envuelto en Suspense porque usa useSearchParams */}
      <Suspense fallback={null}>
        <CategoryFilter
          categories={categories}
          activeSlug={categorySlug ?? null}
          totalCount={contentItems.length}
        />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay contenido en esta categoría aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const TypeIcon = TYPE_ICONS[item.type];
            return (
              <Link key={item.id} href={`/portal/content/${item.id}`}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <TypeIcon className="w-4 h-4" />
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[item.type]}
                      </Badge>
                      {item.category && (
                        <Badge
                          className="text-xs text-white ml-auto"
                          style={{ backgroundColor: (item.category as { color: string }).color }}
                        >
                          {(item.category as { name: string }).name}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                  </CardHeader>
                  {item.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
