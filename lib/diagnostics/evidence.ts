import type { EvidenceItem } from "@/lib/domain";

const errorPattern = /(?:Error|Exception|TypeError|ReferenceError|SyntaxError|Status)\s*[: ]\s*[^\n]{2,240}/gi;
const linePattern = /(?:[\w./-]+\.(?:ts|tsx|js|mjs|json|toml))(?::\d+(?::\d+)?)?/g;

export function extractEvidence(text: string): EvidenceItem[] {
  const normalized = text.replace(/(?:api[_ -]?key|authorization|password|token)\s*[:=]\s*[^\s,]+/gi, "$1: [redacted]");
  const errors = normalized.match(errorPattern)?.slice(0, 4) ?? [];
  const paths = normalized.match(linePattern)?.slice(0, 4) ?? [];
  const items = [
    ...errors.map((detail) => ({ label: "Reported error", detail: detail.trim(), kind: "fact" as const })),
    ...paths.map((detail) => ({ label: "Referenced file", detail, kind: "fact" as const }))
  ];
  return items.length ? items : [{ label: "Missing evidence", detail: "No recognizable error message or source location was supplied.", kind: "missing" }];
}
