export type AgentActivityStatus = "pending" | "success" | "failure";

export type AgentActivityState = {
  id: string;
  label: string;
  status: AgentActivityStatus;
} | null;

export type AgentActivityAction =
  | { type: "start"; id: string; label: string }
  | { type: "succeed"; id: string; label?: string }
  | { type: "fail"; id: string; label?: string }
  | { type: "clear" };

export function agentActivityReducer(
  state: AgentActivityState,
  action: AgentActivityAction,
): AgentActivityState {
  switch (action.type) {
    case "start":
      return { id: action.id, label: action.label, status: "pending" };
    case "succeed":
      if (!state || state.id !== action.id) return state;
      return {
        ...state,
        label: action.label ?? state.label,
        status: "success",
      };
    case "fail":
      if (!state || state.id !== action.id) return state;
      return {
        ...state,
        label: action.label ?? state.label,
        status: "failure",
      };
    case "clear":
      return null;
  }
}

export default function AgentActivity({
  activity,
}: {
  activity: AgentActivityState;
}) {
  if (!activity) return null;

  const statusLabel = {
    pending: "In progress",
    success: "Complete",
    failure: "Could not complete",
  }[activity.status];

  return (
    <div
      className={`agent-activity ${activity.status}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="agent-activity-indicator" aria-hidden="true" />
      <span className="agent-activity-copy">
        <strong>LYRA activity</strong>
        <span>{activity.label}</span>
      </span>
      <span className="agent-activity-status">{statusLabel}</span>
    </div>
  );
}
