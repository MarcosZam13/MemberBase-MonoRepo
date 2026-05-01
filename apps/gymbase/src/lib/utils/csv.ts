// csv.ts — Utilidad para descargar datos como archivo CSV desde el cliente

// Descarga un array de objetos como archivo CSV en el navegador
// Se ejecuta 100% en cliente — no hace request al servidor
export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    if (val == null) return '""';
    const str = String(val);
    // Envolver en comillas si contiene comas, comillas o saltos de línea
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");

  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
