export const CHAT_MAX_TURNS = 25;
export const CHAT_TURNS_KEY = "site-agent-turns";
export const CHAT_SESSION_KEY = "site-agent-session";
export const CHAT_LIMIT_NOTE =
  "That is the limit for this chat session. Email Efrain directly to keep the conversation going.";

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) =>
    (byte + 0x100).toString(16).slice(1),
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function mintSessionId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // HTTP and restricted browser contexts can expose a method that throws.
  }

  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    ) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      return bytesToUuid(bytes);
    }
  } catch {
    // Storage and crypto can both be unavailable; the backend may mint an id.
  }

  return "";
}

export function mintMessageId(): string {
  return (
    mintSessionId() ||
    `message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

type ChatSession = {
  sessionId: string;
  turns: number;
};

export function readChatSession(): ChatSession {
  try {
    let sessionId = sessionStorage.getItem(CHAT_SESSION_KEY) || "";
    if (!sessionId) {
      sessionId = mintSessionId();
      sessionStorage.removeItem(CHAT_TURNS_KEY);
      if (sessionId) sessionStorage.setItem(CHAT_SESSION_KEY, sessionId);
    }

    const stored = Number.parseInt(sessionStorage.getItem(CHAT_TURNS_KEY) || "", 10);
    const turns =
      Number.isFinite(stored) && stored >= 0
        ? Math.min(stored, CHAT_MAX_TURNS)
        : 0;
    return { sessionId, turns };
  } catch {
    return { sessionId: mintSessionId(), turns: 0 };
  }
}

export function writeChatSessionId(sessionId: string): void {
  if (!sessionId) return;
  try {
    sessionStorage.setItem(CHAT_SESSION_KEY, sessionId);
  } catch {
    // The caller keeps the id in memory for this page load.
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
