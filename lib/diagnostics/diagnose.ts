import type { DiagnosticResult, IncidentCategory } from "@/lib/domain";
import { classifyIncident } from "@/lib/diagnostics/classify";
import { retrieveOfficialDocs } from "@/lib/diagnostics/docs";
import { extractEvidence } from "@/lib/diagnostics/evidence";
import { enhanceWithWorkersAi } from "@/lib/ai/workers-ai";

const remediation: Record<IncidentCategory, { cause: string; change: string; rationale: string; risks: string }> = {
  deployment: { cause: "The deployment configuration or build output likely does not match the Worker entrypoint.", change: "Run `npx wrangler deploy --dry-run` and compare the selected entrypoint, compatibility date, and bindings with wrangler configuration.", rationale: "It validates deployment inputs without publishing a new Worker.", risks: "A changed entrypoint or compatibility date can alter runtime behavior." },
  runtime: { cause: "A request-time exception is likely reaching the Worker without a handled response path.", change: "Guard the failing boundary, validate the input, and return a safe error response while logging a request correlation ID.", rationale: "It isolates the reported exception and prevents an unhandled 500.", risks: "Do not hide the root error; retain safe, structured observability." },
  configuration: { cause: "A configured binding or environment value is likely missing or named differently at runtime.", change: "Compare the binding name in code with the environment-specific Wrangler configuration and redeploy after correcting the mismatch.", rationale: "Workers bindings are injected only under their configured names.", risks: "Changing a binding can point production traffic at different data." },
  "module-resolution": { cause: "An import path, package export, or Worker module format is likely incompatible with the bundle.", change: "Use an explicit relative import or a package export supported by the Worker runtime, then run a local Wrangler build.", rationale: "Bundling locally identifies unresolved imports before deployment.", risks: "Changing import targets can change shipped code." },
  authorization: { cause: "The request or deployment token likely lacks the required permission or is not being supplied.", change: "Create a least-privilege token for the required resource and verify it is stored as a secret, not in source or logs.", rationale: "Scoped credentials resolve authorization errors without broadening access unnecessarily.", risks: "Token rotation can interrupt integrations until all consumers are updated." },
  performance: { cause: "The Worker may be exceeding a platform resource limit or waiting on an unbounded dependency.", change: "Measure the slow operation, apply a timeout, and move non-critical work off the request path.", rationale: "Bounded dependencies avoid exhausting Worker execution resources.", risks: "Timeouts require an intentional fallback experience." },
  unknown: { cause: "The supplied material does not establish a specific Cloudflare Workers failure mode.", change: "Collect the complete sanitized error, request path, timestamp, Worker version, and relevant Wrangler configuration before changing code.", rationale: "A minimal evidence set prevents speculative production changes.", risks: "Do not apply a fix until the failure can be reproduced or corroborated." }
};

export async function diagnose(input: { description: string; logs?: string; configuration?: string }): Promise<DiagnosticResult> {
  const corpus = [input.description, input.logs, input.configuration].filter(Boolean).join("\n");
  const category = classifyIncident(corpus);
  const fix = remediation[category];
  const evidence = extractEvidence(corpus);
  const docs = await retrieveOfficialDocs(category);
  const hasFacts = evidence.some((item) => item.kind === "fact");
  const base: DiagnosticResult = {
    category,
    summary: `${category === "unknown" ? "Insufficient evidence for a specific classification" : `Likely ${category.replace(/-/g, " ")} incident`}.`,
    probableCause: fix.cause,
    confidence: hasFacts && category !== "unknown" ? "medium" : "low",
    confidenceExplanation: hasFacts && category !== "unknown" ? "The category follows patterns in the submitted evidence; it is not a calibrated probability." : "The available evidence is incomplete, so this is only general guidance.",
    evidence,
    alternatives: category === "unknown" ? ["A deployment, binding, or application dependency failure remains possible."] : ["An upstream dependency or a recent environment change could produce similar symptoms."],
    missingInformation: hasFacts ? ["Request ID or timestamp for correlation.", "The relevant Worker code around the referenced location."] : ["Complete sanitized error output.", "Reproduction steps and affected request path."],
    documentation: docs,
    suggestedFix: { ...fix, rollback: "Revert the isolated code or configuration change and redeploy the last known-good Worker version." },
    verificationPlan: [
      { id: "reproduce", instruction: "Reproduce the issue in a non-production environment using the reported input.", state: "suggested" },
      { id: "validate", instruction: "Run the relevant local lint, type, and Worker build checks after applying the minimal fix.", state: "suggested" },
      { id: "observe", instruction: "Confirm the original request succeeds and review sanitized logs for regressions.", state: "not-verified" }
    ],
    provider: "rules"
  };
  const enhanced = await enhanceWithWorkersAi(corpus, base);
  if (!enhanced) return base;
  return {
    ...base,
    category: enhanced.category,
    summary: enhanced.summary,
    probableCause: enhanced.probableCause,
    confidence: enhanced.confidence,
    confidenceExplanation: enhanced.confidenceExplanation,
    alternatives: enhanced.alternatives,
    missingInformation: enhanced.missingInformation,
    suggestedFix: { ...base.suggestedFix, ...enhanced.suggestedFix },
    provider: "workers-ai"
  };
}
