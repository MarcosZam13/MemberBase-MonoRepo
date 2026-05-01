// inventory.actions.ts — Server actions para gestión de inventario y ventas

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchProducts,
  fetchProductById,
  fetchProductsPaginated,
  insertProduct,
  patchProduct,
  insertMovement,
  fetchMovementsByProduct,
  fetchLowStockCount,
  insertSale,
  insertSaleItems,
  fetchSales,
  fetchSalesPaginated,
  fetchInventoryStats,
} from "@/services/inventory.service";
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  registerSaleSchema,
} from "@/lib/validations/inventory";
import type { ActionResult } from "@/types/database";
import type {
  InventoryProduct,
  InventoryMovement,
  Sale,
  ProductCategory,
  SalePaymentMethod,
  InventoryStats,
} from "@/types/gym-inventory";
import type { PaginatedResult } from "@core/types/pagination";

// ─── createProduct ────────────────────────────────────────────────────────────

export async function createProduct(input: unknown): Promise<ActionResult<InventoryProduct>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { initial_stock, ...rest } = parsed.data;
  const orgId = await getOrgId();

  try {
    const product = await insertProduct(supabase, {
      ...rest,
      org_id: orgId,
      current_stock: initial_stock,
      description: rest.description ?? null,
      sku: rest.sku ?? null,
      image_url: null,
      is_active: true,
    });

    // Registrar el movimiento de entrada inicial si se especificó stock
    if (initial_stock > 0) {
      await insertMovement(supabase, {
        product_id: product.id,
        org_id: orgId,
        type: "restock",
        quantity: initial_stock,
        previous_stock: 0,
        new_stock: initial_stock,
        notes: "Stock inicial al crear el producto",
        created_by: user.id,
      });
    }

    revalidatePath("/admin/inventory");
    return { success: true, data: product };
  } catch (error) {
    console.error("[createProduct] Error:", error);
    return { success: false, error: "Error al crear el producto. Intenta de nuevo." };
  }
}

// ─── updateProduct ────────────────────────────────────────────────────────────

export async function updateProduct(
  productId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const orgId = await getOrgId();

  try {
    await patchProduct(supabase, productId, orgId, parsed.data);
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("[updateProduct] Error:", error);
    return { success: false, error: "Error al actualizar el producto. Intenta de nuevo." };
  }
}

// ─── adjustStock ──────────────────────────────────────────────────────────────

export async function adjustStock(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { productId, type, quantity, notes } = parsed.data;
  const orgId = await getOrgId();

  try {
    const product = await fetchProductById(supabase, productId, orgId);
    if (!product) return { success: false, error: "Producto no encontrado" };

    // Restock aumenta el stock; adjustment y waste lo reducen
    const delta = type === "restock" ? quantity : -quantity;
    const newStock = product.current_stock + delta;

    if (newStock < 0) {
      return {
        success: false,
        error: `Stock insuficiente. Stock actual: ${product.current_stock}, intento de reducir: ${quantity}`,
      };
    }

    await insertMovement(supabase, {
      product_id: productId,
      org_id: orgId,
      type,
      quantity: delta,
      previous_stock: product.current_stock,
      new_stock: newStock,
      notes: notes ?? null,
      created_by: user.id,
    });

    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("[adjustStock] Error:", error);
    return { success: false, error: "Error al ajustar el stock. Intenta de nuevo." };
  }
}

// ─── registerSale ─────────────────────────────────────────────────────────────

export async function registerSale(input: unknown): Promise<ActionResult<Sale>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = registerSaleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { items, payment_method, member_id, notes } = parsed.data;
  const orgId = await getOrgId();

  try {
    // Verificar stock suficiente para todos los items antes de insertar nada
    const productIds = [...new Set(items.map((i) => i.product_id))];
    const { data: products } = await supabase
      .from("gym_inventory_products")
      .select("id, name, current_stock")
      .in("id", productIds)
      .eq("org_id", orgId);

    const stockMap = new Map((products ?? []).map((p) => [p.id, p]));

    for (const item of items) {
      const product = stockMap.get(item.product_id);
      if (!product) return { success: false, error: `Producto ${item.product_id} no encontrado` };
      if (product.current_stock < item.quantity) {
        return {
          success: false,
          error: `Stock insuficiente para "${product.name}". Disponible: ${product.current_stock}, solicitado: ${item.quantity}`,
        };
      }
    }

    const totalAmount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

    // Crear la venta principal
    const sale = await insertSale(supabase, {
      org_id: orgId,
      sold_by: user.id,
      member_id: member_id ?? null,
      payment_method,
      total_amount: totalAmount,
      notes: notes ?? null,
    });

    // Insertar los items de la venta en bulk
    await insertSaleItems(
      supabase,
      items.map((i) => ({
        sale_id: sale.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    );

    // Registrar un movimiento de salida por cada item — el trigger actualiza current_stock
    for (const item of items) {
      const product = stockMap.get(item.product_id)!;
      const newStock = product.current_stock - item.quantity;

      await insertMovement(supabase, {
        product_id: item.product_id,
        org_id: orgId,
        type: "sale",
        quantity: -item.quantity,
        previous_stock: product.current_stock,
        new_stock: newStock,
        unit_price: item.unit_price,
        sale_id: sale.id,
        created_by: user.id,
      });

      // Actualizar el stock local para que el siguiente item tenga el valor correcto
      // (en caso de que la misma venta incluya el mismo producto dos veces)
      product.current_stock = newStock;
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/sales");
    return { success: true, data: sale };
  } catch (error) {
    console.error("[registerSale] Error:", error);
    return { success: false, error: "Error al registrar la venta. Intenta de nuevo." };
  }
}

// ─── getProducts ──────────────────────────────────────────────────────────────

export async function getProducts(filters?: {
  search?: string;
  category?: ProductCategory;
  onlyLowStock?: boolean;
  includeInactive?: boolean;
}): Promise<ActionResult<InventoryProduct[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const products = await fetchProducts(supabase, orgId, filters);
    return { success: true, data: products };
  } catch (error) {
    console.error("[getProducts] Error:", error);
    return { success: false, error: "Error al cargar los productos." };
  }
}

// ─── getProductById ───────────────────────────────────────────────────────────

export async function getProductById(productId: string): Promise<ActionResult<{
  product: InventoryProduct;
  movements: InventoryMovement[];
}>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const [product, movements] = await Promise.all([
      fetchProductById(supabase, productId, orgId),
      fetchMovementsByProduct(supabase, productId, 20),
    ]);

    if (!product) return { success: false, error: "Producto no encontrado" };
    return { success: true, data: { product, movements } };
  } catch (error) {
    console.error("[getProductById] Error:", error);
    return { success: false, error: "Error al cargar el producto." };
  }
}

// ─── getProductsPaginated ─────────────────────────────────────────────────────

export async function getProductsPaginated(params: {
  page: number;
  pageSize: number;
  search?: string;
  category?: ProductCategory;
  onlyLowStock?: boolean;
}): Promise<PaginatedResult<InventoryProduct>> {
  const user = await getCurrentUser();
  const empty = { data: [], total: 0, page: params.page, pageSize: params.pageSize, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  if (!user) return empty;

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchProductsPaginated(supabase, orgId, params);
  } catch (error) {
    console.error("[getProductsPaginated] Error:", error);
    return empty;
  }
}

// ─── getLowStockCount ─────────────────────────────────────────────────────────

// Para el badge de alerta en el sidebar del admin
export async function getLowStockCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchLowStockCount(supabase, orgId);
  } catch (error) {
    console.error("[getLowStockCount] Error:", error);
    return 0;
  }
}

// ─── getSales ─────────────────────────────────────────────────────────────────

export async function getSales(filters?: {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: SalePaymentMethod;
}): Promise<ActionResult<Sale[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  // Tanto admin como owner pueden gestionar el historial de ventas
  if (profile?.role !== "admin" && profile?.role !== "owner") return { success: false, error: "Sin permisos" };

  try {
    const orgId = await getOrgId();
    const sales = await fetchSales(supabase, orgId, filters);
    return { success: true, data: sales };
  } catch (error) {
    console.error("[getSales] Error:", error);
    return { success: false, error: "Error al cargar las ventas." };
  }
}

// ─── getSalesPaginated ────────────────────────────────────────────────────────

export async function getSalesPaginated(params: {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: SalePaymentMethod;
}): Promise<PaginatedResult<Sale>> {
  const user = await getCurrentUser();
  const empty = { data: [], total: 0, page: params.page, pageSize: params.pageSize, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  if (!user) return empty;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "owner") return empty;

  try {
    const orgId = await getOrgId();
    return await fetchSalesPaginated(supabase, orgId, params);
  } catch (error) {
    console.error("[getSalesPaginated] Error:", error);
    return empty;
  }
}

// ─── getPublishedProducts ─────────────────────────────────────────────────────

// Productos activos visibles para miembros en la tienda del portal — sin restricción de rol
export async function getPublishedProducts(): Promise<InventoryProduct[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    const { data, error } = await supabase
      .from("gym_inventory_products")
      .select(
        "id, org_id, name, description, sku, category, unit, sale_price, current_stock, image_url, is_active, created_at, updated_at, cost_price, min_stock_alert"
      )
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as InventoryProduct[];
  } catch (error) {
    console.error("[getPublishedProducts] Error:", error);
    return [];
  }
}

// ─── getInventoryStats ────────────────────────────────────────────────────────

// Para el dashboard de Módulo 10 — Contabilidad & Reportes (solo owner)
export async function getInventoryStats(): Promise<ActionResult<InventoryStats>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  // Solo el owner puede ver estadísticas financieras de inventario
  if (profile?.role !== "owner") return { success: false, error: "Sin permisos" };

  try {
    const orgId = await getOrgId();
    const stats = await fetchInventoryStats(supabase, orgId);
    return { success: true, data: stats };
  } catch (error) {
    console.error("[getInventoryStats] Error:", error);
    return { success: false, error: "Error al cargar las estadísticas." };
  }
}
