/**
 * Upserts knowledgeData.ts into xbot.knowledge_items. Idempotent — safe to
 * re-run after editing the source facts; run via `npm run seed:knowledge`.
 */
import { db } from "../src/db/client.js";
import {
  CONTACT,
  DIFFERENTIATORS,
  DIRECTIONS,
  FAQ,
  PACKAGES,
  PROCESS,
  PROFILE,
  PROJECTS,
  SERVICE_CATALOG,
  TECH_STACK,
  TERMS,
} from "../src/ai/knowledgeData.js";

const rows: { category: string; key: string; content: unknown }[] = [
  { category: "portfolio", key: "profile", content: PROFILE },
  { category: "portfolio", key: "differentiators", content: DIFFERENTIATORS },
  { category: "services", key: "directions", content: DIRECTIONS },
  { category: "experience", key: "process", content: PROCESS },
  { category: "skills", key: "tech_stack", content: TECH_STACK },
  { category: "pricing", key: "catalog", content: SERVICE_CATALOG },
  { category: "pricing", key: "packages", content: PACKAGES },
  { category: "faq", key: "terms", content: TERMS },
  { category: "faq", key: "questions", content: FAQ },
  { category: "contact", key: "main", content: CONTACT },
  ...PROJECTS.map((p) => ({ category: "projects", key: p.key, content: p })),
];

async function main() {
  for (const row of rows) {
    const { error } = await db.from("knowledge_items").upsert(
      { category: row.category, key: row.key, content: row.content, updated_at: new Date().toISOString() },
      { onConflict: "category,key" },
    );
    if (error) {
      console.error(`FAILED ${row.category}/${row.key}:`, error.message);
      process.exitCode = 1;
    } else {
      console.log(`OK ${row.category}/${row.key}`);
    }
  }
}

main();
