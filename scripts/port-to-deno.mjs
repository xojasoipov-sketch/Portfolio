#!/usr/bin/env node
// Regenerates the Deno bot (supabase/functions/xojasoipov-bot) from the Node
// bot (bot/src), which is the single source of the business logic.
//
// Only two things differ between the runtimes, and both are mechanical:
//   * relative imports carry a .js extension under Node and .ts under Deno
//   * bare package specifiers become pinned npm: specifiers
//
// Doing that by hand, or with a loose `sed s/\.js"/.ts"/`, is how the string
// "Next.js" in the AI knowledge base quietly became "Next.ts" -- it also ends
// in .js". So the rewrite is anchored to an actual import/export statement
// with a relative path, and never touches string data.
//
// index.ts is excluded: the entrypoints are genuinely different programs (long
// polling under Node, a webhook handler under Deno), not two spellings of one.
//
// Usage: node scripts/port-to-deno.mjs [--check]
//   --check  report drift and exit non-zero instead of writing.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SRC = join(ROOT, "bot/src");
const DEST = join(ROOT, "supabase/functions/xojasoipov-bot");

/** Bare specifier -> the pinned npm: specifier the Deno build must use. */
const NPM_PINS = {
  grammy: "npm:grammy@1.31.0",
  zod: "npm:zod@3.24.1",
  "@supabase/supabase-js": "npm:@supabase/supabase-js@2.49.4",
  "@google/generative-ai": "npm:@google/generative-ai@0.24.1",
  "jpeg-js": "npm:jpeg-js@0.4.4",
};

/** Files whose Deno counterpart is intentionally hand-written, not generated. */
const EXCLUDED = new Set([
  // Genuinely different programs, not two spellings of one: long polling under
  // Node, a webhook handler under Deno.
  "index.ts",
  // Seed-only. seedKnowledge.ts upserts it into xbot_knowledge_items and the
  // agent reads it back from there, so shipping it inside the edge function
  // would be a second copy of the same facts, free to drift.
  "ai/knowledgeSeed.ts",
]);

const IMPORT_RE =
  /(\bfrom\s*|\bimport\s*|\bexport\s*\*\s*from\s*)(["'])([^"']+)\2/g;

function port(source) {
  return source.replace(IMPORT_RE, (whole, keyword, quote, spec) => {
    let ported = spec;
    if (spec.startsWith("./") || spec.startsWith("../")) {
      ported = spec.replace(/\.js$/, ".ts");
    } else if (Object.hasOwn(NPM_PINS, spec)) {
      ported = NPM_PINS[spec];
    } else if (
      !spec.startsWith("npm:") &&
      !spec.startsWith("jsr:") &&
      !spec.startsWith("node:")
    ) {
      throw new Error(
        `unpinned bare import "${spec}" -- add it to NPM_PINS in scripts/port-to-deno.mjs`,
      );
    }
    return `${keyword}${quote}${ported}${quote}`;
  });
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
      files.push(full);
  }
  return files;
}

const check = process.argv.includes("--check");
const drift = [];
let written = 0;

for (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  if (EXCLUDED.has(rel)) continue;
  const ported = port(readFileSync(file, "utf8"));
  const target = join(DEST, rel);

  if (check) {
    const current = existsSync(target) ? readFileSync(target, "utf8") : null;
    if (current !== ported) drift.push(rel);
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, ported);
  written += 1;
}

if (check) {
  if (drift.length > 0) {
    console.error(
      `Deno tree is out of date with bot/src:\n${drift.map((f) => `  - ${f}`).join("\n")}`,
    );
    console.error("Run: node scripts/port-to-deno.mjs");
    process.exit(1);
  }
  console.log("Deno tree matches bot/src.");
} else {
  console.log(`ported ${written} files to supabase/functions/xojasoipov-bot`);
}
