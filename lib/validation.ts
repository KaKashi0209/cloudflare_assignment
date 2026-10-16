import { z } from "zod";
import { verificationStates } from "@/lib/domain";

const boundedText = (max: number) => z.string().trim().max(max);
export const createIncidentSchema = z.object({
  description: boundedText(12_000).min(12, "Describe the failure in at least 12 characters."),
  logs: boundedText(60_000).optional().default(""),
  configuration: boundedText(20_000).optional().default(""),
  attachment: z.object({ name: z.string().max(120), type: z.enum(["text/plain", "application/json", "application/toml"]).optional(), content: boundedText(30_000) }).optional()
}).superRefine((value, context) => {
  if (value.attachment && !/\.(txt|log|json|toml)$/i.test(value.attachment.name)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Only .txt, .log, .json, and .toml attachments are supported.", path: ["attachment", "name"] });
  }
});

export const verificationUpdateSchema = z.object({
  stepId: z.string().regex(/^[a-z0-9-]{1,48}$/),
  state: z.enum(verificationStates),
  result: boundedText(2_000).optional()
}).refine((value) => value.state !== "passed" || Boolean(value.result), {
  message: "A passed step requires recorded execution evidence.", path: ["result"]
});

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export function safeJson<T>(text: string, schema: z.ZodType<T>): T | null {
  try { return schema.parse(JSON.parse(text)); } catch { return null; }
}
