// page.tsx — Biblioteca de contenido exclusivo del portal con paginación URL-driven

import { Lock, BookOpen } from "lucide-react";
import Link from "next/link";
import { getContentForUserPaginated, getMyFavoriteIds } from "@/actions/content.actions";
import { getUserSubscription } from "@core/actions/payment.actions";
import { getCategories } from "@core/actions/category.actions";
import { PortalContentGrid } from "@/components/gym/content/PortalContentGrid";

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
  }>;
}

export default async function PortalContentPage({ searchParams }: PageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";
  const categorySlug = params.category ?? "";

  const [subscription, result, categories, favoriteIds] = await Promise.all([
    getUserSubscription(),
    getContentForUserPaginated({ page, pageSize: PAGE_SIZE, search: search || undefined, categorySlug: categorySlug || undefined }),
    getCategories(true),
    getMyFavoriteIds(),
  ]);

  const hasActiveSubscription = subscription?.status === "active";

  // Sin membresía activa — CTA para suscribirse
  if (!hasActiveSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#FF5E14]" />
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              Contenido exclusivo
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--gym-text-muted)" }}>
            Accede a artículos, videos y recursos de entrenamiento
          </p>
        </div>

        <div
          className="flex flex-col items-center gap-4 py-20 rounded-2xl"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[rgba(255,94,20,0.1)]">
            <Lock className="w-7 h-7 text-[#FF5E14]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Contenido exclusivo para miembros</p>
            <p className="text-sm mt-1" style={{ color: "var(--gym-text-muted)" }}>
              Necesitas una membresía activa para acceder.
            </p>
          </div>
          <Link
            href="/portal/plans"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#FF5E14] text-white"
          >
            Ver planes disponibles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-[#FF5E14]" />
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Contenido exclusivo
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--gym-text-muted)" }}>
          Artículos, videos y recursos de entrenamiento para ti
        </p>
      </div>

      {/* Grid interactivo con filtros URL-driven, paginación y modal de detalle */}
      <PortalContentGrid
        result={result}
        categories={categories}
        initialFavoriteIds={favoriteIds}
        currentSearch={search}
        currentCategorySlug={categorySlug}
      />
    </div>
  );
}
