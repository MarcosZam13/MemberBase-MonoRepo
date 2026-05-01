// ProgressPhotoUpload.tsx — Modal para que el admin suba fotos de progreso de un miembro

"use client";

import { useState, useRef, useTransition } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadProgressPhoto } from "@/actions/health.actions";

interface ProgressPhotoUploadProps {
  memberId: string;
}

const PHOTO_TYPES = [
  { value: "front", label: "Frente" },
  { value: "side",  label: "Lado"   },
  { value: "back",  label: "Espalda" },
] as const;

export function ProgressPhotoUpload({ memberId }: ProgressPhotoUploadProps): React.ReactNode {
  const [open, setOpen]           = useState(false);
  const [photoType, setPhotoType] = useState<"front" | "side" | "back">("front");
  const [preview, setPreview]     = useState<string | null>(null);
  const [notes, setNotes]         = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    // Limpiar URL anterior para evitar memory leak
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  function handleClose(): void {
    if (preview) URL.revokeObjectURL(preview);
    setOpen(false);
    setPreview(null);
    setNotes("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit(): void {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Seleccioná una foto primero"); return; }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("memberId", memberId);
      fd.append("photoType", photoType);
      if (notes.trim()) fd.append("notes", notes.trim());

      const result = await uploadProgressPhoto(fd);
      if (result.success) {
        handleClose();
      } else {
        setError(typeof result.error === "string" ? result.error : "Error al subir");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
        style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1430" }}
      >
        <Camera className="w-3.5 h-3.5" />
        Agregar foto
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[16px] p-5 w-full max-w-sm space-y-4 max-h-[85vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#FF5E14] font-semibold uppercase tracking-[0.08em]">
                Agregar foto de progreso
              </p>
              <button
                onClick={handleClose}
                className="p-1 rounded-md text-[#444] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de tipo (Frente / Lado / Espalda) */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#555] uppercase tracking-[0.07em]">Tipo</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PHOTO_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setPhotoType(value)}
                    className="py-2 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      backgroundColor: photoType === value ? "#FF5E1420" : "#0d0d0d",
                      color: photoType === value ? "#FF5E14" : "#666",
                      border: `1px solid ${photoType === value ? "#FF5E1440" : "#161616"}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Área de preview / selección de archivo */}
            <div
              className="relative h-44 rounded-[10px] overflow-hidden flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: "#0d0d0d", border: "1px dashed #2a2a2a" }}
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#444]">
                  <Camera className="w-8 h-8" />
                  <p className="text-[11px]">Tap para seleccionar foto</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Notas opcionales */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#555] uppercase tracking-[0.07em]">Notas (opcional)</p>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Inicio del ciclo, semana 4..."
                className="w-full bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2 text-[12px] text-[#ccc] outline-none focus:border-[#FF5E14] transition-colors"
              />
            </div>

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium bg-[#0d0d0d] text-[#666] border border-[#161616] hover:text-[#888] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: "#FF5E14", color: "white" }}
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Subiendo...
                  </span>
                ) : (
                  "Guardar foto"
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
