import type { IncidentCategory } from "@/lib/domain";

const rules: Array<[IncidentCategory, RegExp]> = [
  ["deployment", /deploy|build failed|wrangler|upload|publish|bundle/i],
  ["module-resolution", /module not found|cannot find module|failed to resolve|import/i],
  ["configuration", /binding|kv|d1|r2|environment variable|compatibility_date|configuration/i],
  ["authorization", /unauthori[sz]ed|forbidden|401|403|permission|token/i],
  ["performance", /timeout|cpu limit|exceeded|slow|latency|memory limit/i],
  ["runtime", /500|exception|error|stack|typeerror|referenceerror|undefined/i]
];

export function classifyIncident(input: string): IncidentCategory {
  return rules.find(([, pattern]) => pattern.test(input))?.[0] ?? "unknown";
}
