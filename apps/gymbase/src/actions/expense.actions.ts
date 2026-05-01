// expense.actions.ts — Server actions para gestión de gastos operativos del gym

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "equipamiento"
  | "renta"
  | "salarios"
  | "servicios"
  | "marketing"
  | "otro";

export interface GymExpense {
  id: string;
  org_id: string;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  expense_date: string;
  created_by: string;
  created_at: string;
}

export interface ExpenseStats {
  total: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

// ─── Validación ───────────────────────────────────────────────────────────────

const addExpenseSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0"),
  category: z.enum(["equipamiento", "renta", "salarios", "servicios", "marketing", "otro"]),
  description: z.string().max(300).optional().nullable(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

// ─── Acciones ─────────────────────────────────────────────────────────────────

// Registra un nuevo gasto — solo admin/owner
export async function addExpense(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner"].includes(user.role)) {
    return { success: false, error: "Sin permisos para registrar gastos" };
  }

  const parsed = addExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    const { error } = await supabase.from("gym_expenses").insert({
      org_id: orgId,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      expense_date: parsed.data.expenseDate,
      created_by: user.id,
    });

    if (error) throw error;

    revalidatePath("/owner/finances");
    return { success: true };
  } catch (error) {
    console.error("[addExpense] Error:", error);
    return { success: false, error: "No se pudo registrar el gasto. Intenta de nuevo." };
  }
}

// Obtiene los gastos en un rango de fechas — solo admin/owner
export async function getExpenses(params: {
  startDate: string;
  endDate: string;
}): Promise<GymExpense[]> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner"].includes(user.role)) return [];

  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    const { data, error } = await supabase
      .from("gym_expenses")
      .select("id, org_id, amount, category, description, expense_date, created_by, created_at")
      .eq("org_id", orgId)
      .gte("expense_date", params.startDate)
      .lte("expense_date", params.endDate)
      .order("expense_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as GymExpense[];
  } catch (error) {
    console.error("[getExpenses] Error:", error);
    return [];
  }
}

// Obtiene totales y desglose por categoría en un rango de fechas
export async function getExpenseStats(params: {
  startDate: string;
  endDate: string;
}): Promise<ExpenseStats> {
  const expenses = await getExpenses(params);

  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  let total = 0;

  for (const expense of expenses) {
    total += expense.amount;
    byCategory[expense.category] = (byCategory[expense.category] ?? 0) + expense.amount;
  }

  return { total, byCategory };
}
