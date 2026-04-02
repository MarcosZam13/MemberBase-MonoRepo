// page.tsx — Página para agregar un nuevo miembro desde el panel de administración

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPlans } from "@core/actions/membership.actions";
import { AddMemberForm } from "@/components/gym/members/AddMemberForm";

export default async function NewMemberPage(): Promise<React.ReactNode> {
  const plans = await getPlans(true);

  return (
    <div className="p-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/admin/members"
          className="flex items-center gap-1 text-[11px] text-[#555] hover:text-[#999] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Miembros
        </Link>
        <span className="text-[#333] text-[11px]">/</span>
        <span className="text-[11px] text-[#777]">Nuevo miembro</span>
      </div>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">
          Nuevo miembro
        </h1>
        <p className="text-xs text-[#555] mt-1">Crea la cuenta y asigna membresía</p>
      </div>

      <AddMemberForm plans={plans} />
    </div>
  );
}
