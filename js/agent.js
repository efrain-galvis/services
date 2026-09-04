(function () {
  const AGENT_URL = "https://site-agent-production.up.railway.app";
  // Public speed-bump filter for curl, not a secret.
  const SITE_TOKEN = "4f4ec8bc502fe37e4de9805169f4cb89";
  const SESSION_KEY = "site-agent-session";
  const TURNS_KEY = "site-agent-turns";
  // Client-side guards. These are a courtesy to the backend, not a control:
  // anything here is trivially bypassed with curl or devtools. The real rate
  // limiting, per-request token cap and spend ceiling have to live in the
  // Railway service. See SECURITY-TODO.md.
  const CHAT_MAX = 2000;
  const CHAT_MAX_TURNS = 25;
  const CHAT_TIMEOUT_MS = 25000;
  const MEETINGS_TIMEOUT_MS = 20000;
  const LIMIT_NOTE =
    "That is the limit for this chat session. Use the contact form to keep the conversation going.";
  const WELCOME =
    "Ask about Efrain's AI consulting — product work, LLM systems, or a short review. What are you trying to ship?";

  if (!AGENT_URL) return;

  const rootUrl = AGENT_URL.replace(/\/$/, "");

  function readStoredSession() {
    try {
      return sessionStorage.getItem(SESSION_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function writeStoredSession(id) {
    try {
      sessionStorage.setItem(SESSION_KEY, id);
    } catch (err) {
      // Private mode can block sessionStorage; in-memory id still works this tab.
    }
  }

  // The turn count has to live wherever the session id lives. Keeping it in
  // memory alone meant a reload restored the same conversation with the
  // counter back at zero, handing out another 25 turns on the same backend
  // context. Storage can be unavailable, in which case the cap degrades to
  // per-page-load -- still a courtesy guard, never a security boundary.
  function readStoredTurns() {
    try {
      const raw = parseInt(sessionStorage.getItem(TURNS_KEY), 10);
      if (!isFinite(raw) || raw < 0) return 0;
      return Math.min(raw, CHAT_MAX_TURNS);
    } catch (err) {
      return 0;
    }
  }

  function writeStoredTurns(count) {
    try {
      sessionStorage.setItem(TURNS_KEY, String(count));
    } catch (err) {
      // Same as above: the in-memory count still holds for this page load.
    }
  }

  function bytesToUuid(bytes) {
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += (bytes[i] + 0x100).toString(16).slice(1);
    }
    return (
      hex.slice(0, 8) +
      "-" +
      hex.slice(8, 12) +
      "-" +
      hex.slice(12, 16) +
      "-" +
      hex.slice(16, 20) +
      "-" +
      hex.slice(20)
    );
  }

  function mintSessionId() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch (err) {
      // HTTP / non-secure contexts can throw even when the method exists.
    }
    try {
      if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        return bytesToUuid(bytes);
      }
    } catch (err) {
      // getRandomValues is also missing or blocked in some old / restricted runtimes.
    }
    return "";
  }

  function ensureSessionId() {
    try {
      const stored = readStoredSession();
      if (stored) return stored;
      const minted = mintSessionId();
      if (minted) writeStoredSession(minted);
      return minted;
    } catch (err) {
      return "";
    }
  }

  let sessionId = ensureSessionId();

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        const value = attrs[key];
        if (value == null || value === false) return;
        if (key === "className") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value === true ? "" : String(value));
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  // Built as nodes rather than markup so no code path in this file parses
  // HTML. The DOM never gets a string it has to interpret.
  function icon(variant, path) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "agent-icon agent-icon-" + variant);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const node = document.createElementNS(SVG_NS, "path");
    node.setAttribute("fill", "currentColor");
    node.setAttribute("d", path);
    svg.appendChild(node);
    return svg;
  }

  const CHAT_PATH =
    "M5.2 18.6 3 21.2V6.4A2.4 2.4 0 0 1 5.4 4h13.2A2.4 2.4 0 0 1 21 6.4v9.2a2.4 2.4 0 0 1-2.4 2.4H8.1l-2.9 2.6Zm.6-2.2.9-.8h12.3V6.4H5.4v10z";
  const CLOSE_PATH =
    "M6.4 5.3 12 10.9l5.6-5.6 1.1 1.1L13.1 12l5.6 5.6-1.1 1.1L12 13.1l-5.6 5.6-1.1-1.1L10.9 12 5.3 6.4l1.1-1.1Z";

  const launcher = el("button", {
    className: "agent-launcher",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": "agent-panel",
    "aria-label": "Ask about working together",
  }, [icon("chat", CHAT_PATH), icon("close", CLOSE_PATH)]);

  const panelTitle = el("h2", { className: "agent-title", id: "agent-title", text: "Working together" });
  const panelKicker = el("p", { className: "agent-kicker", text: "AI consulting" });
  const panelClose = el("button", {
    className: "agent-panel-close",
    type: "button",
    "aria-label": "Close chat",
  }, [icon("close", CLOSE_PATH)]);

  const tabChat = el("button", {
    className: "agent-tab",
    type: "button",
    id: "agent-tab-chat",
    role: "tab",
    "aria-selected": "true",
    "aria-controls": "agent-pane-chat",
    text: "Chat",
  });
  const tabBook = el("button", {
    className: "agent-tab",
    type: "button",
    id: "agent-tab-book",
    role: "tab",
    "aria-selected": "false",
    "aria-controls": "agent-pane-book",
    tabindex: "-1",
    text: "Book",
  });

  const log = el("div", {
    className: "agent-log",
    id: "agent-log",
    "aria-live": "polite",
  });
  log.appendChild(el("p", { className: "agent-msg agent-msg-assistant", text: WELCOME }));

  const chatInput = el("textarea", {
    className: "agent-input",
    id: "agent-chat-input",
    name: "agent-message",
    rows: "2",
    maxlength: String(CHAT_MAX),
    placeholder: "Ask about a project…",
    "aria-label": "Message about working together",
  });
  const chatSend = el("button", {
    className: "btn btn-primary agent-send",
    type: "submit",
    text: "Send",
  });
  const chatForm = el("form", { className: "agent-chat-form", id: "agent-chat-form" }, [
    chatInput,
    chatSend,
  ]);
  const paneChat = el("div", {
    className: "agent-pane",
    id: "agent-pane-chat",
    role: "tabpanel",
    "aria-labelledby": "agent-tab-chat",
  }, [log, chatForm]);

  const bookName = el("input", {
    id: "agent-book-name",
    name: "name",
    type: "text",
    autocomplete: "name",
    required: true,
  });
  const bookEmail = el("input", {
    id: "agent-book-email",
    name: "email",
    type: "email",
    autocomplete: "email",
    required: true,
  });
  const bookMessage = el("textarea", {
    id: "agent-book-message",
    name: "message",
    rows: "4",
    required: true,
  });
  const defaultTz = (function () {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (err) {
      return "";
    }
  })();
  const bookTz = el("input", {
    id: "agent-book-timezone",
    name: "timezone",
    type: "text",
    autocomplete: "off",
    value: defaultTz,
  });
  const bookStatus = el("p", {
    className: "agent-book-status",
    id: "agent-book-status",
    "aria-live": "polite",
  });
  const bookSubmit = el("button", {
    className: "btn btn-primary",
    type: "submit",
    text: "Send request",
  });
  const bookForm = el("form", { className: "agent-book-form", id: "agent-book-form", novalidate: true }, [
    el("div", { className: "field" }, [
      el("label", { for: "agent-book-name", text: "Name" }),
      bookName,
    ]),
    el("div", { className: "field" }, [
      el("label", { for: "agent-book-email", text: "Email" }),
      bookEmail,
    ]),
    el("div", { className: "field" }, [
      el("label", { for: "agent-book-message", text: "What you want to talk about" }),
      bookMessage,
    ]),
    el("div", { className: "field" }, [
      el("label", { for: "agent-book-timezone", text: "Timezone (optional)" }),
      bookTz,
    ]),
    bookSubmit,
    bookStatus,
  ]);
  const paneBook = el("div", {
    className: "agent-pane",
    id: "agent-pane-book",
    role: "tabpanel",
    "aria-labelledby": "agent-tab-book",
    hidden: true,
  }, [bookForm]);

  const panel = el("section", {
    className: "agent-panel",
    id: "agent-panel",
    hidden: true,
    "aria-labelledby": "agent-title",
  }, [
    el("header", { className: "agent-panel-head" }, [
      el("div", { className: "agent-panel-copy" }, [panelKicker, panelTitle]),
      panelClose,
    ]),
    el("div", { className: "agent-tabs", role: "tablist", "aria-label": "Assistant" }, [tabChat, tabBook]),
    paneChat,
    paneBook,
  ]);

  const root = el("div", { className: "agent-root" }, [launcher, panel]);
  document.body.appendChild(root);
  document.body.classList.add("agent-on");

  let open = false;
  let chatBusy = false;
  let chatTurns = readStoredTurns();
  let bookBusy = false;
  let activeTab = "chat";

  function setOpen(next) {
    open = next;
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      panel.removeAttribute("hidden");
      if (activeTab === "chat") chatInput.focus();
      else bookName.focus();
    } else {
      panel.setAttribute("hidden", "");
      launcher.focus();
    }
  }

  function toggle() {
    setOpen(!open);
  }

  function showTab(name) {
    activeTab = name;
    const chatOn = name === "chat";
    tabChat.setAttribute("aria-selected", chatOn ? "true" : "false");
    tabBook.setAttribute("aria-selected", chatOn ? "false" : "true");
    tabChat.tabIndex = chatOn ? 0 : -1;
    tabBook.tabIndex = chatOn ? -1 : 0;
    if (chatOn) paneBook.setAttribute("hidden", "");
    else paneBook.removeAttribute("hidden");
    if (chatOn) paneChat.removeAttribute("hidden");
    else paneChat.setAttribute("hidden", "");
    if (open) {
      if (chatOn) chatInput.focus();
      else bookName.focus();
    }
  }

  // Model output and the user's own echo both land here, and both are
  // untrusted: an agent will happily repeat back whatever a visitor, or a
  // page it retrieved, told it to say. Keep this on textContent. If rich
  // replies are ever wanted, build the nodes with createElement against an
  // allowlist of tags -- never assemble a string and hand it to the parser.
  function addMessage(kind, text) {
    log.appendChild(el("p", { className: "agent-msg agent-msg-" + kind, text: text }));
    log.scrollTop = log.scrollHeight;
  }

  // A reload that lands on a spent session must come back spent, rather than
  // offering a composer the cap will reject on submit.
  if (chatTurns >= CHAT_MAX_TURNS) {
    chatInput.disabled = true;
    chatSend.disabled = true;
    addMessage("error", LIMIT_NOTE);
  }

  function humanError(res) {
    if (!res) {
      return "Could not reach the assistant. Check your connection, or use the contact form.";
    }
    if (res.status === 401) {
      return "This chat is not authorized right now. Try again later, or use the contact form.";
    }
    if (res.status === 429) {
      return "This chat has reached its limit for now. Try later, or write via the contact form.";
    }
    return "The assistant could not reply just now. Try again, or use the contact form.";
  }

  function isAbortError(err) {
    return Boolean(err && err.name === "AbortError");
  }

  async function postJson(path, body, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    try {
      const res = await fetch(rootUrl + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Site-Token": SITE_TOKEN,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      let data = null;
      const raw = await res.text();
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch (err) {
          data = null;
        }
      }
      return { res: res, data: data };
    } finally {
      clearTimeout(timer);
    }
  }

  launcher.addEventListener("click", toggle);
  panelClose.addEventListener("click", function () {
    setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  });

  tabChat.addEventListener("click", function () {
    showTab("chat");
  });
  tabBook.addEventListener("click", function () {
    showTab("book");
  });

  tabChat.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      showTab("book");
      tabBook.focus();
    }
  });
  tabBook.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      showTab("chat");
      tabChat.focus();
    }
  });

  chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (chatBusy) return;
    const message = (chatInput.value || "").trim();
    if (!message) {
      chatInput.focus();
      return;
    }
    if (chatTurns >= CHAT_MAX_TURNS) {
      addMessage("error", LIMIT_NOTE);
      return;
    }
    const clipped = message.slice(0, CHAT_MAX);
    chatInput.value = "";
    addMessage("user", clipped);
    chatTurns += 1;
    writeStoredTurns(chatTurns);
    chatBusy = true;
    chatSend.disabled = true;
    chatInput.disabled = true;
    chatSend.textContent = "Sending…";
    try {
      const payload = { message: clipped };
      if (sessionId) payload.session_id = sessionId;
      const result = await postJson("/v1/chat", payload, CHAT_TIMEOUT_MS);
      const minted =
        result.data && typeof result.data.session_id === "string" ? result.data.session_id.trim() : "";
      if (minted) {
        sessionId = minted;
        writeStoredSession(sessionId);
      }
      if (!result.res.ok) {
        addMessage("error", humanError(result.res));
      } else {
        const reply = result.data && typeof result.data.reply === "string" ? result.data.reply.trim() : "";
        addMessage("assistant", reply || "No reply came back. Try again, or use the contact form.");
      }
    } catch (err) {
      if (isAbortError(err)) {
        addMessage("error", "The assistant took too long. Try again, or use the contact form.");
      } else {
        addMessage("error", humanError(null));
      }
    } finally {
      chatBusy = false;
      const spent = chatTurns >= CHAT_MAX_TURNS;
      chatSend.disabled = spent;
      chatInput.disabled = spent;
      chatSend.textContent = "Send";
      if (spent) addMessage("error", LIMIT_NOTE);
      else chatInput.focus();
    }
  });

  chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  bookForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (bookBusy) return;
    const name = (bookName.value || "").trim();
    const email = (bookEmail.value || "").trim();
    const message = (bookMessage.value || "").trim();
    const timezone = (bookTz.value || "").trim();
    if (!name || !email || !message) {
      bookForm.reportValidity();
      return;
    }
    bookBusy = true;
    bookSubmit.disabled = true;
    bookSubmit.textContent = "Sending…";
    bookStatus.textContent = "";
    bookStatus.classList.remove("is-ok", "is-err");
    const payload = { name: name, email: email, message: message };
    if (timezone) payload.timezone = timezone;
    try {
      const result = await postJson("/v1/meetings", payload, MEETINGS_TIMEOUT_MS);
      if (!result.res.ok) {
        let note = "Could not send the request just now. Use the contact form on this page instead.";
        if (result.res.status === 401) {
          note = "This request is not authorized right now. Use the contact form on this page instead.";
        } else if (result.res.status === 429) {
          note = "Too many requests right now. Try later, or use the contact form on this page.";
        }
        bookStatus.textContent = note;
        bookStatus.classList.add("is-err");
      } else {
        bookStatus.textContent = "Thanks — the request was sent. You can also write via the contact form if you prefer email.";
        bookStatus.classList.add("is-ok");
        bookForm.reset();
        bookTz.value = defaultTz;
      }
    } catch (err) {
      if (isAbortError(err)) {
        bookStatus.textContent = "The request took too long. Use the contact form on this page instead.";
      } else {
        bookStatus.textContent = "Could not reach the server. Use the contact form on this page instead.";
      }
      bookStatus.classList.add("is-err");
    } finally {
      bookBusy = false;
      bookSubmit.disabled = false;
      bookSubmit.textContent = "Send request";
    }
  });
})();
