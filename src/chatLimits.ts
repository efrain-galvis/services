export const CHAT_MAX_TURNS = 25;
export const CHAT_TURNS_KEY = "site-agent-turns";
export const CHAT_LIMIT_NOTE =
  "That is the limit for this chat session. Email Efrain directly to keep the conversation going.";

export function readChatTurns(): number {
  try {
    const stored = Number.parseInt(sessionStorage.getItem(CHAT_TURNS_KEY) || "", 10);
    if (!Number.isFinite(stored) || stored < 0) return 0;
    return Math.min(stored, CHAT_MAX_TURNS);
  } catch {
    return 0;
  }
}

export function writeChatTurns(turns: number): void {
  try {
    sessionStorage.setItem(
      CHAT_TURNS_KEY,
      String(Math.min(Math.max(turns, 0), CHAT_MAX_TURNS)),
    );
  } catch {
    // The in-memory counter still protects this page load when storage is blocked.
  }
}
