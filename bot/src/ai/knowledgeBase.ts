import { loadAllKnowledge } from "../db/knowledge.js";
import { logger } from "../utils/logger.js";
import * as fallback from "./knowledgeData.js";

/**
 * Loads facts from xbot.knowledge_items (so edits don't need a redeploy) and
 * falls back to the bundled static data if the DB read fails — the AI Agent
 * degrades to slightly-stale-but-still-real facts rather than going silent
 * on a transient DB error.
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
    portfolio: [fallback.PROFILE, ...fallback.DIFFERENTIATORS],
    projects: fallback.PROJECTS,
    services: fallback.DIRECTIONS,
    skills: fallback.TECH_STACK,
    experience: fallback.PROCESS,
    pricing: [...fallback.SERVICE_CATALOG, ...fallback.PACKAGES],
    faq: [...fallback.FAQ, { terms: fallback.TERMS }],
    contact: [fallback.CONTACT],
  });
}

function renderContext(byCategory: Record<string, readonly unknown[]>): string {
  return Object.entries(byCategory)
    .map(([category, items]) => `### ${category.toUpperCase()}\n${JSON.stringify(items, null, 0)}`)
    .join("\n\n");
}
