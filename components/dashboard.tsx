"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Incident, VerificationState } from "@/lib/domain";

type ApiResponse = { incidents?: Incident[]; incident?: Incident; persistence?: string; error?: string };
type RecognitionResult = { 0?: { transcript?: string } };
type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

const example =
  "Deployment succeeds, but my Worker returns HTTP 500 for certain requests. TypeError: Cannot read properties of undefined (reading 'id') at src/worker.ts:24:11";

type DashboardUser = { id: string; email: string };

export function Dashboard({ user, onLogout }: { user: DashboardUser; onLogout: () => void }) {
  const [description, setDescription] = useState("");
  const [logs, setLogs] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [persistence, setPersistence] = useState("");
  const [speaking, setSpeaking] = useState(true);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    void load();
    return () => recognition.current?.stop();
  }, []);

  async function load() {
    const response = await fetch("/api/incidents");
    const data = (await response.json()) as ApiResponse;
    if (data.incidents) {
      setIncidents(data.incidents);
      setPersistence(data.persistence ?? "");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, logs, configuration }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.incident) throw new Error(data.error || "Unable to create incident.");
      setSelected(data.incident);
      setIncidents((current) => [data.incident!, ...current]);
      setPersistence(data.persistence ?? "");
      setDescription("");
      setLogs("");
      setConfiguration("");
      speak(data.incident.diagnostic.summary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create incident.");
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Speech recognition is not available in this browser. You can continue with text.");
      return;
    }
    const listener = new Constructor();
    listener.lang = "en-US";
    listener.interimResults = true;
    listener.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("");
      setDescription(text);
    };
    listener.onerror = () => {
      setListening(false);
      setError("Speech recognition ended without a usable transcription.");
    };
    listener.start();
    recognition.current = listener;
    setListening(true);
  }

  function stopVoice() {
    recognition.current?.stop();
    setListening(false);
  }

  function speak(text: string) {
    if (speaking && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  }

  async function updateStep(stepId: string, state: VerificationState) {
    if (!selected) return;
    const result =
      state === "passed" ? window.prompt("Record the command/output that proves this passed:") ?? "" : "";
    if (state === "passed" && !result) return;
    const response = await fetch(`/api/incidents/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, state, result }),
    });
    const data = (await response.json()) as ApiResponse;
    if (data.incident) {
      setSelected(data.incident);
      setIncidents((current) => current.map((item) => (item.id === data.incident!.id ? data.incident! : item)));
    } else {
      setError(data.error || "Could not update verification.");
    }
  }

  return (
    <div className="shell">
      <header>
        <div className="brand-mark" aria-hidden="true">
          FF
        </div>
        <div>
          <p className="eyebrow">Cloudflare Workers incident desk</p>
          <h1>FlareFix</h1>
          <p className="tagline">Find the fault. Fix the flare.</p>
        </div>
        <div className="header-actions">
          <label className="speech-toggle">
            <input type="checkbox" checked={speaking} onChange={(event) => setSpeaking(event.target.checked)} />
            Speak results
          </label>
          <div className="account">
            <span className="account-email" title={user.email}>
              {user.email}
            </span>
            <button type="button" className="secondary logout" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="grid">
        <section className="panel composer">
          <div className="section-heading">
            <div>
              <p className="eyebrow">New investigation</p>
              <h2>Analyze an incident</h2>
            </div>
            <span className="status ready">Ready</span>
          </div>

          <form onSubmit={submit}>
            <label htmlFor="description">What happened?</label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the deployment or runtime failure…"
              required
              minLength={12}
            />

            <div className="voice-row">
              <button type="button" className="secondary" onClick={startVoice} aria-pressed={listening}>
                {listening ? "● Listening…" : "Start voice input"}
              </button>
              <button type="button" className="text-button" onClick={stopVoice}>
                Stop
              </button>
              <span>Transcription stays editable.</span>
            </div>

            <label htmlFor="logs">
              Logs or stack trace <small>optional · secrets are redacted from extracted evidence</small>
            </label>
            <textarea
              id="logs"
              className="short"
              value={logs}
              onChange={(event) => setLogs(event.target.value)}
              placeholder="Paste sanitized logs or a stack trace"
            />

            <label htmlFor="config">
              Relevant Wrangler configuration <small>optional</small>
            </label>
            <textarea
              id="config"
              className="short"
              value={configuration}
              onChange={(event) => setConfiguration(event.target.value)}
              placeholder="name, compatibility_date, bindings…"
            />

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? "Investigating…" : "Analyze incident"}
              </button>
              <button type="button" className="secondary" onClick={() => setDescription(example)}>
                Use example
              </button>
            </div>
          </form>
        </section>

        <aside className="panel history">
          <p className="eyebrow">Incident history</p>
          <h2>Recent investigations</h2>
          <p className="muted">
            {persistence === "mongodb"
              ? "Stored in MongoDB."
              : "Development memory only; configure MongoDB for durable history."}
          </p>
          <div className="incident-list">
            {incidents.length ? (
              incidents.map((incident) => (
                <button
                  key={incident.id}
                  className={selected?.id === incident.id ? "incident selected" : "incident"}
                  onClick={() => {
                    setSelected(incident);
                    speak(incident.diagnostic.summary);
                  }}
                >
                  <strong>{incident.title}</strong>
                  <span>
                    {incident.diagnostic.category.replace(/-/g, " ")} ·{" "}
                    {new Date(incident.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              ))
            ) : (
              <p className="empty">No incidents yet. Start with the example above.</p>
            )}
          </div>
        </aside>
      </div>

      {selected && <Investigation incident={selected} onUpdate={updateStep} />}
    </div>
  );
}

function Investigation({
  incident,
  onUpdate,
}: {
  incident: Incident;
  onUpdate: (id: string, state: VerificationState) => void;
}) {
  const { diagnostic: d } = incident;
  return (
    <section className="result">
      <div className="result-intro">
        <p className="eyebrow">Investigation result</p>
        <h2>{d.summary}</h2>
        <span className={`confidence ${d.confidence}`}>{d.confidence} confidence</span>
        <p>{d.confidenceExplanation}</p>
      </div>

      <div className="result-grid">
        <article>
          <h3>
            Probable root cause <small>Hypothesis</small>
          </h3>
          <p>{d.probableCause}</p>

          <h3>
            Supporting evidence <small>Facts</small>
          </h3>
          <ul>
            {d.evidence.map((item, index) => (
              <li key={index}>
                <strong>{item.label}:</strong> {item.detail}
              </li>
            ))}
          </ul>

          <h3>Missing information</h3>
          <ul>
            {d.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article>
          <h3>Official documentation</h3>
          {d.documentation.map((source) => (
            <a className="doc" href={source.url} target="_blank" rel="noreferrer" key={source.url}>
              <strong>{source.title}</strong>
              <span>{source.relevance}</span>
              <em>{source.retrieved ? "Retrieved from Cloudflare" : "Link available; retrieval was unavailable"}</em>
            </a>
          ))}

          <h3>
            Suggested minimal fix <small>Suggestion</small>
          </h3>
          <p>{d.suggestedFix.change}</p>
          <p className="muted">Why: {d.suggestedFix.rationale}</p>
          <p className="warning">Risk: {d.suggestedFix.risks}</p>

          {d.coordination && (
            <>
              <h3>Agent coordination</h3>
              <p className="muted">
                {d.coordination.status === "completed"
                  ? "Cloudflare Agent session completed."
                  : "Agent endpoint is not configured; deterministic analysis was used."}
              </p>
              {d.coordination.summary && <p>{d.coordination.summary}</p>}
            </>
          )}
        </article>
      </div>

      <article className="verification">
        <h3>
          Verification checklist <small>Not automatically executed</small>
        </h3>
        {d.verificationPlan.map((step) => (
          <div className="verification-step" key={step.id}>
            <div>
              <strong>{step.instruction}</strong>
              {step.result && <span className="record">Recorded: {step.result}</span>}
            </div>
            <span className={`status ${step.state}`}>{step.state.replace(/-/g, " ")}</span>
            <select
              aria-label={`Set state for ${step.id}`}
              value={step.state}
              onChange={(event) => onUpdate(step.id, event.target.value as VerificationState)}
            >
              <option value="suggested">Suggested</option>
              <option value="running">Running</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
              <option value="not-verified">Not verified</option>
            </select>
          </div>
        ))}
      </article>
    </section>
  );
}
