import { loadAllKnowledge } from "../db/knowledge.js";
import { logger } from "../utils/logger.js";
import * as fallback from "./knowledgeData.js";

/**
 * Loads facts from xbot_knowledge_items, which is the source of truth: the
 * catalogue, packages, terms and FAQ live there and nowhere else, so a price
 * edit needs a re-seed but never a redeploy.
 *
 * The fallback is deliberately thin -- who Saidburxon is, the projects, how to
 * reach him. It is a floor for the narrow case where that one table cannot be
 * read while the rest of the database works; the bot cannot run at all without
 * the database, so a fatter fallback would only be a second copy of the same
 * facts, free to drift.
 */
export async function buildKnowledgeContext(): Promise<string> {
  try {
    const items = await loadAllKnowledge();
    if (items.length === 0) return staticContext();
    const byCategory = new Map<string, unknown[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push({ key: item.key, ...((item.content as object) ?? {}) });
      byCategory.set(item.category, list);
    }
    return renderContext(Object.fromEntries(byCategory));
  } catch (err) {
    logger.warn({ err }, "knowledge base DB load failed, using static fallback");
    return staticContext();
  }
}

function staticContext(): string {
  return renderContext({
    portfolio: [fallback.PROFILE],
    projects: fallback.PROJECTS,
    contact: [fallback.CONTACT],
  });
}

function renderContext(byCategory: Record<string, readonly unknown[]>): string {
  return Object.entries(byCategory)
    .map(([category, items]) => `### ${category.toUpperCase()}\n${JSON.stringify(items, null, 0)}`)
    .join("\n\n");
}
