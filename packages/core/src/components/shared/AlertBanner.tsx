// AlertBanner.tsx — Banner de alerta con acento de borde izquierdo y acción opcional

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface AlertBannerProps {
  variant?: "info" | "warning" | "success" | "danger";
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const VARIANT_STYLES = {
  info:    { alert: "border-l-4 border-l-[#2563EB] bg-[#2563EB]/5", icon: "text-[#2563EB]" },
  warning: { alert: "border-l-4 border-l-[#D97706] bg-[#D97706]/5", icon: "text-[#D97706]" },
  success: { alert: "border-l-4 border-l-[#16A34A] bg-[#16A34A]/5", icon: "text-[#16A34A]" },
  danger:  { alert: "border-l-4 border-l-[#DC2626] bg-[#DC2626]/5", icon: "text-[#DC2626]" },
};

export function AlertBanner({ variant = "info", icon: Icon, message, actionLabel, onAction }: AlertBannerProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <Alert className={styles.alert}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${styles.icon} shrink-0`} />
        <AlertDescription className="flex-1 text-foreground">{message}</AlertDescription>
        {actionLabel && onAction && (
          <Button variant="outline" size="sm" onClick={onAction} className="shrink-0">
            {actionLabel}
          </Button>
        )}
      </div>
    </Alert>
  );
}
