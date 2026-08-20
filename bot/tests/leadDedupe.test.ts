import { describe, expect, it } from "vitest";
import { computeDedupeHash } from "../src/db/leads.js";

describe("computeDedupeHash", () => {
  it("produces the same hash for the same user + project_type + description", () => {
    const a = computeDedupeHash("user-1", { project_type: "CRM", description: "3 filialli o'quv markazi" });
    const b = computeDedupeHash("user-1", { project_type: "CRM", description: "3 filialli o'quv markazi" });
    expect(a).toBe(b);
  });

  it("is case/whitespace insensitive on description", () => {
    const a = computeDedupeHash("user-1", { project_type: "CRM", description: "  CRM kerak  " });
    const b = computeDedupeHash("user-1", { project_type: "CRM", description: "crm kerak" });
    expect(a).toBe(b);
  });

  it("differs across users for the same project", () => {
    const a = computeDedupeHash("user-1", { project_type: "CRM", description: "x" });
    const b = computeDedupeHash("user-2", { project_type: "CRM", description: "x" });
    expect(a).not.toBe(b);
  });

  it("differs across different project descriptions", () => {
    const a = computeDedupeHash("user-1", { project_type: "CRM", description: "x" });
    const b = computeDedupeHash("user-1", { project_type: "CRM", description: "y" });
    expect(a).not.toBe(b);
  });
});
