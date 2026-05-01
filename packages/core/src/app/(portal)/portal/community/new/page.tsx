// page.tsx — Creación de posts ya no está disponible para miembros; solo admins publican

import { redirect } from "next/navigation";

export default function NewPostPage() {
  // Los posts de comunidad solo los crean admins desde el panel de administración
  redirect("/portal/community");
}
