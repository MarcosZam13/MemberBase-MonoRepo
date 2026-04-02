// page.tsx — Gestión de contenido del panel de administración con vista grid oscura

import { getAllContent } from "@core/actions/content.actions";
import { getPlans } from "@core/actions/membership.actions";
import { getCategories } from "@core/actions/category.actions";
import { GymContentClient } from "@/components/gym/content/GymContentClient";

export default async function AdminContentPage(): Promise<React.ReactNode> {
  const [content, plans, categories] = await Promise.all([
    getAllContent(),
    getPlans(),
    getCategories(),
  ]);
  return (
    <div className="p-6">
      <GymContentClient initialContent={content} plans={plans} categories={categories} />
    </div>
  );
}
