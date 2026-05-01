// CommunityFilter.tsx — Filtro de posts por estado usando TagFilterBar

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TagFilterBar, type FilterTag } from "@/components/shared/TagFilterBar";

// Filtros disponibles en la comunidad
const COMMUNITY_TAGS: FilterTag[] = [
  { id: "pinned",  label: "Fijados",   color: "#FF5E14" },
  { id: "recent",  label: "Esta semana", color: "#22C55E" },
];

interface CommunityFilterProps {
  totalCount: number;
  pinnedCount: number;
}

export function CommunityFilter({ totalCount, pinnedCount }: CommunityFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter");

  function handleSelect(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("filter", id);
    } else {
      params.delete("filter");
    }
    router.push(`/portal/community?${params.toString()}`);
  }

  // Agregar contadores a los tags estáticos
  const tagsWithCounts: FilterTag[] = COMMUNITY_TAGS.map((tag) => ({
    ...tag,
    count: tag.id === "pinned" ? pinnedCount : undefined,
  }));

  return (
    <TagFilterBar
      tags={tagsWithCounts}
      activeId={activeFilter}
      allLabel="Todos los posts"
      allColor="#1E3A5F"
      allCount={totalCount}
      onSelect={handleSelect}
    />
  );
}
