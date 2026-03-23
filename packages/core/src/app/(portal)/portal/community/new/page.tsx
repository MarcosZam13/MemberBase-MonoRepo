// page.tsx — Formulario para crear un nuevo post en la comunidad

import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserSubscription } from "@/actions/payment.actions";
import NewPostForm from "./NewPostForm";

export default async function NewPostPage() {
  const subscription = await getUserSubscription();

  // Solo miembros activos pueden publicar
  if (subscription?.status !== "active") {
    redirect("/portal/community");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/portal/community">
          <ArrowLeft className="w-4 h-4" />
          Volver a la comunidad
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Nueva publicación</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Comparte algo con la comunidad
        </p>
      </div>

      <NewPostForm />
    </div>
  );
}
