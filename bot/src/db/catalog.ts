import { db } from "./client.js";

/**
 * One priced line item inside a pricing.catalog group. Shape matches what
 * bot/scripts/seedKnowledge.ts originally seeded from SERVICE_CATALOG, so an
 * item edited here reads back identically for the AI agent (db/knowledge.ts)
 * and the public catalog.
 */
export interface CatalogItem {
  name: string;
  duration: string;
  price: string;
  usd: string;
}

export interface CatalogGroup {
  group: string;
  items: CatalogItem[];
}

export interface PackageItem {
  name: string;
  price: string;
  duration: string;
  popular?: boolean;
  features: string[];
}

/**
 * The admin panel edits the exact same xbot_knowledge_items rows the AI agent
 * reads (db/knowledge.ts) and the public site's "catalog" endpoint serves --
 * there is only ever one copy of pricing truth, never a second one that could
 * drift from it. category/key is the same pair seedKnowledge.ts upserts on
 * ("pricing"/"catalog", "pricing"/"packages").
 */
export async function getCatalog(): Promise<CatalogGroup[]> {
  const { data, error } = await db
    .from("xbot_knowledge_items")
    .select("content")
    .eq("category", "pricing")
    .eq("key", "catalog")
    .maybeSingle();
  if (error) throw error;
  return (data?.content as CatalogGroup[] | undefined) ?? [];
}

export async function saveCatalog(groups: CatalogGroup[]): Promise<void> {
  const { error } = await db.from("xbot_knowledge_items").upsert(
    { category: "pricing", key: "catalog", content: groups, updated_at: new Date().toISOString() },
    { onConflict: "category,key" },
  );
  if (error) throw error;
}

export async function getPackages(): Promise<PackageItem[]> {
  const { data, error } = await db
    .from("xbot_knowledge_items")
    .select("content")
    .eq("category", "pricing")
    .eq("key", "packages")
    .maybeSingle();
  if (error) throw error;
  return (data?.content as PackageItem[] | undefined) ?? [];
}

export async function savePackages(packages: PackageItem[]): Promise<void> {
  const { error } = await db.from("xbot_knowledge_items").upsert(
    { category: "pricing", key: "packages", content: packages, updated_at: new Date().toISOString() },
    { onConflict: "category,key" },
  );
  if (error) throw error;
}
