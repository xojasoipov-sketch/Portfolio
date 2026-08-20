import { db } from "./client.js";
import type { KnowledgeItemRow } from "./types.js";

export async function loadAllKnowledge(): Promise<KnowledgeItemRow[]> {
  const { data, error } = await db.from("xbot_knowledge_items").select("*");
  if (error) throw error;
  return data as KnowledgeItemRow[];
}
