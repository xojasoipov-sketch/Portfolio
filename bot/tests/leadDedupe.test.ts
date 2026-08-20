import { describe, expect, it } from "vitest";
import { computeDedupeHash } from "../src/db/leads.js";

describe("computeDedupeHash", () => {
  it("produces the same hash for the same user + project_type + description", async () => {
    const a = await computeDedupeHash("user-1", { project_type: "CRM", description: "3 filialli o'quv markazi" });
    const b = await computeDedupeHash("user-1", { project_type: "CRM", description: "3 filialli o'quv markazi" });
    expect(a).toBe(b);
  });

  it("is case/whitespace insensitive on description", async () => {
    const a = await computeDedupeHash("user-1", { project_type: "CRM", description: "  CRM kerak  " });
    const b = await computeDedupeHash("user-1", { project_type: "CRM", description: "crm kerak" });
    expect(a).toBe(b);
  });

  it("differs across users for the same project", async () => {
    const a = await computeDedupeHash("user-1", { project_type: "CRM", description: "x" });
    const b = await computeDedupeHash("user-2", { project_type: "CRM", description: "x" });
    expect(a).not.toBe(b);
  });

  it("differs across different project descriptions", async () => {
    const a = await computeDedupeHash("user-1", { project_type: "CRM", description: "x" });
    const b = await computeDedupeHash("user-1", { project_type: "CRM", description: "y" });
    expect(a).not.toBe(b);
  });
});
