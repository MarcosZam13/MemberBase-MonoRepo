// PeriodSelector.tsx — Toggle week/month/year que actualiza el searchParam ?period=

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { OwnerPeriod } from "@core/types/owner";

const PERIODS: { value: OwnerPeriod; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
];

interface PeriodSelectorProps {
  current: OwnerPeriod;
}

export function PeriodSelector({ current }: PeriodSelectorProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (period: OwnerPeriod): void => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex items-center gap-1 bg-[#111111] border border-[#1E1E1E] rounded-lg p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => handleChange(p.value)}
          className={[
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            current === p.value
              ? "bg-[#FF5E14] text-white"
              : "text-[#737373] hover:text-white hover:bg-white/5",
          ].join(" ")}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
