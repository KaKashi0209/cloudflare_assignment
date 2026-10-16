export const incidentCategories = [
  "deployment", "runtime", "configuration", "module-resolution", "authorization", "performance", "unknown"
] as const;
export type IncidentCategory = (typeof incidentCategories)[number];

export const verificationStates = ["not-started", "suggested", "running", "passed", "failed", "blocked", "not-verified"] as const;
export type VerificationState = (typeof verificationStates)[number];

export interface EvidenceItem { label: string; detail: string; kind: "fact" | "missing" }
export interface DocumentationSource { title: string; url: string; relevance: string; retrieved: boolean }
export interface SuggestedFix { change: string; rationale: string; risks: string; rollback: string }
export interface VerificationStep { id: string; instruction: string; state: VerificationState; result?: string }
export interface DiagnosticResult {
  category: IncidentCategory;
  summary: string;
  probableCause: string;
  confidence: "low" | "medium" | "high";
  confidenceExplanation: string;
  evidence: EvidenceItem[];
  alternatives: string[];
  missingInformation: string[];
  documentation: DocumentationSource[];
  suggestedFix: SuggestedFix;
  verificationPlan: VerificationStep[];
  provider: "rules" | "workers-ai";
  coordination?: { provider: "cloudflare-agents"; status: "completed" | "unavailable"; sessionId: string; summary?: string };
}

export interface Incident {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  logs?: string;
  configuration?: string;
  status: "investigating" | "ready" | "closed";
  diagnostic: DiagnosticResult;
  createdAt: string;
  updatedAt: string;
}
