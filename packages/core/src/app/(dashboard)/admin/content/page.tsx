// page.tsx — Gestión de contenido del panel de administración

import { ContentClient } from "./ContentClient";
import { getAllContent } from "@/actions/content.actions";
import { getPlans } from "@/actions/membership.actions";
import { getCategories } from "@/actions/category.actions";

export default async function AdminContentPage() {
  const [content, plans, categories] = await Promise.all([
    getAllContent(),
    getPlans(),
    getCategories(),
  ]);
  return <ContentClient initialContent={content} plans={plans} categories={categories} />;
}
