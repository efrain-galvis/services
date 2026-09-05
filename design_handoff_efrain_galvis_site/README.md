# Handoff: efrain-galvis.info — agent-first personal site

## Overview

A single-page personal site for Efrain Galvis, an applied-AI consultant. The page replaces
the usual "contact form" with a **live agent** that answers questions about his work,
shows every lookup it makes, and ends by drafting an email brief to him.

The premise is that the site should *demonstrate* the work rather than describe it. Two
consequences drive the whole design, and they are not optional decorations:

1. **The agent's reasoning and tool calls are printed on screen.** This is the proof. If
   you hide the trace to "clean up the UI", the page loses its reason to exist.
2. **The agent may only answer from a fixed knowledge object.** It never invents projects,
   clients, metrics, rates, or credentials. When the knowledge does not cover something it
   says so and offers to put the question in the brief.

Primary conversion action: **an email brief sent to galvisefrain@gmail.com**, pre-composed
by the agent via a `mailto:` link.

---

## About the design files

The files in this bundle are **design references created in HTML** — a working prototype of
the intended look and behaviour, not production code to copy line by line.

The task is to **recreate this design in the target codebase's existing environment**
(Next.js / React / Vue / Astro / whatever the site will actually ship on), using that
codebase's established patterns, component library, and conventions. If no codebase exists
yet, pick the framework that suits a one-page site with a single server route — Next.js on
Vercel or Astro with an edge function are both reasonable — and implement it there.

Two specific translation notes:

- `Efrain Galvis.dc.html` is authored in a prototyping component format. Its markup uses
  inline styles and a small template dialect (`<sc-for>`, `<sc-if>`, `{{ value }}`). Read it
  for structure, copy, and exact values — do not try to port the dialect. Rebuild it as
  ordinary components.
- The prototype calls a host-provided `window.claude.complete(...)`. **That does not exist in
  production.** See "The agent backend" below — this is the one part that needs real
  engineering work, not just markup.

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii, and interaction states are final and
listed exactly below. Recreate them faithfully. The copy is also final — it has been through
several review rounds with Efrain and should be treated as approved content, not placeholder.

---

## Screens / views

One page, one route. Two states inside the agent panel.

### Page layout

- Root: full-height dark surface, `#1C1714`, with a dotted-grid backdrop:
  `radial-gradient(#2E2620 1px, transparent 1px)`, `background-size: 22px 22px`,
  `background-position: -1px -1px`.
- Sticky header, then `<main>` capped at `max-width: 1320px`, centred, padding
  `clamp(36px, 6vw, 76px) clamp(20px, 5vw, 64px) 0`.
- Hero row: CSS grid, `repeat(auto-fit, minmax(360px, 1fr))`, `gap: clamp(32px, 5vw, 64px)`,
  `align-items: start`. Left column = identity + services list. Right column = agent panel.
  Below ~760px this collapses to one column and the agent stacks under the intro.

**Sticky behaviour — read this, it was the hardest part to get right.** The right column is
`align-self: stretch` (NOT `position: sticky`) so the grid item spans the full row height.
Inside it sits a wrapper with `position: sticky; top: 92px; max-height: calc(100vh - 108px);
display: flex; flex-direction: column;`. The card inside that wrapper is
`display: flex; flex-direction: column; min-height: 0`. Putting `sticky` directly on a grid
item whose parent is `align-items: start` is a no-op — the item is only as tall as its
content, so there is no travel distance. The agent then scrolls away exactly while the
visitor reads the services list.

### Header

Sticky, `top: 0`, `z-index: 20`, background `rgba(28, 23, 20, 0.86)` with
`backdrop-filter: blur(10px)`, bottom border `1px solid #2B2320`, padding
`20px clamp(20px, 5vw, 64px)`. Flex, `space-between`.

- Left: wordmark "E. Galvis" — JetBrains Mono 13px, `letter-spacing: 0.14em`, uppercase,
  `#F3EDE7`, links to `#top`.
- Right: availability pill + GitHub + X links, JetBrains Mono 12px, `letter-spacing: 0.06em`,
  `gap: 20px`. Links `#A79A90`, hover `#F3EDE7`.
- Availability dot: 7px circle, `#7CE0A3`, `animation: pulse 2.4s ease-in-out infinite`.
  Label text comes from the `availability` prop (default "Taking on work").

### Hero, left column

| Element | Spec |
| --- | --- |
| Eyebrow | "Applied AI" — JetBrains Mono 12px, `letter-spacing: 0.18em`, uppercase, `#E8613C`, margin-bottom 22px |
| H1 | "Efrain Galvis" — Libre Franklin 600, `clamp(42px, 6vw, 76px)`, `line-height: 0.98`, `letter-spacing: -0.03em` |
| Lede | `clamp(18px, 2.1vw, 23px)`, `line-height: 1.45`, `#D6CBC2`, `max-width: 32ch` |
| Sub-lede | 15px, `line-height: 1.6`, `#8E8177`, `max-width: 40ch` |

Copy, verbatim:

> **Lede:** I help companies become AI-driven: where AI belongs in the product, and the systems and practices that keep it working.
>
> **Sub-lede:** So instead of a contact form, there is an agent. It knows my work, it shows what it looks up, and it will write your brief for you.

Buttons, flex with `gap: 10px`, margin-bottom 44px:

- Primary "Ask the agent →" — `padding: 13px 22px`, `border-radius: 999px`, background
  `#E8613C`, text `#1C1714`, 14px/600. Hover: background `#F58A6A`,
  `transform: translateY(-1px)`, `transition: transform .16s ease, background .16s ease`.
  Click focuses the agent's textarea; if the agent has not been started yet it scrolls to top.
- Secondary "Message on X" — same padding/radius, transparent, `1px solid #3B322C`,
  text `#D6CBC2`. Hover: border `#8E8177`, text `#F3EDE7`.

### Services list — "What I take on"

Section label: JetBrains Mono 12px, `letter-spacing: 0.16em`, uppercase, `#E8613C`,
`padding-bottom: 14px`, `border-bottom: 1px solid #2B2320`.

An `<ol>`, `list-style: none`, `display: grid; gap: 2px`. Each `<li>` is
`grid-template-columns: 34px 1fr; gap: 14px; padding: 16px 0`, divider
`1px solid #241E1A` (omit on the last item). Index number: JetBrains Mono 12px `#E8613C`,
`padding-top: 3px`. Title: 16px/600. Body: 14px, `line-height: 1.55`, `#8E8177`,
`text-wrap: pretty`.

Five items, copy verbatim:

**01 — Becoming an AI-driven company**
Further than automating a few processes with workflows. How the company works, decides, and builds when AI is part of the default way of operating — and which parts should stay human.

**02 — Agents your users can talk to**
Putting your agents in front of the people who use your product, inside the app — not locked in an internal tool. Tool design, retrieval, memory, and the evaluation that makes them reliable enough to ship.

**03 — AI-DLC — AI-driven development life cycle**
With the right tools, one person can cover what used to take a whole engineering team. I set up that way of working with you: where AI sits in each stage, and where a human still has to decide.

**04 — Good practice in how you use AI**
Evaluation, guardrails, cost, and knowing how a system should fail. Also applied machine learning when a learned model is the right tool, rather than a language model by reflex.

**05 — Reviews and pairing**
Short engagements to unstick a problem: review an approach, sit with your team, or help you choose what not to build.

### The agent panel

Card: `border: 1px solid #3B322C`, `border-radius: 16px`, background `#17120F`,
`overflow: hidden`, `box-shadow: 0 30px 70px -40px rgba(0,0,0,0.9)`.

Title bar: `padding: 13px 16px`, background `#14100D`, bottom border `1px solid #2B2320`,
flex `space-between`. Left: 7px `#E8613C` dot + "agent" in JetBrains Mono 11px,
`letter-spacing: 0.1em`, uppercase, `#8E8177`. Right: status line, JetBrains Mono 11px
`#8A7E75` — reads "waiting" before start, "grounded in his own material" after.

Under the card, JetBrains Mono 11px `#8A7E75`, `line-height: 1.7`:

> Every lookup the agent makes is printed above. Nothing hidden, nothing invented — same way I work.

#### State A — intake (initial)

This is the visitor-identification step Efrain asked for. Body is `class="om-scroll"`,
`padding: 22px 22px 20px`, `overflow-y: auto`, `min-height: 0` — it must scroll internally,
because the card is height-capped by the sticky wrapper and on a short viewport the last role
row and both inputs would otherwise sit below the fold while the panel is pinned.

- Label "Before we start" — mono 12px, `letter-spacing: 0.14em`, uppercase, `#E8613C`.
- Question "Who am I talking to?" — 19px/500, `line-height: 1.4`.
- Hint — 14px, `#8E8177`: "One tap. It changes what the agent leads with — and it tells me who stopped by."
- Four role buttons, `display: grid; gap: 7px`. Each: `padding: 12px 15px`,
  `border-radius: 11px`, `border: 1px solid #302823`, background `#1C1714`, flex with
  `gap: 12px`, left-aligned. Hover: border `#E8613C`, background `#221B17`,
  `transition: border-color .15s ease, background .15s ease`. Contents: mono 11px `#E8613C`
  index (18px wide) · title 14px/600 `#F3EDE7` · hint 12.5px `#8E8177` · trailing "→" `#857A71`.
- Name + email inputs: `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px`.
  Each `min-width: 0; width: 100%; padding: 12px 13px; border-radius: 9px;
  border: 1px solid #302823; background: #14100D; font-size: 13.5px`. Both optional.
  **`minmax(0, 1fr)` and `min-width: 0` are load-bearing** — plain `1fr` overflows the card.
- Privacy note, mono 11px `#8A7E75`: "Stays in your browser. It only leaves if you send the brief."

Roles, with the opener each one produces and its three starter chips:

**01 Founder or CTO** — "I have a product problem"
Opener: *Good — that is the shortest path. Tell me what you are shipping and where it is stuck, and I will turn it into a scoped slice of work and draft the email to Efrain.*
Chips: "What does becoming AI-driven mean?" · "Can he ship an agent our users talk to?" · "What is AI-DLC?"

**02 Product manager** — "Figuring out where AI fits"
Opener: *Then the useful question is usually where AI belongs in your product at all. Describe the workflow you are looking at and I will tell you how Efrain would frame it.*
Chips: "Where does AI actually belong?" · "How do you evaluate an AI feature?" · "What does a first slice look like?"

**03 Engineering lead** — "Evaluating him as a contractor"
Opener: *Fair. Ask me anything about how he works — scope, reliability, evals, handover. I answer from his own material and I will show you every lookup.*
Chips: "How does he handle reliability and evals?" · "What happens at handover?" · "What is his stack?"

**04 Recruiter or hiring** — "Looking at him for a role"
Opener: *He is open to full-time roles as well as consulting. Tell me about the role — scope, team, and stack — and I will draft the intro email for you.*
Chips: "Is he open to full-time?" · "What is his background?" · "How does he work with remote teams?"

Picking a role writes `{name, email, role, at}` to `localStorage` under key `eg.visitor`,
seeds the conversation with that role's opener, and focuses the textarea after ~60ms.
On mount, any previously saved name/email is restored.

#### State B — conversation

Container `display: flex; flex-direction: column; min-height: 0`.

**Log** — `class="om-scroll"`, `flex: 1; min-height: 180px; max-height: min(52vh, 480px);
overflow-y: auto`, `padding: 20px 22px`, `display: flex; flex-direction: column; gap: 20px`.
Auto-scrolls to bottom on every update (`el.scrollTop = el.scrollHeight` in
`componentDidUpdate` — do **not** use `scrollIntoView`). Every entry animates in with
`animation: rise .28s ease both`.

Four entry types:

1. **User message** — right-aligned, `max-width: 88%`, `padding: 11px 15px`,
   `border-radius: 13px 13px 4px 13px`, background `#E8613C`, text `#1C1714`, 14.5px/500.
2. **Trace** (the proof) — `border-left: 2px solid #302823`, `padding-left: 13px`,
   `display: grid; gap: 10px`, `margin-bottom: 12px`. Per tool call, JetBrains Mono 11.5px,
   `line-height: 1.6`, three lines:
   - thought — italic, `#857A71`
   - call — `#A79A90`, prefixed by "→ " in `#E8613C`
   - result — `#8E8177`
   Successive calls in one turn append into the same trace block.
   **Contrast note:** these greys were raised deliberately. Anything darker than `#8E8177`
   on `#17120F` falls under 3:1 and the evidence becomes unreadable — do not re-dim them.
3. **Agent message** — 14.5px, `line-height: 1.62`, `#E4DBD3`, `white-space: pre-wrap`,
   `text-wrap: pretty`. Optional suggestion chips below, flex `gap: 7px`, `margin-top: 14px`:
   `padding: 8px 13px`, `border-radius: 999px`, `1px solid #302823`, transparent, mono 11.5px
   `#A79A90`; hover border `#E8613C`, text `#F3EDE7`. Clicking a chip sends it as a message.
4. **Brief card** — `1px solid #3B322C`, `border-radius: 13px`, background `#1C1714`,
   `margin-top: 16px`. Header `padding: 13px 16px`, `border-bottom: 1px dashed #302823`:
   "Brief drafted" in mono 11px uppercase `#7CE0A3` + a date (`dd MMM`) in mono 11px `#8A7E75`.
   Body `padding: 16px`: subject line mono 12px `#8E8177`; body 13.5px `#D6CBC2`
   `white-space: pre-wrap`; then a pill CTA "Open in email →" — background `#E8613C`,
   text `#1C1714`, 13.5px/600, `padding: 11px 18px`, `href` = the `mailto:` URL.

**Thinking indicator** — mono 11.5px `#857A71`, label text + `▍` with
`animation: blink 1s steps(1) infinite`.

**Composer** — `border-top: 1px solid #2B2320`, `padding: 12px 14px`, background `#14100D`,
flex `align-items: flex-end; gap: 10px`.
- Textarea: `rows="2"`, `flex: 1; min-width: 0; resize: none; min-height: 66px;
  max-height: 120px; overflow-y: auto`, `padding: 11px 12px`, `border-radius: 9px`,
  `1px solid #302823`, background `#1C1714`, 14px, `line-height: 1.5`.
  Placeholder: "Ask about the work, or describe your problem…" — **it wraps to two lines, so
  `rows="1"` clips it.** Auto-grows on input:
  `el.style.height = 'auto'; el.style.height = Math.min(Math.max(el.scrollHeight, 66), 120) + 'px'`,
  reset to `66px` after send. Enter sends, Shift+Enter newlines.
- Send button: 40×40, `border-radius: 9px`, background `#E8613C`, glyph "↑" `#1C1714` 15px/700.
  Hover `#F58A6A`.

**Offline / error strip** — appears below the card body when the model is unreachable:
`padding: 11px 16px`, `border-top: 1px solid #2B2320`, background `#221A16`, mono 11px
`#C9A08C`. The agent also posts a fallback message pointing at the email address. The page
must stay usable with the agent dead — that is a hard requirement, not a nicety.

### "How it goes" section

`margin-top: clamp(72px, 10vw, 128px)`. Label `#E8613C` mono, H2
`clamp(28px, 3.6vw, 44px)`/600 `letter-spacing: -0.02em`, `max-width: 22ch`, intro 16px
`#8E8177` `max-width: 52ch`.

Four cards as a hairline grid: `repeat(auto-fit, minmax(210px, 1fr))`, `gap: 1px`, container
background `#2B2320` with top and bottom `1px solid #2B2320`, each cell background `#1C1714`,
`padding: 24px 22px 28px`. The 1px gap over a lighter parent *is* the divider — no borders on
the cells. Step label mono 11px `#857A71`, title 16.5px/600, body 13.5px `#8E8177`.

Copy: **Step 01 Tell me the problem** / **Step 02 We agree on a useful slice** /
**Step 03 I work in the open with you** / **Step 04 You keep the work** — bodies verbatim in
the HTML.

### About + Contact

Grid `repeat(auto-fit, minmax(300px, 1fr))`, `gap: clamp(32px, 5vw, 72px)`,
`align-items: start`.

Left: label "About", H2 "I build AI systems that have to hold up in production."
(`max-width: 20ch`), then two paragraphs at 16px `line-height: 1.65`, `max-width: 46ch` —
first `#D6CBC2`, second `#8E8177`.

> I am Efrain Galvis. I work remotely with teams wherever they are, on consulting and freelance engagements — helping a company put AI into a product, or make sense of AI it has already started.
>
> I like the craft more than the pitch: models, language systems, the messy middle between a paper and production. If that sounds like the kind of person you want on a problem, say hello.

Right, `id="contact"`: `1px solid #2B2320`, `border-radius: 16px`, `padding: 28px 26px`.
Label "Contact", H3 23px/600 "Write when you have a real problem.", body 14.5px `#8E8177`,
then four pills (`gap: 9px`): "Use the agent" (filled `#E8613C`, focuses the composer),
"Email" (`mailto:galvisefrain@gmail.com`), "X", "GitHub" — outlined `1px solid #3B322C`,
text `#D6CBC2`, hover border `#8E8177`.

When the `openToRoles` prop is true, a footnote appears: `padding-top: 18px`,
`border-top: 1px solid #241E1A`, mono 11.5px `#8A7E75` — "Open to full-time roles as well as
consulting. Ask the agent about it."

### Footer

`margin-top: clamp(64px, 8vw, 104px)`, `padding: 26px 0 34px`, `border-top: 1px solid #2B2320`,
flex `space-between`, mono 11.5px `#8A7E75`. Left "© 2026 Efrain Galvis · Working remotely,
any timezone", right "Back to top ↑" linking `#top`.

---

## The agent backend — the real work

The prototype calls `window.claude.complete({model, max_tokens, system, tools, messages})`,
a helper that only exists in the prototyping host. In production you need your own route.

**Never put an API key in the browser.** Required shape:

1. `POST /api/agent` on the server, holding `ANTHROPIC_API_KEY` as an environment variable.
2. The route calls the Anthropic Messages API and runs the **tool-use loop server-side**:
   send messages + tool definitions → if the response has `stop_reason: "tool_use"`, execute
   the tool, append the `tool_result`, call again → repeat until a text answer comes back.
3. Stream each tool call back to the client as it happens (SSE or a streamed response) so the
   trace appears live. If you buffer until the end, the trace lands all at once and the
   "watch it think" effect — the entire point — is lost.
4. Rate-limit per IP and cap turns per session. This endpoint is public and costs money per
   call. Also cap `max_tokens` (the prototype uses 900) and total messages per conversation.

### Tools

Three, all of which take a `thought` string (max 12 words, first person) that gets printed in
the trace. Requiring the thought as a parameter is what makes the reasoning display reliable —
do not replace it with extended-thinking output.

**`lookup(thought, section, query)`** — `section` is an enum:
`identity | services | process | engagement | contact | cv`. Returns that section's text, or a
`NOT_FOUND:` string when the section is empty. Trace result reads `"<n> chars returned"` or
`"empty — not covered in his material"`. In the prototype this is a plain object lookup; a
small embedding or BM25 search over the same corpus is a reasonable upgrade, but the corpus
must stay a curated file, not the open web.

**`check_availability(thought)`** — returns the current status string plus whether he is open
to full-time roles. Reads from the `availability` / `openToRoles` config.

**`draft_brief(thought, subject, context, slice, open_questions)`** — assembles the email and
renders the brief card. Body template:

```
From: <name> (<email>)          ← omitted if not given
Role: <role title>              ← omitted if no role picked

Context: <context>

Proposed slice: <slice>

Open questions: <open_questions>   ← omitted if empty

— drafted by the agent on efrain-galvis.info
```

Delivery is `mailto:` with `encodeURIComponent` on subject and body — no server-side mail, so
Efrain sees it in his own inbox from the visitor's own address, and the visitor can edit before
sending. If you later switch to server-side send, keep the visible draft: the visitor seeing
exactly what gets sent is part of the design.

### System prompt

Ported verbatim from the prototype (`SYSTEM` in the logic class). Its hard rules:

- Answer only from what the lookup tool returns. Never invent projects, clients, metrics,
  rates, dates, or credentials.
- If the knowledge does not cover it, say so in one line and offer to add the question to the brief.
- Always call a tool before answering, and always pass a short `thought`.
- 2–4 short sentences. No bullet lists unless asked. No emoji. No exclamation marks.
- Call `draft_brief` once a real problem or role is described; at most two clarifying questions first.
- Never claim to be Efrain. It speaks for him in the third person.

### Knowledge

`KNOWLEDGE` in the prototype's logic class is the single source of truth: keys `identity`,
`services`, `process`, `engagement`, `contact`, and an empty `cv`. **`cv` is intentionally
empty** — Efrain is filling it from his real CV. Until then the agent correctly refuses
CV questions. Lift this into a versioned content file (JSON, MDX, or CMS) so it can be edited
without a deploy.

Two files at the project root, `cv.js` and `facts.js`, are **earlier superseded scaffolds**.
They still contain pre-review copy (a Colombia location, the old four-service list, the word
"prompts", "people actually use") that Efrain explicitly rejected. Do not merge them into the
knowledge base — use their *structure* if useful, but the copy in this README wins.

---

## State management

| State | Purpose |
| --- | --- |
| `role` | Selected visitor role; `null` means show intake. Drives opener, chips, and system prompt. |
| `name`, `email` | Optional visitor identity. Persisted to `localStorage` (`eg.visitor`), restored on mount. |
| `draft` | Composer contents. |
| `messages` | Ordered log of `{role: "user" \| "agent" \| "trace" \| "brief"}` entries. Traces accumulate calls into the last trace entry. |
| `thinking`, `thinkingLabel` | Pending-request indicator. |
| `offline`, `offlineNote` | Set when `window.claude` is missing or the call throws; shows the amber strip and a fallback message. |

Transitions: role pick → seed opener, focus composer · send → append user message, set
thinking, stream trace entries, append agent message · tool `draft_brief` → append brief
entry · any failure → set offline, append fallback.

Props exposed as tweaks: `availability` (enum: "Taking on work" / "Limited availability" /
"Booked — waitlist") and `openToRoles` (boolean). Both feed the header pill, the contact
footnote, and `check_availability`.

---

## Design tokens

**Colours**

| Token | Hex | Use |
| --- | --- | --- |
| bg | `#1C1714` | page, cells |
| bg dots | `#2E2620` | dotted grid |
| surface | `#17120F` | agent card |
| surface deep | `#14100D` | title bar, composer, inputs |
| surface raised | `#221B17` | role hover |
| border | `#3B322C` | card, outline pills |
| border mid | `#302823` | inputs, chips, trace rule |
| border dim | `#2B2320` | section rules |
| border faint | `#241E1A` | list dividers |
| ember | `#E8613C` | accent, primary CTA, trace arrow |
| ember hover | `#F58A6A` | primary hover |
| mint | `#7CE0A3` | availability dot, "Brief drafted" |
| amber text | `#C9A08C` | offline strip |
| text | `#F3EDE7` | headings |
| text soft | `#E4DBD3` | agent replies |
| text body | `#D6CBC2` | lede, body |
| text muted | `#A79A90` | nav, trace call |
| text dim | `#8E8177` | secondary body, trace result |
| text dimmer | `#8A7E75` | notes, footer, status |
| text dimmest | `#857A71` | trace thought, step labels |
| selection | `#E8613C` on `#1C1714` | ::selection |

Nothing below `#857A71` on these backgrounds. Contrast was a review finding.

**Type** — Libre Franklin 400/500/600/700 (UI, headings), JetBrains Mono 400/500 (labels,
trace, metadata) via Google Fonts with `preconnect`.

Scale: 76/44/23/19/16.5/16/14.5/14/13.5/12/11.5/11 px. Headings `letter-spacing: -0.02em`
to `-0.03em`; mono labels `+0.06em` to `+0.18em`, uppercase.

**Radii** — 999px pills · 16px cards · 13px brief + user bubble · 11px role rows · 9px inputs
and send button.

**Shadow** — one only: `0 30px 70px -40px rgba(0,0,0,0.9)` on the agent card.

**Motion** — `blink 1s steps(1) infinite` (caret) · `pulse 2.4s ease-in-out infinite`
(availability dot) · `rise .28s ease both` (log entries) · `.15s`–`.16s ease` on hover
transitions. Respect `prefers-reduced-motion` in production: the prototype does not, and it should.

---

## Accessibility to add in production

The prototype covers focus rings (`2px solid #E8613C`, `outline-offset: 2px`) and keyboard
send. Still needed:

- `aria-live="polite"` on the log so screen readers announce agent replies.
- `aria-busy` on the log while thinking.
- Labels on the name/email inputs (currently placeholder-only).
- A `prefers-reduced-motion` block disabling `pulse`, `rise`, and `blink`.
- Verify the trace greys once more in the final build; they sit just above threshold.

## Assets

None. No images, no icon library — glyphs are text characters (`→ ↑ ↓ ▍ ©`) and the dot
indicators are styled `<span>`s. Fonts load from Google Fonts; self-host both families in
production to remove the third-party request and the flash.

## Files in this bundle

- `Efrain Galvis.dc.html` — the full prototype. Structure, copy, and every value above.
- `support.js` — prototyping-host runtime. **Not part of the design.** Do not port it.

`cv.js` and `facts.js` remain in the source project but are superseded — see "Knowledge".

## Suggested build order

1. Static page: header, hero, services list, process, about, contact, footer. No agent.
2. Agent panel shell with the intake state and `localStorage`, no model calls.
3. `/api/agent` route with the three tools and the server-side tool loop.
4. Wire the conversation, streaming traces as they arrive.
5. `draft_brief` → brief card → `mailto:`.
6. Rate limiting, error and offline states, accessibility, reduced motion.
7. Replace the empty `cv` section once Efrain provides it.
