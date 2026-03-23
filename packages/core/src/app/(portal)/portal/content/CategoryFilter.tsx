// CategoryFilter.tsx — Filtro de categorías del portal de contenido usando TagFilterBar

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TagFilterBar, type FilterTag } from "@/components/shared/TagFilterBar";
import type { ContentCategory } from "@/types/database";

interface CategoryFilterProps {
  categories: ContentCategory[];
  activeSlug: string | null;
  totalCount?: number;
}

export function CategoryFilter({ categories, activeSlug, totalCount }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (categories.length === 0) return null;

  function handleSelect(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      // El id aquí corresponde al slug de la categoría
      params.set("category", id);
    } else {
      params.delete("category");
    }
    router.push(`/portal/content?${params.toString()}`);
  }

  // Mapear categorías al formato genérico de FilterTag (usando slug como id para URL)
  const tags: FilterTag[] = categories.map((cat) => ({
    id: cat.slug,
    label: cat.name,
    color: cat.color,
  }));

  return (
    <TagFilterBar
      tags={tags}
      activeId={activeSlug}
      allLabel="Todo el contenido"
      allColor="#1E3A5F"
      allCount={totalCount}
      onSelect={handleSelect}
    />
  );
}
