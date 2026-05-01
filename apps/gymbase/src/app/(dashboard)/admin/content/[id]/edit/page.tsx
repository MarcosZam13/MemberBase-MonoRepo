// page.tsx — Página de edición de contenido existente en el panel de administración

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPlans } from "@core/actions/membership.actions";
import { getCategories } from "@core/actions/category.actions";
import { getContentByIdForAdmin } from "@/actions/content.actions";
import { EditContentForm } from "@/components/gym/content/EditContentForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContentPage({ params }: PageProps): Promise<React.ReactNode> {
  const { id } = await params;

  const [content, plans, categories] = await Promise.all([
    getContentByIdForAdmin(id),
    getPlans(true),
    getCategories(true),
  ]);

  if (!content) notFound();

  return (
    <div className="p-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/admin/content"
          className="flex items-center gap-1 text-[11px] text-[#555] hover:text-[#999] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Contenido
        </Link>
        <span className="text-[#333] text-[11px]">/</span>
        <span className="text-[11px] text-[#777] truncate max-w-[200px]">{content.title}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">
          Editar contenido
        </h1>
        <p className="text-xs text-[#555] mt-1">Modifica los datos del recurso</p>
      </div>

      <EditContentForm content={content} plans={plans} categories={categories} />
    </div>
  );
}
