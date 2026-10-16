import { z } from "zod";

const agentResponse = z.object({
  sessionId: z.string().min(1).max(100),
  status: z.literal("completed"),
  summary: z.string().min(1).max(2_000)
});

export async function coordinateWithAgent(input: { incidentId: string; description: string; evidence: string }): Promise<z.infer<typeof agentResponse> | null> {
  const origin = process.env.FLAREFIX_AGENT_URL;
  const secret = process.env.FLAREFIX_AGENT_SHARED_SECRET;
  if (!origin || !secret) return null;
  try {
    const target = new URL(`/api/investigations/${encodeURIComponent(input.incidentId)}`, origin);
    const response = await fetch(target, {
      method: "POST", signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ description: input.description.slice(0, 12_000), evidence: input.evidence.slice(0, 20_000) })
    });
    if (!response.ok) return null;
    return agentResponse.safeParse(await response.json()).data ?? null;
  } catch { return null; }
}
