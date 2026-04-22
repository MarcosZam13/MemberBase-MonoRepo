// StatCard.tsx — Tarjeta de KPI con valor actual, delta porcentual y etiqueta

interface StatCardProps {
  label: string;
  value: string;
  delta?: number | null;
  suffix?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  suffix,
  icon,
  highlight = false,
}: StatCardProps): React.ReactElement {
  const hasDelta = delta !== undefined && delta !== null;
  const isPositive = hasDelta && delta >= 0;
  const deltaText = hasDelta
    ? `${isPositive ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`
    : null;

  return (
    <div
      className={[
        "bg-[#111111] border rounded-xl p-5 flex flex-col gap-3",
        highlight ? "border-[#FF5E14]/40" : "border-[#1E1E1E]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm text-[#737373]">{label}</span>
        {icon && (
          <span className="p-2 rounded-lg bg-[#FF5E14]/10 text-[#FF5E14]">{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="font-barlow font-bold text-3xl text-white leading-none">
          {value}
        </span>
        {suffix && <span className="text-sm text-[#737373] mb-0.5">{suffix}</span>}
      </div>
      {deltaText && (
        <span
          className={[
            "text-xs font-medium",
            isPositive ? "text-green-400" : "text-red-400",
          ].join(" ")}
        >
          {deltaText} vs período anterior
        </span>
      )}
    </div>
  );
}
