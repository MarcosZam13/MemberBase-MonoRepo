// Pagination.tsx — Componente de paginación reutilizable para todas las tablas de la app

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  pageSize?: number;
}

export function Pagination({ totalPages, currentPage }: PaginationProps): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(page: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  const pages = buildPageRange(currentPage, totalPages);

  const btnBase =
    "flex h-8 min-w-8 px-2 items-center justify-center rounded-md text-sm font-medium transition-colors";

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btnBase} border border-[#1E1E1E] text-white/50 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e-${i}`} className="px-2 text-white/30 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => goToPage(p as number)}
            className={`${btnBase} ${
              currentPage === p
                ? "bg-[#FF5E14] text-white"
                : "border border-[#1E1E1E] text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${btnBase} border border-[#1E1E1E] text-white/50 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <span className="ml-3 text-xs text-white/30">
        Página {currentPage} de {totalPages}
      </span>
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
