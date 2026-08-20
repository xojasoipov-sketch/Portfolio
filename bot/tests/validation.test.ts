import { describe, expect, it } from "vitest";
import { clampMessage, escapeTelegramHtml, isValidTelegramUsername, looksLikeSpam } from "../src/security/validation.js";

describe("clampMessage", () => {
  it("leaves short messages untouched", () => {
    expect(clampMessage("salom")).toBe("salom");
  });
  it("truncates to the max length", () => {
    const long = "a".repeat(5000);
    expect(clampMessage(long).length).toBe(4000);
  });
});

describe("escapeTelegramHtml", () => {
  it("escapes angle brackets and ampersands", () => {
    expect(escapeTelegramHtml("<script>&</script>")).toBe("&lt;script&gt;&amp;&lt;/script&gt;");
  });
  it("does not double-escape plain text", () => {
    expect(escapeTelegramHtml("CRM kerak")).toBe("CRM kerak");
  });
});

describe("isValidTelegramUsername", () => {
  it("accepts valid usernames with or without @", () => {
    expect(isValidTelegramUsername("xojasoipov")).toBe(true);
    expect(isValidTelegramUsername("@xojasoipov")).toBe(true);
  });
  it("rejects too-short or invalid characters", () => {
    expect(isValidTelegramUsername("abc")).toBe(false);
    expect(isValidTelegramUsername("bad name!")).toBe(false);
  });
});

describe("looksLikeSpam", () => {
  it("flags empty text", () => {
    expect(looksLikeSpam("   ")).toBe(true);
  });
  it("flags long repeated-character strings", () => {
    expect(looksLikeSpam("a".repeat(30))).toBe(true);
  });
  it("does not flag a normal sentence", () => {
    expect(looksLikeSpam("Menga CRM kerak, 3 ta filialim bor")).toBe(false);
  });
});
