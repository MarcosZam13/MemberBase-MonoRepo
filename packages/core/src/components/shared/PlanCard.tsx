// PlanCard.tsx — Tarjeta de plan de membresía con lista de beneficios y CTA

import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlanCardProps {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  isActive?: boolean;
  onSelect?: (id: string) => void;
}

// Convierte duration_days a texto legible
function formatDuration(days: number): string {
  if (days >= 365) return "año";
  if (days >= 30) return "mes";
  return `${days} días`;
}

export function PlanCard({ id, name, price, currency, durationDays, features, isActive, onSelect }: PlanCardProps) {
  return (
    <Card className={`shadow-sm transition-all ${isActive ? "border-2 border-[#2563EB]" : ""}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{name}</h3>
            {isActive && (
              <span className="inline-block mt-2 text-xs bg-[#2563EB]/10 text-[#2563EB] px-2 py-1 rounded">
                Plan actual
              </span>
            )}
          </div>

          <div>
            <span className="text-4xl font-bold text-foreground">
              {currency}{price.toLocaleString("es-CR")}
            </span>
            <span className="text-muted-foreground ml-2">/ {formatDuration(durationDays)}</span>
          </div>

          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          {onSelect && (
            <Button
              className="w-full bg-[#1E3A5F] hover:bg-[#2563EB]"
              onClick={() => onSelect(id)}
              disabled={isActive}
            >
              {isActive ? "Plan actual" : "Seleccionar plan"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
