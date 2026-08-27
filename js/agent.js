(function () {
  const AGENT_URL = "https://site-agent-production.up.railway.app";
  // Public speed-bump filter for curl, not a secret.
  const SITE_TOKEN = "4f4ec8bc502fe37e4de9805169f4cb89";
  const CHAT_MAX = 2000;
  const WELCOME =
    "Ask about Efrain's AI consulting — product work, LLM systems, or a short review. What are you trying to ship?";

  if (!AGENT_URL) return;

  const rootUrl = AGENT_URL.replace(/\/$/, "");

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        const value = attrs[key];
        if (value == null || value === false) return;
        if (key === "className") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "html") node.innerHTML = value;
        else node.setAttribute(key, value === true ? "" : String(value));
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  const chatIcon =
    '<svg class="agent-icon agent-icon-chat" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5.2 18.6 3 21.2V6.4A2.4 2.4 0 0 1 5.4 4h13.2A2.4 2.4 0 0 1 21 6.4v9.2a2.4 2.4 0 0 1-2.4 2.4H8.1l-2.9 2.6Zm.6-2.2.9-.8h12.3V6.4H5.4v10z"/></svg>';
  const closeIcon =
    '<svg class="agent-icon agent-icon-close" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.4 5.3 12 10.9l5.6-5.6 1.1 1.1L13.1 12l5.6 5.6-1.1 1.1L12 13.1l-5.6 5.6-1.1-1.1L10.9 12 5.3 6.4l1.1-1.1Z"/></svg>';

  const launcher = el("button", {
    className: "agent-launcher",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": "agent-panel",
    "aria-label": "Ask about working together",
    html: chatIcon + closeIcon,
  });

  const panelTitle = el("h2", { className: "agent-title", id: "agent-title", text: "Working together" });
  const panelKicker = el("p", { className: "agent-kicker", text: "AI consulting" });
  const panelClose = el("button", {
    className: "agent-panel-close",
    type: "button",
    "aria-label": "Close chat",
    html: closeIcon,
  });

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

  function addMessage(kind, text) {
    log.appendChild(el("p", { className: "agent-msg agent-msg-" + kind, text: text }));
    log.scrollTop = log.scrollHeight;
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

  async function postJson(path, body) {
    const res = await fetch(rootUrl + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Token": SITE_TOKEN,
      },
      body: JSON.stringify(body),
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
    const clipped = message.slice(0, CHAT_MAX);
    chatInput.value = "";
    addMessage("user", clipped);
    chatBusy = true;
    chatSend.disabled = true;
    chatInput.disabled = true;
    chatSend.textContent = "Sending…";
    try {
      const result = await postJson("/v1/chat", { message: clipped });
      if (!result.res.ok) {
        addMessage("error", humanError(result.res));
      } else {
        const reply = result.data && typeof result.data.reply === "string" ? result.data.reply.trim() : "";
        addMessage("assistant", reply || "No reply came back. Try again, or use the contact form.");
      }
    } catch (err) {
      addMessage("error", humanError(null));
    } finally {
      chatBusy = false;
      chatSend.disabled = false;
      chatInput.disabled = false;
      chatSend.textContent = "Send";
      chatInput.focus();
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
      const result = await postJson("/v1/meetings", payload);
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
      bookStatus.textContent = "Could not reach the server. Use the contact form on this page instead.";
      bookStatus.classList.add("is-err");
    } finally {
      bookBusy = false;
      bookSubmit.disabled = false;
      bookSubmit.textContent = "Send request";
    }
  });
})();
