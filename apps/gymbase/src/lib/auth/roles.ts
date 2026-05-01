// roles.ts — Helpers para verificar roles de usuario sin repetir lógica en cada action

// Retorna true si el usuario puede ejecutar acciones de administración del gym
export function isAdminOrOwner(role: string): boolean {
  return role === "admin" || role === "owner";
}

// Retorna true para acciones que admin, owner y trainers pueden ejecutar
export function canManageRoutines(role: string): boolean {
  return role === "admin" || role === "owner" || role === "trainer";
}

export function isOwner(role: string): boolean {
  return role === "owner";
}
