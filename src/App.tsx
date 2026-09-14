import {
  Component,
  FormEvent,
  lazy,
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  CHAT_LIMIT_NOTE,
  CHAT_MAX_TURNS,
  readChatSession,
  writeChatSessionId,
  writeChatTurns,
} from "./chatLimits";
import { DEFAULT_SITE_AGENT_URL } from "./config";
import FitDashboard from "./FitDashboard";
import {
  adaptFitAssessment,
  FIT_ASSESSMENT_FIXTURE,
  type FitAssessment,
} from "./fitAssessment";

const CopilotSurface = lazy(() => import("./CopilotSurface"));

const BACKEND_URL =
  import.meta.env.VITE_SITE_AGENT_URL ||
  DEFAULT_SITE_AGENT_URL;
const RUNTIME_URL = import.meta.env.VITE_COPILOTKIT_RUNTIME_URL || "";
const AGENT_ID = import.meta.env.VITE_COPILOTKIT_AGENT_ID || "lyra";
// This is a public anti-scraping speed bump, never a secret or auth boundary.
const SITE_TOKEN =
  import.meta.env.VITE_SITE_TOKEN || "4f4ec8bc502fe37e4de9805169f4cb89";
const SHOW_FIT_FIXTURE =
  import.meta.env.DEV || import.meta.env.VITE_FIT_DRAFT === "true";
const REQUEST_HEADERS: Record<string, string> = SITE_TOKEN
  ? { "X-Site-Token": SITE_TOKEN }
  : {};
const DEFAULT_STARTERS = [
  "What production AI systems has Efrain built?",
  "How would you evaluate an agent before launch?",
  "I have an AI product idea — where should I start?",
];

type ChatMessage = { role: "user" | "assistant" | "error"; text: string };

class CopilotChunkBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    if (this.state.failed) {
      return <p className="loading-state">Switching to the chat fallback…</p>;
    }
    return this.props.children;
  }
}

async function postJson(path: string, payload: unknown, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...REQUEST_HEADERS },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

function useStarters() {
  const [starters, setStarters] = useState(DEFAULT_STARTERS);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${BACKEND_URL}/v1/starters`, {
      headers: REQUEST_HEADERS,
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Starter request failed");
        return response.json();
      })
      .then((data: unknown) => {
        const source = Array.isArray(data)
          ? data
          : typeof data === "object" && data && "starters" in data
            ? (data as { starters: unknown }).starters
            : [];
        if (!Array.isArray(source)) return;
        const next = source
          .map((item) =>
            typeof item === "string"
              ? item.trim()
              : typeof item === "object" && item && "prompt" in item
                ? String((item as { prompt: unknown }).prompt).trim()
                : "",
          )
          .filter((prompt, index, prompts) =>
            Boolean(prompt) && prompts.indexOf(prompt) === index,
          )
          .slice(0, 4);
        if (next.length) setStarters(next);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return starters;
}

function StarterList({
  starters,
  onSelect,
}: {
  starters: string[];
  onSelect: (prompt: string) => void | Promise<void>;
}) {
  return (
    <div className="starters" aria-label="Suggested questions">
      {starters.map((starter) => (
        <button key={starter} type="button" onClick={() => void onSelect(starter)}>
          {starter}
          <span aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  );
}

function FallbackChat({
  starters,
  initialDraft = "",
}: {
  starters: string[];
  initialDraft?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "I’m LYRA, an AI system built by Efrain. Ask me about his work, approach, or whether your problem is a fit.",
    },
  ]);
  const [input, setInput] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [initialSession] = useState(readChatSession);
  const [sessionId, setSessionId] = useState(initialSession.sessionId);
  const [turns, setTurns] = useState(initialSession.turns);
  const spent = turns >= CHAT_MAX_TURNS;

  async function send(text: string) {
    const prompt = text.trim().slice(0, 2000);
    if (!prompt || busy || spent) return;
    const nextTurns = turns + 1;
    setTurns(nextTurns);
    writeChatTurns(nextTurns);
    setMessages((current) => [...current, { role: "user", text: prompt }]);
    setInput("");
    setBusy(true);
    try {
      const payload: { message: string; session_id?: string } = { message: prompt };
      if (sessionId) payload.session_id = sessionId;
      const data = await postJson("/v1/chat", payload);
      const nextSessionId =
        typeof data.session_id === "string" ? data.session_id.trim() : "";
      if (nextSessionId) {
        setSessionId(nextSessionId);
        writeChatSessionId(nextSessionId);
      }
      const reply = typeof data.reply === "string" ? data.reply : "";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: reply || "I didn’t receive a reply. Please try again.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "error",
          text: "LYRA is offline right now. You can still book a conversation or email Efrain directly.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <>
      <div className="fallback-log" aria-live="polite" aria-label="Conversation">
        {messages.map((message, index) => (
          <p className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.text}
          </p>
        ))}
        {spent && <p className="message error">{CHAT_LIMIT_NOTE}</p>}
      </div>
      {messages.length === 1 && !spent && (
        <StarterList starters={starters} onSelect={send} />
      )}
      <form className="composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="lyra-message">Message LYRA</label>
        <textarea
          id="lyra-message"
          value={input}
          maxLength={2000}
          rows={2}
          disabled={busy || spent}
          placeholder="Ask LYRA about Efrain’s work…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button type="submit" disabled={busy || spent || !input.trim()}>
          {busy ? "Thinking…" : "Send"}
        </button>
      </form>
    </>
  );
}

function FitAssessmentPanel({ onClose }: { onClose: () => void }) {
  const [jobDescription, setJobDescription] = useState("");
  const [assessment, setAssessment] = useState<FitAssessment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const description = jobDescription.trim();
    if (!description || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/v1/fit", {
        job_description: description,
      }, 45_000);
      const nextAssessment = adaptFitAssessment(data);
      if (!nextAssessment) {
        throw new Error("Invalid fit assessment response");
      }
      setAssessment(nextAssessment);
    } catch {
      setError(
        "LYRA could not assess this role right now. Your job description is still here so you can retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (assessment) {
    return <FitDashboard assessment={assessment} onClose={onClose} />;
  }

  return (
    <section className="fit-request" aria-labelledby="fit-request-title">
      <div className="fit-request-heading">
        <div>
          <p className="fit-kicker">LYRA / role fit</p>
          <h2 id="fit-request-title">Assess a role against the work.</h2>
          <p>Paste a job description. LYRA will compare its requirements with Efrain’s documented experience.</p>
        </div>
        <button className="fit-close" type="button" onClick={onClose} aria-label="Close role assessment">
          ×
        </button>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="fit-job-description">Job description</label>
        <textarea
          id="fit-job-description"
          value={jobDescription}
          rows={12}
          maxLength={12_000}
          required
          disabled={busy}
          placeholder="Paste the role title, responsibilities, and requirements…"
          onChange={(event) => setJobDescription(event.target.value)}
        />
        <div className="fit-request-actions">
          <button type="submit" disabled={busy || !jobDescription.trim()}>
            {busy ? "Assessing…" : "Assess fit"}
          </button>
          {SHOW_FIT_FIXTURE && (
            <button
              className="fit-fixture-button"
              type="button"
              onClick={() => setAssessment(FIT_ASSESSMENT_FIXTURE)}
            >
              Load development fixture
            </button>
          )}
        </div>
        <p className="fit-request-note">AI estimate only. Do not paste personal or confidential information.</p>
        <p className="form-status" aria-live="polite">{error}</p>
      </form>
    </section>
  );
}

function LyraHero() {
  const starters = useStarters();
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [fallbackDraft, setFallbackDraft] = useState("");
  const [showFitPanel, setShowFitPanel] = useState(false);
  const handleRuntimeFailure = useCallback((draft = "") => {
    setFallbackDraft(draft);
    setRuntimeFailed(true);
  }, []);
  const useCopilot = Boolean(RUNTIME_URL) && !runtimeFailed;

  return (
    <section className="lyra-shell" id="lyra" aria-labelledby="lyra-title">
      <div className="lyra-bar">
        <div>
          <span className="status-dot" aria-hidden="true" />
          <span>LYRA / live system</span>
        </div>
        <span>Built with CopilotKit + AG-UI</span>
      </div>
      <div className="lyra-intro">
        <p className="eyebrow">Talk to the work</p>
        <h1 id="lyra-title">Efrain builds production AI systems.<br />One of them is talking to you right now.</h1>
        <p>
          LYRA can explain Efrain’s work and help shape your next AI move.
          She is an AI assistant—not Efrain—and will never ask for personal details in chat.
        </p>
      </div>
      <div className="chat-frame">
        {showFitPanel ? (
          <FitAssessmentPanel onClose={() => setShowFitPanel(false)} />
        ) : useCopilot ? (
          <CopilotChunkBoundary onFailure={handleRuntimeFailure}>
            <Suspense fallback={<p className="loading-state">Connecting LYRA…</p>}>
              <CopilotSurface
                runtimeUrl={RUNTIME_URL}
                agentId={AGENT_ID}
                starters={starters}
                onConnectionFailure={handleRuntimeFailure}
              />
            </Suspense>
          </CopilotChunkBoundary>
        ) : (
          <FallbackChat starters={starters} initialDraft={fallbackDraft} />
        )}
        {!showFitPanel && (
          <div className="fit-entry">
            <span>Have a role in mind?</span>
            <button type="button" onClick={() => setShowFitPanel(true)}>
              Assess role fit <span aria-hidden="true">↗</span>
            </button>
          </div>
        )}
      </div>
      <p className="privacy-note">Keep names, email addresses, and confidential details out of chat. Use Book for anything personal.</p>
    </section>
  );
}

function Booking() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setBusy(true);
    setStatus("");
    const values = new FormData(form);
    try {
      await postJson("/v1/meetings", {
        name: values.get("name"),
        email: values.get("email"),
        message: values.get("message"),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, 20_000);
      form.reset();
      setStatus("Request sent. Efrain will follow up by email.");
    } catch {
      setStatus("The booking service is offline. Email galvisefrain@gmail.com instead.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="booking" id="book" aria-labelledby="book-title">
      <div>
        <p className="eyebrow">Book / private channel</p>
        <h2 id="book-title">Ready to put a real problem on the table?</h2>
        <p>Personal information goes directly to the meeting service, never through LYRA or a model.</p>
      </div>
      <form onSubmit={submit}>
        <label>Name<input name="name" autoComplete="name" maxLength={100} required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label className="wide">What should we discuss?<textarea name="message" rows={3} maxLength={2000} required /></label>
        <button type="submit" disabled={busy}>{busy ? "Sending…" : "Request a conversation"}</button>
        <p className="form-status" aria-live="polite">{status}</p>
      </form>
    </section>
  );
}

export default function App() {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#lyra">E. Galvis / AI systems</a>
        <nav aria-label="Primary">
          <a href="#work">Work</a>
          <a href="#book">Book</a>
          <a href="https://github.com/efrain-galvis" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>
      <main>
        <LyraHero />
        <section className="work" id="work" aria-labelledby="work-title">
          <div className="section-heading">
            <p className="eyebrow">The portfolio around LYRA</p>
            <h2 id="work-title">AI that earns its place in production.</h2>
          </div>
          <div className="work-grid">
            <article><span>01</span><h3>Agent products</h3><p>Tool design, retrieval, memory, and the evaluations that make agents reliable enough to ship.</p></article>
            <article><span>02</span><h3>AI-driven teams</h3><p>Practical systems for deciding, building, and operating with AI while keeping human judgment where it matters.</p></article>
            <article><span>03</span><h3>Production reviews</h3><p>Focused reviews of architecture, guardrails, cost, failure modes, and what not to build.</p></article>
          </div>
        </section>
        <Booking />
      </main>
      <footer>
        <span>© 2026 Efrain Galvis · Working remotely</span>
        <span>LYRA is an AI assistant and does not speak as Efrain.</span>
      </footer>
    </>
  );
}
