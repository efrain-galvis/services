import { FormEvent, useState } from "react";
import { CopilotKitProvider, useAgent } from "@copilotkit/react-core/v2";

type Props = {
  runtimeUrl: string;
  agentId: string;
  headers: Record<string, string>;
  starters: string[];
  onFailure: () => void;
};

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
  onFailure,
}: Pick<Props, "agentId" | "starters" | "onFailure">) {
  const { agent } = useAgent({ agentId });
  const [input, setInput] = useState("");

  async function send(prompt: string) {
    const text = prompt.trim().slice(0, 2000);
    if (!text || agent.isRunning) return;
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: text });
    setInput("");
    try {
      await agent.runAgent();
    } catch {
      onFailure();
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  const messages = agent.messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );

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
            {messageText(message.content)}
          </p>
        ))}
      </div>
      {messages.length === 0 && (
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
          disabled={agent.isRunning}
          placeholder="Ask LYRA about Efrain’s work…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button type="submit" disabled={agent.isRunning || !input.trim()}>
          {agent.isRunning ? "Thinking…" : "Send"}
        </button>
      </form>
    </>
  );
}

export default function CopilotSurface(props: Props) {
  return (
    <CopilotKitProvider
      runtimeUrl={props.runtimeUrl}
      agentId={props.agentId}
      headers={props.headers}
      onError={props.onFailure}
    >
      <Chat
        agentId={props.agentId}
        starters={props.starters}
        onFailure={props.onFailure}
      />
    </CopilotKitProvider>
  );
}
