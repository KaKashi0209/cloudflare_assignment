import { describe, expect, it } from "vitest";
import { createIncidentSchema, verificationUpdateSchema } from "@/lib/validation";
describe("incident validation", () => {
  it("rejects short incidents and unsupported upload types", () => { expect(createIncidentSchema.safeParse({ description: "short" }).success).toBe(false); expect(createIncidentSchema.safeParse({ description: "A valid enough incident", attachment: { name: "payload.exe", content: "x" } }).success).toBe(false); });
  it("requires evidence when a check is recorded as passed", () => { expect(verificationUpdateSchema.safeParse({ stepId: "validate", state: "passed" }).success).toBe(false); expect(verificationUpdateSchema.safeParse({ stepId: "validate", state: "passed", result: "npm test exited 0" }).success).toBe(true); });
});
