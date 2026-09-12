import { FormEvent, useCallback, useRef, useState } from "react";
import {
  CopilotKitProvider,
  type CopilotKitProviderProps,
} from "@copilotkit/react-core/v2";
import { useAgent } from "@copilotkit/react-core/v2/headless";
import {
  CHAT_LIMIT_NOTE,
  CHAT_MAX_TURNS,
  mintMessageId,
  readChatSession,
  writeChatTurns,
} from "./chatLimits";

type Props = {
  runtimeUrl: string;
  agentId: string;
  headers: Record<string, string>;
  starters: string[];
  onConnectionFailure: (draft?: string) => void;
};

type ProviderErrorEvent = Parameters<
  NonNullable<CopilotKitProviderProps["onError"]>
>[0];

const CONNECTION_FAILURE_CODES = new Set([
  "runtime_info_fetch_failed",
  "agent_connect_failed",
]);

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) =>
      typeof part === "object" && part && "text" in part
        ? String((part as { text: unknown }).text)
        : "",
    )
    .filter(Boolean)
    .join("\n");
}

function Chat({
  agentId,
  starters,
  surfaceError,
  setSurfaceError,
  onPendingPrompt,
}: Pick<Props, "agentId" | "starters"> & {
  surfaceError: string;
  setSurfaceError: (message: string) => void;
  onPendingPrompt: (prompt: string) => void;
}) {
  const { agent, isReady } = useAgent({ agentId });
  const [input, setInput] = useState("");
  const [initialSession] = useState(readChatSession);
  const [turns, setTurns] = useState(initialSession.turns);
  const spent = turns >= CHAT_MAX_TURNS;

  async function send(prompt: string) {
    const text = prompt.trim().slice(0, 2000);
    if (!text || !isReady || agent.isRunning || spent) return;
    setSurfaceError("");
    onPendingPrompt(text);
    setInput("");
    const messagesBeforeRun = [...agent.messages];
    try {
      agent.addMessage({ id: mintMessageId(), role: "user", content: text });
      await agent.runAgent();
      const nextTurns = turns + 1;
      setTurns(nextTurns);
      writeChatTurns(nextTurns);
      onPendingPrompt("");
    } catch {
      agent.setMessages(messagesBeforeRun);
      setInput(text);
      onPendingPrompt("");
      setSurfaceError(
        "LYRA could not complete that reply. Your message is restored so you can retry.",
      );
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  const messages = agent.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ ...message, text: messageText(message.content) }))
    .filter((message) => Boolean(message.text));

  return (
    <>
      <div className="fallback-log" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && (
          <p className="message assistant">
            I’m LYRA, an AI system built by Efrain. Ask me about his work,
            approach, or whether your problem is a fit.
          </p>
        )}
        {messages.map((message) => (
          <p className={`message ${message.role}`} key={message.id}>
            {message.text}
          </p>
        ))}
        {surfaceError && <p className="message error">{surfaceError}</p>}
        {spent && <p className="message error">{CHAT_LIMIT_NOTE}</p>}
      </div>
      {messages.length === 0 && isReady && !spent && (
        <div className="starters" aria-label="Suggested questions">
          {starters.map((starter) => (
            <button key={starter} type="button" onClick={() => void send(starter)}>
              {starter}<span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      )}
      <form className="composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="copilot-message">Message LYRA</label>
        <textarea
          id="copilot-message"
          value={input}
          maxLength={2000}
          rows={2}
          disabled={!isReady || agent.isRunning || spent}
          placeholder={isReady ? "Ask LYRA about Efrain’s work…" : "Connecting LYRA…"}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={!isReady || agent.isRunning || spent || !input.trim()}
        >
          {!isReady ? "Connecting…" : agent.isRunning ? "Thinking…" : "Send"}
        </button>
      </form>
    </>
  );
}

export default function CopilotSurface(props: Props) {
  const { onConnectionFailure } = props;
  const [surfaceError, setSurfaceError] = useState("");
  const pendingPrompt = useRef("");
  const handlePendingPrompt = useCallback((prompt: string) => {
    pendingPrompt.current = prompt;
  }, []);
  const handleProviderError = useCallback(
    (event: ProviderErrorEvent) => {
      if (CONNECTION_FAILURE_CODES.has(event.code)) {
        onConnectionFailure(pendingPrompt.current);
        return;
      }
      setSurfaceError(
        "LYRA hit a temporary agent error. Your conversation is still here.",
      );
    },
    [onConnectionFailure],
  );

  return (
    <CopilotKitProvider
      runtimeUrl={props.runtimeUrl}
      agentId={props.agentId}
      headers={props.headers}
      onError={handleProviderError}
    >
      <Chat
        agentId={props.agentId}
        starters={props.starters}
        surfaceError={surfaceError}
        setSurfaceError={setSurfaceError}
        onPendingPrompt={handlePendingPrompt}
      />
    </CopilotKitProvider>
  );
}
