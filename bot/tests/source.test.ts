import { describe, expect, it } from "vitest";
import { resolveSource } from "../src/bot/commands/start.js";

describe("resolveSource", () => {
  it("defaults to direct with no payload", () => {
    expect(resolveSource(undefined)).toBe("direct");
    expect(resolveSource("")).toBe("direct");
  });
  it("recognizes known deep-link sources case-insensitively", () => {
    expect(resolveSource("instagram")).toBe("instagram");
    expect(resolveSource("QR")).toBe("qr");
    expect(resolveSource(" Website ")).toBe("website");
  });
  it("falls back to other for unknown payloads", () => {
    expect(resolveSource("some-campaign-42")).toBe("other");
  });
});
