// inventory.service.ts — Queries de DB para inventario y ventas (sin auth, sin revalidación)

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryProduct,
  InventoryMovement,
  Sale,
  ProductCategory,
  SalePaymentMethod,
  ProductSalesSummary,
  InventoryStats,
} from "@/types/gym-inventory";
import { buildPaginationRange, buildPaginatedResult } from "@core/types/pagination";
import type { PaginatedResult } from "@core/types/pagination";

// ─── Productos ────────────────────────────────────────────────────────────────

export async function fetchProducts(
  supabase: SupabaseClient,
  orgId: string,
  filters?: {
    search?: string;
    category?: ProductCategory;
    onlyLowStock?: boolean;
    includeInactive?: boolean;
  }
): Promise<InventoryProduct[]> {
  let query = supabase
    .from("gym_inventory_products")
    .select("id,org_id,name,description,sku,category,unit,cost_price,sale_price,current_stock,min_stock_alert,image_url,is_active,created_at,updated_at")
    .eq("org_id", orgId)
    .order("name");

  if (!filters?.includeInactive) {
    query = query.eq("is_active", true);
  }
  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as InventoryProduct[];
  // WORKAROUND: PostgREST no permite comparar dos columnas directamente —
  // filtramos en memoria tras traer los productos del org
  if (filters?.onlyLowStock) {
    return rows.filter((p) => p.current_stock <= p.min_stock_alert);
  }
  return rows;
}

export async function fetchProductById(
  supabase: SupabaseClient,
  productId: string,
  orgId: string
): Promise<InventoryProduct | null> {
  const { data, error } = await supabase
    .from("gym_inventory_products")
    .select("id,org_id,name,description,sku,category,unit,cost_price,sale_price,current_stock,min_stock_alert,image_url,is_active,created_at,updated_at")
    .eq("id", productId)
    .eq("org_id", orgId)
    .single();
  if (error) throw error;
  return data as InventoryProduct | null;
}

export async function insertProduct(
  supabase: SupabaseClient,
  product: Omit<InventoryProduct, "id" | "created_at" | "updated_at">
): Promise<InventoryProduct> {
  const { data, error } = await supabase
    .from("gym_inventory_products")
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data as InventoryProduct;
}

export async function patchProduct(
  supabase: SupabaseClient,
  productId: string,
  orgId: string,
  updates: Partial<Omit<InventoryProduct, "id" | "org_id" | "current_stock" | "created_at" | "updated_at">>
): Promise<void> {
  const { error } = await supabase
    .from("gym_inventory_products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("org_id", orgId);
  if (error) throw error;
}

export async function fetchLowStockCount(
  supabase: SupabaseClient,
  orgId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("gym_inventory_products")
    .select("id,current_stock,min_stock_alert")
    .eq("org_id", orgId)
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []).filter((p) => p.current_stock <= p.min_stock_alert).length;
}

// Paginación server-side para la tabla de inventario — onlyLowStock usa filtrado en memoria
// porque PostgREST no soporta comparación directa entre dos columnas (current_stock <= min_stock_alert)
export async function fetchProductsPaginated(
  supabase: SupabaseClient,
  orgId: string,
  params: {
    page: number;
    pageSize: number;
    search?: string;
    category?: ProductCategory;
    onlyLowStock?: boolean;
  }
): Promise<PaginatedResult<InventoryProduct>> {
  const PRODUCT_SELECT = "id,org_id,name,description,sku,category,unit,cost_price,sale_price,current_stock,min_stock_alert,image_url,is_active,created_at,updated_at";
  const { from, to } = buildPaginationRange(params);

  // onlyLowStock necesita comparar dos columnas — se fetcha todo y se pagina en memoria
  if (params.onlyLowStock) {
    let q = supabase.from("gym_inventory_products").select(PRODUCT_SELECT).eq("org_id", orgId).eq("is_active", true).order("name");
    if (params.search) q = q.ilike("name", `%${params.search}%`);
    if (params.category) q = q.eq("category", params.category);
    const { data, error } = await q;
    if (error) throw error;
    const all = ((data ?? []) as InventoryProduct[]).filter((p) => p.current_stock <= p.min_stock_alert);
    return buildPaginatedResult(all.slice(from, to + 1), all.length, params);
  }

  let countQ = supabase.from("gym_inventory_products").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("is_active", true);
  let dataQ = supabase.from("gym_inventory_products").select(PRODUCT_SELECT).eq("org_id", orgId).eq("is_active", true).order("name").range(from, to);

  if (params.search) { countQ = countQ.ilike("name", `%${params.search}%`); dataQ = dataQ.ilike("name", `%${params.search}%`); }
  if (params.category) { countQ = countQ.eq("category", params.category); dataQ = dataQ.eq("category", params.category); }

  const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
  if (error) throw error;
  return buildPaginatedResult((data ?? []) as InventoryProduct[], count ?? 0, params);
}

// ─── Movimientos ──────────────────────────────────────────────────────────────

export async function insertMovement(
  supabase: SupabaseClient,
  movement: {
    product_id: string;
    org_id: string;
    type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    unit_price?: number | null;
    notes?: string | null;
    sale_id?: string | null;
    created_by: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from("gym_inventory_movements")
    .insert(movement);
  if (error) throw error;
}

export async function fetchMovementsByProduct(
  supabase: SupabaseClient,
  productId: string,
  limit = 20
): Promise<InventoryMovement[]> {
  const { data, error } = await supabase
    .from("gym_inventory_movements")
    .select(`
      id, product_id, org_id, type, quantity, previous_stock, new_stock,
      unit_price, notes, sale_id, created_by, created_at,
      product:gym_inventory_products(name, unit),
      creator:profiles(full_name)
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as InventoryMovement[];
}

// ─── Ventas ───────────────────────────────────────────────────────────────────

export async function insertSale(
  supabase: SupabaseClient,
  sale: {
    org_id: string;
    sold_by: string;
    member_id?: string | null;
    payment_method: string;
    total_amount: number;
    notes?: string | null;
  }
): Promise<Sale> {
  const { data, error } = await supabase
    .from("gym_sales")
    .insert(sale)
    .select()
    .single();
  if (error) throw error;
  return data as Sale;
}

export async function insertSaleItems(
  supabase: SupabaseClient,
  items: Array<{
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
  }>
): Promise<void> {
  const { error } = await supabase.from("gym_sale_items").insert(items);
  if (error) throw error;
}

export async function fetchSales(
  supabase: SupabaseClient,
  orgId: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    paymentMethod?: SalePaymentMethod;
  }
): Promise<Sale[]> {
  let query = supabase
    .from("gym_sales")
    .select(`
      id, org_id, sold_by, member_id, payment_method, total_amount, notes, created_at,
      seller:profiles!gym_sales_sold_by_fkey(full_name),
      member:profiles!gym_sales_member_id_fkey(full_name),
      items:gym_sale_items(
        id, sale_id, product_id, quantity, unit_price, subtotal,
        product:gym_inventory_products(name, unit)
      )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("created_at", filters.dateTo);
  if (filters?.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Sale[];
}

// Versión paginada de fetchSales — count + data en paralelo con los mismos filtros
export async function fetchSalesPaginated(
  supabase: SupabaseClient,
  orgId: string,
  params: {
    page: number;
    pageSize: number;
    dateFrom?: string;
    dateTo?: string;
    paymentMethod?: SalePaymentMethod;
  }
): Promise<PaginatedResult<Sale>> {
  const { from, to } = buildPaginationRange(params);

  const SALE_SELECT = `
    id, org_id, sold_by, member_id, payment_method, total_amount, notes, created_at,
    seller:profiles!gym_sales_sold_by_fkey(full_name),
    member:profiles!gym_sales_member_id_fkey(full_name),
    items:gym_sale_items(
      id, sale_id, product_id, quantity, unit_price, subtotal,
      product:gym_inventory_products(name, unit)
    )
  `;

  let countQ = supabase.from("gym_sales").select("*", { count: "exact", head: true }).eq("org_id", orgId);
  let dataQ = supabase.from("gym_sales").select(SALE_SELECT).eq("org_id", orgId).order("created_at", { ascending: false }).range(from, to);

  if (params.dateFrom) { countQ = countQ.gte("created_at", params.dateFrom); dataQ = dataQ.gte("created_at", params.dateFrom); }
  if (params.dateTo)   { countQ = countQ.lte("created_at", params.dateTo);   dataQ = dataQ.lte("created_at", params.dateTo); }
  if (params.paymentMethod) { countQ = countQ.eq("payment_method", params.paymentMethod); dataQ = dataQ.eq("payment_method", params.paymentMethod); }

  const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
  if (error) throw error;

  return buildPaginatedResult((data ?? []) as unknown as Sale[], count ?? 0, params);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function fetchInventoryStats(
  supabase: SupabaseClient,
  orgId: string
): Promise<InventoryStats> {
  // Inicio del mes actual en UTC para filtrar ventas del mes
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [productsRes, salesRes, itemsRes] = await Promise.all([
    // Todos los productos activos para calcular valorización del inventario
    supabase
      .from("gym_inventory_products")
      .select("id, name, current_stock, cost_price, sale_price, min_stock_alert")
      .eq("org_id", orgId)
      .eq("is_active", true),

    // Ventas del mes actual para métricas de revenue
    supabase
      .from("gym_sales")
      .select("id, total_amount, created_at")
      .eq("org_id", orgId)
      .gte("created_at", monthStart),

    // Items de ventas para calcular top products (todos, sin filtro de fecha)
    supabase
      .from("gym_sale_items")
      .select("product_id, quantity, unit_price, subtotal, product:gym_inventory_products(name, cost_price)")
      .eq("gym_inventory_products.org_id", orgId),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (salesRes.error) throw salesRes.error;

  const products = productsRes.data ?? [];
  const sales = salesRes.data ?? [];
  // PostgREST devuelve el join como array aunque sea una relación 1:1 — normalizamos
  const items = (itemsRes.data ?? []).map((row) => ({
    product_id: row.product_id as string,
    quantity: row.quantity as number,
    unit_price: row.unit_price as number,
    subtotal: row.subtotal as number,
    product: Array.isArray(row.product) ? (row.product[0] as { name: string; cost_price: number } ?? null) : (row.product as { name: string; cost_price: number } | null),
  }));

  // Calcular métricas de inventario en memoria
  const total_products = products.length;
  const total_stock_value = products.reduce((sum, p) => sum + p.current_stock * p.cost_price, 0);
  const total_sale_value = products.reduce((sum, p) => sum + p.current_stock * p.sale_price, 0);
  const low_stock_count = products.filter((p) => p.current_stock <= p.min_stock_alert).length;

  const total_sales_this_month = sales.length;
  const total_revenue_this_month = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);

  // Agrupar ventas por producto para el top 5
  const productMap = new Map<string, ProductSalesSummary>();
  for (const item of items) {
    if (!item.product) continue;
    const existing = productMap.get(item.product_id);
    const revenue = Number(item.subtotal);
    const cost = Number(item.product.cost_price) * item.quantity;
    if (existing) {
      existing.total_units_sold += item.quantity;
      existing.total_revenue += revenue;
      existing.total_cost += cost;
      existing.gross_profit += revenue - cost;
    } else {
      productMap.set(item.product_id, {
        product_id: item.product_id,
        product_name: item.product.name,
        total_units_sold: item.quantity,
        total_revenue: revenue,
        total_cost: cost,
        gross_profit: revenue - cost,
      });
    }
  }

  const top_selling_products = Array.from(productMap.values())
    .sort((a, b) => b.total_units_sold - a.total_units_sold)
    .slice(0, 5);

  return {
    total_products,
    total_stock_value,
    total_sale_value,
    low_stock_count,
    top_selling_products,
    total_sales_this_month,
    total_revenue_this_month,
  };
}
