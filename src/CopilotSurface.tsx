import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
import type { AgentActivityAction } from "./AgentActivity";
import {
  PORTFOLIO_SECTIONS,
  type PortfolioNavigationAction,
  type PortfolioNavigationState,
} from "./portfolioNavigation";
import { PUBLISHED_PROJECTS } from "./projects";

type PortfolioActions = {
  navigateToSection: (sectionId: string) => unknown;
  highlightSection: (sectionId: string) => unknown;
  openProject: (projectId: string) => unknown;
  filterProjects: (filters: string[]) => unknown;
  openTimeline: (filters: string[]) => unknown;
  setVisitorIntent: (intent: string) => unknown;
  showJobFitAssessment: (assessment: unknown) => unknown;
  showContactSection: () => unknown;
  startBooking: () => unknown;
};

type Props = {
  runtimeUrl: string;
  agentId: string;
  starters: string[];
  navigationState: PortfolioNavigationState;
  portfolioActions: PortfolioActions;
  dispatchSharedState: (action: PortfolioNavigationAction) => void;
  dispatchActivity: (action: AgentActivityAction) => void;
  onConnectionFailure: (draft?: string) => void;
};

type ProviderErrorEvent = Parameters<
  NonNullable<CopilotKitProviderProps["onError"]>
>[0];

const CONNECTION_FAILURE_CODES = new Set([
  "runtime_info_fetch_failed",
  "agent_connect_failed",
]);

const fitAssessmentSchema = z.object({
  role_title: z.string(),
  overall_score: z.number().int().min(0).max(100),
  label: z.enum(["Strong", "Partial", "Limited", "No evidence"]),
  assessment_type: z.literal("AI estimate"),
  dimensions: z.array(
    z.object({
      name: z.string(),
      score: z.number().int().min(0).max(100),
    }),
  ),
  matches: z.array(
    z.object({
      requirement: z.string(),
      level: z.enum(["Strong", "Partial", "No evidence"]),
      evidence_id: z.string().optional(),
      evidence_text: z.string().optional(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  gaps: z.array(z.string()),
  summary: z.string(),
});

function resultFailed(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok: unknown }).ok === false
  );
}

async function runVisibleActivity(
  dispatch: Props["dispatchActivity"],
  label: string,
  operation: () => unknown | Promise<unknown>,
) {
  const id = mintMessageId();
  dispatch({ type: "start", id, label });
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  try {
    const result = await operation();
    dispatch({ type: resultFailed(result) ? "fail" : "succeed", id });
    return result;
  } catch (error) {
    dispatch({ type: "fail", id });
    throw error;
  }
}

function PortfolioTools({
  agentId,
  navigationState,
  portfolioActions,
  dispatchActivity,
}: Pick<
  Props,
  "agentId" | "navigationState" | "portfolioActions" | "dispatchActivity"
>) {
  useAgentContext({
    description:
      "Current portfolio UI state. Use it to understand what the visitor is viewing and which filters are active.",
    value: {
      active_section: navigationState.active_section,
      selected_project: navigationState.selected_project,
      timeline_filter: navigationState.timeline_filter,
      visitor_intent: navigationState.visitor_intent,
      job_fit_assessment: navigationState.job_fit_assessment,
      visitor_timezone: navigationState.visitor_timezone,
      conversation_id: navigationState.conversation_id,
      booking_state: navigationState.booking_state,
      project_filters: navigationState.project_filters,
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
        runVisibleActivity(dispatchActivity, "Opening the requested section…", () =>
          portfolioActions.navigateToSection(section_id),
        ),
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
        runVisibleActivity(dispatchActivity, "Highlighting relevant information…", () =>
          portfolioActions.highlightSection(section_id),
        ),
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
        runVisibleActivity(dispatchActivity, "Finding supporting projects…", () =>
          portfolioActions.openProject(project_id),
        ),
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
        runVisibleActivity(dispatchActivity, "Finding supporting projects…", () =>
          portfolioActions.filterProjects(criteria),
        ),
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
      handler: async ({ filters }) =>
        runVisibleActivity(dispatchActivity, "Reviewing career history…", () =>
          portfolioActions.openTimeline(filters),
        ),
    },
    [agentId, portfolioActions],
  );

  useFrontendTool(
    {
      name: "set_visitor_intent",
      description:
        "Update the visitor's current high-level intent when they state or change their goal.",
      agentId,
      parameters: z.object({ visitor_intent: z.string().max(160) }),
      handler: async ({ visitor_intent }) =>
        runVisibleActivity(dispatchActivity, "Updating conversation context…", () =>
          portfolioActions.setVisitorIntent(visitor_intent),
        ),
    },
    [agentId, dispatchActivity, portfolioActions],
  );

  useFrontendTool(
    {
      name: "show_job_fit_assessment",
      description:
        "Display a grounded job fit assessment that follows the published assessment schema.",
      agentId,
      parameters: z.object({ assessment: fitAssessmentSchema }),
      handler: async ({ assessment }) =>
        runVisibleActivity(
          dispatchActivity,
          "Matching against Efrain’s experience…",
          () => portfolioActions.showJobFitAssessment(assessment),
        ),
    },
    [agentId, dispatchActivity, portfolioActions],
  );

  useFrontendTool(
    {
      name: "show_availability",
      description:
        "Open the verified availability picker. Never invent slots or ask for personal information in chat.",
      agentId,
      parameters: z.object({}),
      handler: async () =>
        runVisibleActivity(dispatchActivity, "Checking Efrain’s availability…", () =>
          portfolioActions.showContactSection(),
        ),
    },
    [agentId, portfolioActions],
  );

  useFrontendTool(
    {
      name: "start_booking",
      description:
        "Open the private booking flow and set its shared state to picking. The visitor enters all personal information directly in the UI.",
      agentId,
      parameters: z.object({}),
      handler: async () =>
        runVisibleActivity(dispatchActivity, "Checking Efrain’s availability…", () =>
          portfolioActions.startBooking(),
        ),
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
  dispatchSharedState,
  dispatchActivity,
}: Pick<Props, "agentId" | "starters"> & {
  surfaceError: string;
  setSurfaceError: (message: string) => void;
  onPendingPrompt: (prompt: string) => void;
  dispatchSharedState: Props["dispatchSharedState"];
  dispatchActivity: Props["dispatchActivity"];
}) {
  const { agent, isReady } = useAgent({ agentId });
  const [input, setInput] = useState("");
  const [initialSession] = useState(readChatSession);
  const [turns, setTurns] = useState(initialSession.turns);
  const spent = turns >= CHAT_MAX_TURNS;

  useEffect(() => {
    dispatchSharedState({
      type: "set_conversation_id",
      conversationId: initialSession.sessionId,
    });
  }, [dispatchSharedState, initialSession.sessionId]);

  function promptActivityLabel(prompt: string) {
    if (/\b(job|role|fit|requirements?)\b/i.test(prompt)) {
      return "Analyzing job requirements…";
    }
    if (/\b(project|portfolio|evidence|work)\b/i.test(prompt)) {
      return "Finding supporting projects…";
    }
    if (/\b(available|availability|book|meeting|conversation)\b/i.test(prompt)) {
      return "Checking Efrain’s availability…";
    }
    return "Reviewing your request…";
  }

  async function send(prompt: string) {
    const text = prompt.trim().slice(0, 2000);
    if (!text || !isReady || agent.isRunning || spent) return;
    setSurfaceError("");
    onPendingPrompt(text);
    setInput("");
    dispatchSharedState({
      type: "set_visitor_intent",
      intent: "talk_with_lyra",
    });
    const messagesBeforeRun = [...agent.messages];
    const activityId = mintMessageId();
    dispatchActivity({
      type: "start",
      id: activityId,
      label: promptActivityLabel(text),
    });
    try {
      agent.addMessage({ id: mintMessageId(), role: "user", content: text });
      await agent.runAgent();
      const nextTurns = turns + 1;
      setTurns(nextTurns);
      writeChatTurns(nextTurns);
      dispatchActivity({ type: "succeed", id: activityId });
      onPendingPrompt("");
    } catch {
      agent.setMessages(messagesBeforeRun);
      setInput(text);
      onPendingPrompt("");
      dispatchActivity({ type: "fail", id: activityId });
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
        dispatchActivity={props.dispatchActivity}
      />
      <Chat
        agentId={props.agentId}
        starters={props.starters}
        surfaceError={surfaceError}
        setSurfaceError={setSurfaceError}
        onPendingPrompt={handlePendingPrompt}
        dispatchSharedState={props.dispatchSharedState}
        dispatchActivity={props.dispatchActivity}
      />
    </CopilotKitProvider>
  );
}
