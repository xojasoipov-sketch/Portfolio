import { describe, expect, it } from "vitest";
import { scoreLead } from "../src/ai/scoring.js";
import type { LeadDraft } from "../src/db/types.js";

describe("scoreLead", () => {
  it("scores an empty draft near zero with LOW priority", () => {
    const result = scoreLead({});
    expect(result.score).toBeLessThan(20);
    expect(result.priority).toBe("LOW");
  });

  it("scores a well-specified, budgeted, deadlined lead as HIGH or URGENT", () => {
    const draft: LeadDraft = {
      project_type: "CRM",
      description: "3 filialli o'quv markazi uchun to'liq boshqaruv tizimi, davomat va to'lovlar bilan",
      goal: "Filiallar boshqaruvini avtomatlashtirish",
      business_type: "Education",
      target_users: "Admin, teacher, student",
      budget: "$1000-3000",
      deadline: "2 hafta",
      features: ["Student management", "Attendance", "Payments"],
      contact: "@client",
    };
    const result = scoreLead(draft);
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(["HIGH", "URGENT"]).toContain(result.priority);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("treats vague budget phrases as no budget signal", () => {
    const withVague = scoreLead({ project_type: "CRM", budget: "aniqlanmagan" });
    const withNone = scoreLead({ project_type: "CRM" });
    expect(withVague.score).toBe(withNone.score);
  });

  it("never exceeds 100 or drops below 0", () => {
    const maxed: LeadDraft = {
      project_type: "CRM",
      description: "x".repeat(200),
      goal: "y",
      business_type: "z",
      target_users: "w",
      budget: "$10000",
      deadline: "1 kun — juda shoshilinch",
      features: ["a", "b", "c", "d"],
      current_system: "old CRM",
      contact: "@x",
    };
    expect(scoreLead(maxed).score).toBeLessThanOrEqual(100);
    expect(scoreLead({}).score).toBeGreaterThanOrEqual(0);
  });
});
