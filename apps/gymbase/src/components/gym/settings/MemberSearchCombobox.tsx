// MemberSearchCombobox.tsx — Selector de miembros con búsqueda en tiempo real para promover roles
// Usa un portal con position:fixed para que el dropdown no se corte por overflow:hidden de los padres

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, X, Mail, UserCheck } from "lucide-react";
import { searchMembers } from "@/actions/settings.actions";

interface MemberResult {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface MemberSearchComboboxProps {
  onEmailChange: (email: string) => void;
  resetKey?: number;
}

function getInitials(name: string | null, email: string): string {
  if (!name) return email[0].toUpperCase();
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MemberSearchCombobox({ onEmailChange, resetKey }: MemberSearchComboboxProps): React.ReactNode {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<MemberResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<MemberResult | null>(null);
  // Posición del dropdown calculada en px para el portal fixed
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Resetear al enviar formulario exitosamente
  useEffect(() => {
    setInputValue("");
    setResults([]);
    setIsOpen(false);
    setSelected(null);
  }, [resetKey]);

  // Calcular posición del dropdown basada en el input
  function updateDropdownPos() {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }

  // Cerrar dropdown al hacer clic fuera (tanto del input como del dropdown portal)
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      const clickedInsideInput = inputWrapperRef.current?.contains(target);
      const clickedInsideDropdown = dropdownRef.current?.contains(target);
      if (!clickedInsideInput && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Recalcular posición si el usuario hace scroll mientras el dropdown está abierto
  useEffect(() => {
    if (!isOpen) return;
    function handleScroll() { updateDropdownPos(); }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen]);

  // Búsqueda con debounce de 300ms
  const runSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    const data = await searchMembers(query);
    setResults(data);
    setIsLoading(false);
    updateDropdownPos();
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (selected) return;
    const timer = setTimeout(() => runSearch(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue, selected, runSearch]);

  function handleSelect(member: MemberResult) {
    setSelected(member);
    setInputValue(member.full_name ?? member.email);
    setIsOpen(false);
    setResults([]);
    onEmailChange(member.email);
  }

  function handleClear() {
    setSelected(null);
    setInputValue("");
    setResults([]);
    setIsOpen(false);
    onEmailChange("");
  }

  function handleInputChange(value: string) {
    setInputValue(value);
    if (selected) {
      setSelected(null);
      onEmailChange("");
    }
  }

  const isValidEmail = EMAIL_REGEX.test(inputValue);
  const showInviteOption =
    isValidEmail && !selected && !isLoading && results.length === 0 && inputValue.length > 2;

  function handleUseDirectEmail() {
    onEmailChange(inputValue);
    setIsOpen(false);
  }

  const hasContent = inputValue.length > 0 || !!selected;

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos?.top ?? 0,
        left: dropdownPos?.left ?? 0,
        width: dropdownPos?.width ?? 0,
        zIndex: 9999,
      }}
      className="rounded-md border border-border bg-popover shadow-lg overflow-hidden"
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
          Buscando...
        </div>
      ) : results.length > 0 ? (
        <div className="max-h-52 overflow-y-auto">
          {results.map((member) => (
            <button
              key={member.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // evita que onBlur del input cierre el dropdown antes del click
              onClick={() => handleSelect(member)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold shrink-0">
                {getInitials(member.full_name, member.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate leading-tight">
                  {member.full_name ?? member.email}
                </p>
                {member.full_name && (
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                )}
                {member.role === "admin" && (
                  <p className="text-[10px] text-primary mt-0.5">Ya es administrador</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : showInviteOption ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleUseDirectEmail}
          className="w-full flex items-center gap-2.5 px-3 py-3 text-left hover:bg-accent transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm">
              Invitar a <span className="font-medium">{inputValue}</span>
            </p>
            <p className="text-xs text-muted-foreground">Enviar invitación por correo</p>
          </div>
        </button>
      ) : (
        <div className="px-3 py-3 text-sm text-muted-foreground">
          No se encontraron usuarios
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 min-w-0">
      {/* Campo de búsqueda */}
      <div ref={inputWrapperRef} className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              updateDropdownPos();
              setIsOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
            if (e.key === "Enter" && showInviteOption) {
              e.preventDefault();
              handleUseDirectEmail();
            }
          }}
          placeholder="Buscar por nombre o correo..."
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          autoComplete="off"
        />
        {hasContent && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown renderizado en portal para escapar del overflow:hidden del Card */}
      {isOpen && dropdownPos && typeof window !== "undefined" &&
        createPortal(dropdownContent, document.body)
      }

      {/* Confirmación visual de selección */}
      {selected && (
        <p className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <UserCheck className="w-3 h-3 text-primary shrink-0" />
          {selected.email}
        </p>
      )}
    </div>
  );
}
