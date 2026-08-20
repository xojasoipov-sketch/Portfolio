import { db } from "./client.ts";
import type { KnowledgeItemRow } from "./types.ts";

export async function loadAllKnowledge(): Promise<KnowledgeItemRow[]> {
  const { data, error } = await db.from("knowledge_items").select("*");
  if (error) throw error;
  return data as KnowledgeItemRow[];
}
