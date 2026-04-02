// page.tsx — Página para agregar nuevo contenido a la biblioteca desde el panel de administración

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPlans } from "@core/actions/membership.actions";
import { getCategories } from "@core/actions/category.actions";
import { AddContentForm } from "@/components/gym/content/AddContentForm";

export default async function NewContentPage(): Promise<React.ReactNode> {
  const [plans, categories] = await Promise.all([
    getPlans(true),
    getCategories(true),
  ]);

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
        <span className="text-[11px] text-[#777]">Nuevo contenido</span>
      </div>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">
          Nuevo contenido
        </h1>
        <p className="text-xs text-[#555] mt-1">Agrega un recurso a la biblioteca</p>
      </div>

      <AddContentForm plans={plans} categories={categories} />
    </div>
  );
}
