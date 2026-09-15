import { FormEvent, useCallback, useRef, useState } from "react";
import {
  CopilotKitProvider,
  type CopilotKitProviderProps,
  useAgentContext,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { useAgent } from "@copilotkit/react-core/v2/headless";
import { z } from "zod";
import {
  CHAT_LIMIT_NOTE,
  CHAT_MAX_TURNS,
  mintMessageId,
  readChatSession,
  writeChatTurns,
} from "./chatLimits";
import {
  PORTFOLIO_SECTIONS,
  type PortfolioNavigationState,
} from "./portfolioNavigation";
import { PUBLISHED_PROJECTS } from "./projects";

type PortfolioActions = {
  navigateToSection: (sectionId: string) => unknown;
  highlightSection: (sectionId: string) => unknown;
  openProject: (projectId: string) => unknown;
  filterProjects: (filters: string[]) => unknown;
  openTimeline: (filters: string[]) => unknown;
  showContactSection: () => unknown;
};

type Props = {
  runtimeUrl: string;
  agentId: string;
  starters: string[];
  navigationState: PortfolioNavigationState;
  portfolioActions: PortfolioActions;
  onConnectionFailure: (draft?: string) => void;
};

type ProviderErrorEvent = Parameters<
  NonNullable<CopilotKitProviderProps["onError"]>
>[0];

const CONNECTION_FAILURE_CODES = new Set([
  "runtime_info_fetch_failed",
  "agent_connect_failed",
]);

function PortfolioTools({
  agentId,
  navigationState,
  portfolioActions,
}: Pick<Props, "agentId" | "navigationState" | "portfolioActions">) {
  useAgentContext({
    description:
      "Current portfolio UI state. Use it to understand what the visitor is viewing and which filters are active.",
    value: {
      ...navigationState,
      available_section_ids: [...PORTFOLIO_SECTIONS],
      available_project_ids: PUBLISHED_PROJECTS.map(({ id }) => id),
    },
  });

  useFrontendTool(
    {
      name: "navigate_to_section",
      description:
        "Scroll to and focus a portfolio section. Use one of the available section IDs from context.",
      agentId,
      parameters: z.object({ section_id: z.string() }),
      handler: async ({ section_id }) =>
        portfolioActions.navigateToSection(section_id),
    },
    [agentId, portfolioActions],
  );

  useFrontendTool(
    {
      name: "highlight_section",
      description:
        "Scroll to a portfolio section and temporarily emphasize it without generating new UI.",
      agentId,
      parameters: z.object({ section_id: z.string() }),
      handler: async ({ section_id }) =>
        portfolioActions.highlightSection(section_id),
    },
    [agentId, portfolioActions],
  );

  useFrontendTool(
    {
      name: "open_project",
      description:
        "Open and select a published project by ID. If it is unavailable, show the grounded Selected Work thin state.",
      agentId,
      parameters: z.object({ project_id: z.string() }),
      handler: async ({ project_id }) =>
        portfolioActions.openProject(project_id),
    },
    [agentId, portfolioActions],
  );

  useFrontendTool(
    {
      name: "filter_projects",
      description:
        "Open Selected Work and filter projects by exact published skill or technology labels. Pass an empty list to clear filters.",
      agentId,
      parameters: z.object({ criteria: z.array(z.string()) }),
      handler: async ({ criteria }) =>
        portfolioActions.filterProjects(criteria),
    },
    [agentId, portfolioActions],
  );

  useFrontendTool(
    {
      name: "open_timeline",
      description:
        "Open the career timeline with filter IDs from its published filter list. Pass an empty list to show all milestones.",
      agentId,
      parameters: z.object({ filters: z.array(z.string()) }),
      handler: async ({ filters }) => portfolioActions.openTimeline(filters),
    },
    [agentId, portfolioActions],
  );

  useFrontendTool(
    {
      name: "show_contact_section",
      description:
        "Scroll to and focus the private contact form. Do not ask for personal information in chat.",
      agentId,
      parameters: z.object({}),
      handler: async () => portfolioActions.showContactSection(),
    },
    [agentId, portfolioActions],
  );

  return null;
}

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
      onError={handleProviderError}
    >
      <PortfolioTools
        agentId={props.agentId}
        navigationState={props.navigationState}
        portfolioActions={props.portfolioActions}
      />
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
