import type { DocumentationSource, IncidentCategory } from "@/lib/domain";

const sources: Record<IncidentCategory, Omit<DocumentationSource, "retrieved">[]> = {
  deployment: [{ title: "Wrangler commands", url: "https://developers.cloudflare.com/workers/wrangler/commands/", relevance: "Covers deployment and build command behavior." }],
  runtime: [{ title: "Workers errors", url: "https://developers.cloudflare.com/workers/observability/errors/", relevance: "Explains Worker exceptions and error reporting." }],
  configuration: [{ title: "Bindings", url: "https://developers.cloudflare.com/workers/runtime-apis/bindings/", relevance: "Explains binding configuration and runtime access." }],
  "module-resolution": [{ title: "JavaScript modules", url: "https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/", relevance: "Covers module-format and import migration issues." }],
  authorization: [{ title: "API token permissions", url: "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/", relevance: "Covers scoped API token creation and permissions." }],
  performance: [{ title: "Workers limits", url: "https://developers.cloudflare.com/workers/platform/limits/", relevance: "Lists runtime and resource limits relevant to performance failures." }],
  unknown: [{ title: "Workers documentation", url: "https://developers.cloudflare.com/workers/", relevance: "Starting point while more evidence is collected." }]
};

function isApproved(url: string): boolean { return new URL(url).hostname === "developers.cloudflare.com"; }

export async function retrieveOfficialDocs(category: IncidentCategory): Promise<DocumentationSource[]> {
  return Promise.all(sources[category].map(async (source) => {
    if (!isApproved(source.url)) return { ...source, retrieved: false };
    try {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(3_000), headers: { "User-Agent": "FlareFix documentation retrieval" } });
      return { ...source, retrieved: response.ok };
    } catch { return { ...source, retrieved: false }; }
  }));
}

export function isValidDocumentationSource(source: DocumentationSource): boolean {
  try { return isApproved(source.url) && source.title.length > 0 && source.relevance.length > 0; } catch { return false; }
}
