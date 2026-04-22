// page.tsx — Redirige /owner → /owner/dashboard

import { redirect } from "next/navigation";

export default function OwnerRootPage(): never {
  redirect("/owner/dashboard");
}
