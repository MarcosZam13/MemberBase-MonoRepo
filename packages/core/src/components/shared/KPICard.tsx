// KPICard.tsx — Tarjeta de KPI para dashboards con icono colorido, valor y link

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
  description?: string;
  linkText?: string;
  linkHref?: string;
}

export function KPICard({
  icon: Icon,
  iconColor,
  iconBg,
  value,
  label,
  description,
  linkText = "Ver detalle →",
  linkHref,
}: KPICardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold text-foreground">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {linkHref && (
              <Link href={linkHref} className="text-xs text-[#2563EB] hover:underline inline-block mt-1">
                {linkText}
              </Link>
            )}
          </div>
          <div className={`${iconBg} ${iconColor} p-3 rounded-lg shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
