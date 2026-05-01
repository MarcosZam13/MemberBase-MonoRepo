// AddAdminDialog.tsx — Modal para buscar miembros y asignarles un rol admin u owner

"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus, Shield, Crown, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Dialog, DialogPortal, DialogOverlay } from "@core/components/ui/dialog";
import { Button } from "@core/components/ui/button";
import { searchMembers, promoteToAdmin, promoteToOwner } from "@/actions/settings.actions";
import type { AdminProfile } from "@/actions/settings.actions";

interface MemberResult {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface AddAdminDialogProps {
  isOwner: boolean;
  onSuccess: (profile: AdminProfile) => void;
}

function getInitials(name: string | null, email: string): string {
  if (!name) return email[0].toUpperCase();
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// Paleta de colores para avatares — hash por id
const AVATAR_COLORS = [
  { bg: "#1e0f06", text: "#FF5E14" },
  { bg: "#0d1a0d", text: "#22C55E" },
  { bg: "#0d0d2a", text: "#818CF8" },
  { bg: "#1a0d1a", text: "#E879F9" },
  { bg: "#0d1a1a", text: "#38BDF8" },
];
function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AddAdminDialog({ isOwner, onSuccess }: AddAdminDialogProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<MemberResult | null>(null);
  const [role, setRole] = useState<"admin" | "owner">("admin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpiar estado al cerrar el modal
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setRole("admin");
      setError(null);
    }
  }, [open]);

  // Búsqueda con debounce de 300ms
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const data = await searchMembers(q);
    setResults(data);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // Limpiar selección si el usuario empieza a buscar de nuevo
  function handleQueryChange(value: string) {
    setQuery(value);
    if (selected) setSelected(null);
  }

  async function handleConfirm() {
    if (!selected) return;
    setIsSubmitting(true);
    setError(null);

    const result = role === "owner"
      ? await promoteToOwner(selected.email)
      : await promoteToAdmin(selected.email);

    setIsSubmitting(false);

    if (!result.success) {
      setError(typeof result.error === "string" ? result.error : "Error al asignar rol");
      return;
    }

    toast.success(
      `${selected.full_name ?? selected.email} ahora es ${role === "owner" ? "Owner" : "Administrador"}`
    );
    setOpen(false);
    onSuccess({
      id: selected.id,
      full_name: selected.full_name,
      email: selected.email,
      role,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <>
      {/* Trigger — botón fuera del Dialog para mejor control */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 shrink-0"
      >
        <UserPlus className="w-4 h-4" />
        Agregar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          {/* Overlay con blur fuerte */}
          <DialogOverlay className="bg-black/60 backdrop-blur-sm" />

          {/* Panel del modal — usar DialogPrimitive.Popup para que base-ui maneje Escape y click en overlay */}
          <DialogPrimitive.Popup
            className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2
                        max-w-[calc(100vw-2rem)] sm:max-w-md
                        rounded-2xl overflow-hidden shadow-2xl
                        flex flex-col
                        data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95
                        data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            style={{
              backgroundColor: "#0f0f0f",
              border: "1px solid #1e1e1e",
              maxHeight: "min(600px, 90vh)",
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-start justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid #1a1a1a" }}
            >
              <div>
                <p className="text-sm font-semibold text-white">Agregar al equipo</p>
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                  {isOwner
                    ? "Selecciona un miembro y asígnale un rol"
                    : "Selecciona un miembro para hacerlo administrador"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10 text-[#555] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Buscador ── */}
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "#555" }}
                />
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  autoComplete="off"
                  className="w-full h-9 rounded-lg pl-9 pr-4 text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #252525",
                    color: "#e5e5e5",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF5E14")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#252525")}
                />
              </div>
            </div>

            {/* ── Lista de miembros ── */}
            <div className="overflow-y-auto flex-1">
              {isSearching ? (
                // Estado de carga
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#FF5E14" }} />
                  <p className="text-xs" style={{ color: "#555" }}>Buscando miembros...</p>
                </div>

              ) : results.length > 0 ? (
                // Resultados
                <div>
                  {results.map((member) => {
                    const isSelected = selected?.id === member.id;
                    const colors = avatarColor(member.id);
                    const isAlreadyAdmin = member.role === "admin";

                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelected(isSelected ? null : member)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          backgroundColor: isSelected ? "rgba(255,94,20,0.08)" : "transparent",
                          borderBottom: "1px solid #141414",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#161616";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }}
                      >
                        {/* Avatar con iniciales */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {getInitials(member.full_name, member.email)}
                        </div>

                        {/* Nombre y email */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "#e5e5e5" }}>
                            {member.full_name ?? member.email}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: "#555" }}>
                            {member.email}
                          </p>
                        </div>

                        {/* Estado derecho */}
                        {isAlreadyAdmin ? (
                          <span
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ backgroundColor: "rgba(255,94,20,0.1)", color: "#FF5E14", border: "1px solid rgba(255,94,20,0.2)" }}
                          >
                            <Shield className="w-2.5 h-2.5" />
                            Admin
                          </span>
                        ) : isSelected ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "#FF5E14" }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full shrink-0"
                            style={{ border: "2px solid #2a2a2a" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

              ) : query.length >= 2 ? (
                // Sin resultados
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <p className="text-sm" style={{ color: "#555" }}>
                    No se encontraron usuarios con <span className="text-[#888]">"{query}"</span>
                  </p>
                </div>

              ) : (
                // Estado inicial
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                  <Search className="w-8 h-8" style={{ color: "#2a2a2a" }} />
                  <p className="text-sm" style={{ color: "#555" }}>
                    Escribe el nombre o correo del miembro
                  </p>
                </div>
              )}
            </div>

            {/* ── Footer — aparece al seleccionar alguien ── */}
            {selected && (
              <div
                className="px-4 py-3 shrink-0"
                style={{ borderTop: "1px solid #1a1a1a", backgroundColor: "#0a0a0a" }}
              >
                {error && (
                  <p className="text-xs text-red-400 mb-2">{error}</p>
                )}
                <div className="flex items-center gap-2">
                  {/* Nombre seleccionado */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "#888" }}>
                      {selected.full_name ?? selected.email}
                    </p>
                  </div>

                  {/* Selector de rol — solo para owners */}
                  {isOwner && (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as "admin" | "owner")}
                      className="h-8 rounded-lg px-2 text-xs outline-none shrink-0"
                      style={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        color: "#e5e5e5",
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  )}

                  {/* Botón confirmar */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirm}
                    className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-opacity disabled:opacity-50 shrink-0"
                    style={{ backgroundColor: "#FF5E14", color: "white" }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : role === "owner" ? (
                      <Crown className="w-3.5 h-3.5" />
                    ) : (
                      <Shield className="w-3.5 h-3.5" />
                    )}
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
