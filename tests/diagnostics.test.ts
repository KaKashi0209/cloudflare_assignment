import { describe, expect, it, vi } from "vitest";
import { classifyIncident } from "@/lib/diagnostics/classify";
import { extractEvidence } from "@/lib/diagnostics/evidence";
import { isValidDocumentationSource, retrieveOfficialDocs } from "@/lib/diagnostics/docs";
describe("diagnostics", () => {
  it("classifies common Worker failures", () => { expect(classifyIncident("Worker returned HTTP 500: TypeError")).toBe("runtime"); expect(classifyIncident("Cannot find module foo")).toBe("module-resolution"); });
  it("redacts likely secrets from evidence", () => { expect(extractEvidence("Error: boom token=very-secret")[0].detail).not.toContain("very-secret"); });
  it("allows only official Cloudflare developer sources", () => { expect(isValidDocumentationSource({ title: "x", url: "https://example.com", relevance: "x", retrieved: false })).toBe(false); });
  it("marks unavailable official retrieval honestly", async () => { vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline"))); const sources = await retrieveOfficialDocs("runtime"); expect(sources[0].retrieved).toBe(false); vi.unstubAllGlobals(); });
});
