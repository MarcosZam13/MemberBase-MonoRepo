// opaque-id.ts — Codifica/decodifica UUIDs como base64url corto para URLs limpias

const BASE64URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Convierte un UUID (sin guiones) a base64url — resultado de ~22 chars en vez de 36
export function toOpaqueId(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  let result = "";
  for (let i = 0; i < 15; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result += BASE64URL_CHARS[(b0 >> 2) & 0x3f];
    result += BASE64URL_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f];
    result += BASE64URL_CHARS[((b1 << 2) | (b2 >> 6)) & 0x3f];
    result += BASE64URL_CHARS[b2 & 0x3f];
  }
  // Último byte (índice 15)
  const last = bytes[15];
  result += BASE64URL_CHARS[(last >> 2) & 0x3f];
  result += BASE64URL_CHARS[(last << 4) & 0x3f];

  return result;
}

// Decodifica un opaque ID de vuelta al UUID original con guiones
export function fromOpaqueId(opaque: string): string {
  // Si ya es un UUID estándar (36 chars con guiones), retornar tal cual
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opaque)) {
    return opaque;
  }

  const bytes = new Uint8Array(16);
  const chars = opaque.split("").map((c) => BASE64URL_CHARS.indexOf(c));

  // 5 grupos de 4 chars → 3 bytes (cubre bytes 0–14)
  for (let i = 0; i < 5; i++) {
    const ci = i * 4;
    bytes[i * 3]     = ((chars[ci] << 2) | (chars[ci + 1] >> 4)) & 0xff;
    bytes[i * 3 + 1] = ((chars[ci + 1] << 4) | (chars[ci + 2] >> 2)) & 0xff;
    bytes[i * 3 + 2] = ((chars[ci + 2] << 6) | chars[ci + 3]) & 0xff;
  }
  // Último byte desde los 2 chars restantes (índices 20–21)
  bytes[15] = ((chars[20] << 2) | (chars[21] >> 4)) & 0xff;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
