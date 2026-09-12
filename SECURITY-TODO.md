# SECURITY-TODO

Things that cannot be fixed from this repository. Each one needs a change in a
console you own — GitHub, Railway, or your DNS registrar. Ordered by what buys
the most safety per minute spent.

The code-level work is already done and is not repeated here: the LYRA chat
renders model output as React text nodes and has no `innerHTML` path, the
generated `index.html` carries a CSP and a referrer policy, the fonts
are self-hosted, and the chat has a length clamp, an in-flight lock, an abort
timeout and a 25-turn cap that persists for the life of the browser tab.
None of the chat guards are security controls — `curl` ignores every one of
them, which is what section 1 is for.

---

## 1. Railway — the agent backend (highest priority)

This is where actual money and actual abuse live. Everything the browser does
is advisory; a request from `curl` skips all of it.

- [ ] **Restrict CORS to the real origin — and fix it, it is currently broken.**
      A live preflight from `Origin: https://efrain-galvis.info` returns **400
      with no `Access-Control-Allow-Origin`**, while the old
      `https://efrain-galvis.github.io` origin returns 200. The chat does not
      work at the canonical domain right now. Allow the apex origin, then drop
      the `github.io` one once the custom domain is the only entry point. Not
      `*`. This is the control that makes the `X-Site-Token` in `src/App.tsx`
      mean anything at all.
- [ ] **Rate limit per IP** on `/v1/chat` and `/v1/meetings` — something like
      20 requests/minute and a few hundred per day. The client caps a tab at 25
      turns; the server has to cap everyone else.
- [ ] **Cap tokens per request** (max input and max output) at the provider
      call, so one long prompt cannot buy a large completion.
- [ ] **Enforce a global daily token and spend cap in the service itself.**
      This is the real brake, and it is not the same as the two limits above:
      a per-IP rate limit is defeated by spreading traffic across addresses,
      and a per-request token cap only bounds a single call. Without a server-
      side daily aggregate, many small, individually-legal requests still add
      up to the whole budget. Refuse further provider calls once the day's
      ceiling is hit, and alert rather than fail silently.
- [ ] **Set a hard monthly spend ceiling** in the LLM provider console, plus a
      billing alert well below it. Treat this as the backstop, not the control:
      a monthly ceiling can be exhausted on the third of the month, which is
      why the daily cap above has to exist too.
- [ ] **Confirm the agent has no tools with side effects** — no shell, no file
      writes, no outbound HTTP it controls, no email sending beyond the fixed
      booking notification.
- [ ] **Confirm the agent has no access to private data.** It should see only
      the public marketing copy. Anything in its context can be talked out of
      it by a determined visitor; assume every prompt-injection attempt will be
      tried.
- [ ] **Confirm meeting PII never reaches a model.** The booking form sends a
      real name, a real email address, free-text and a timezone to
      `/v1/meetings`. That free-text box is exactly where someone pastes
      something confidential about their company. Verify as an explicit
      backend invariant that this handler performs only the fixed
      delivery/storage path — that no part of the payload, and no
      notification built from it, is passed to Llama or any other model, for
      summarising, classifying, drafting a reply or anything else. Do not
      leave this implied by the general "no private data" item below: that
      one is about what the agent can read, this one is about what the
      booking path is allowed to forward. Re-check it whenever the booking
      handler changes.
- [ ] **Validate and bound `/v1/meetings` input** server-side (length limits,
      email shape) and escape it wherever the booking lands — an email body, a
      dashboard, a Slack message. That form is an unauthenticated write path
      into whatever it feeds.
- [ ] **Decide how long bookings are retained** and where. PII that is not
      stored cannot leak.
- [ ] **Do not echo request contents in error bodies.** The widget shows its
      own fixed error strings today; keep it that way by not returning
      reflected input.

### About the site token

`src/App.tsx` sends a static `X-Site-Token` header. It is readable by anyone
who opens devtools, so treat it as a public speed bump for scrapers, never as
authentication. It was left in place because removing it would break the chat
until the backend stops requiring it.

- [ ] Decide it is deliberately public and keep it as a cheap filter, **or**
      drop the header from both sides. Do not rotate it expecting secrecy —
      the replacement is equally public the moment it ships.
- [ ] Either way, the real protection is CORS plus the rate limit above.

Note for the record: no provider API key (Anthropic, OpenAI, or otherwise) is
present in this repository or anywhere in its git history. Those keys are
correctly server-side only. Nothing here needs emergency rotation.

---

## 2. GitHub — a push to this repo is a defacement of the live site

The site is served straight from the branch. Anyone who can commit can replace
the page, or the JS, for every visitor.

- [ ] **Settings → Pages → Enforce HTTPS.** Required; without it the custom
      domain is served over plain HTTP and the whole page is tamperable in
      transit.
- [ ] **Account Settings → Pages → Verified domains → verify
      `efrain-galvis.info`.** This is what stops someone else pointing a
      GitHub Pages site at your domain if the DNS record is ever left dangling.
      Do this even though the domain is currently in use.
- [ ] **Branch protection on `main`:** require a pull request, block force
      pushes, block deletion. Enable "include administrators" so a tired
      late-night push cannot bypass it.
- [ ] **Settings → Code security:** turn on secret scanning **and push
      protection**. Push protection is the one that matters — it blocks a
      credential before it becomes public history.
- [ ] **Enable Dependabot** (alerts and security updates). There are no
      dependencies today, which is exactly why it is cheap to turn on now.
- [ ] **Require 2FA on the GitHub account**, ideally with a hardware key or an
      authenticator app rather than SMS.
- [ ] **Audit deploy keys, personal access tokens and installed GitHub Apps.**
      Remove anything with write access you do not recognise.

---

## 3. Headers a `<meta>` tag cannot set

GitHub Pages does not let you set response headers, so these are unavailable
while the site is hosted there. They are listed so the gap is a known one, not
an oversight.

- [ ] **`frame-ancestors 'none'`** — clickjacking protection. It is ignored in
      a meta CSP, which is why it was deliberately left out of `index.html`.
      The page has no authenticated actions, so the practical risk is low
      (mainly framing your booking form on a lookalike site).
- [ ] **`Strict-Transport-Security`** — Pages sends this once "Enforce HTTPS"
      is on, so item 2 covers it.
- [ ] If any of this becomes important, putting the site behind a CDN that can
      inject headers (Cloudflare and similar) is the fix. That is a hosting
      change, not a code change — do not take it on for headers alone.

---

## 4. DNS and email — domain takeover and spoofing

The domain is the identity. Losing it is worse than losing the repo.

- [ ] **Enable registrar lock** on `efrain-galvis.info`.
- [ ] **Enable 2FA on the registrar account**, and make sure its recovery email
      is not an address that depends on this same domain.
- [ ] **Turn on auto-renew.** An expired domain is the most common takeover.
- [ ] **SPF:** publish `v=spf1 -all` on the apex. The domain sends no mail, so
      say so explicitly — otherwise anyone can spoof `@efrain-galvis.info` to
      your prospective clients.
- [ ] **DMARC:** publish `_dmarc.efrain-galvis.info` with
      `v=DMARC1; p=reject; rua=mailto:galvisefrain@gmail.com`.
- [ ] **DKIM:** nothing to publish while the domain sends no mail. Revisit if
      you ever move off the `mailto:` contact form.
- [ ] **CAA (optional):** if you add CAA records, they **must** include
      `letsencrypt.org` — that is the CA GitHub Pages uses. Omitting it breaks
      certificate renewal and takes the site offline.
- [ ] **Remove stale DNS records.** Any `CNAME` or `A` record pointing at a
      service you no longer run is a subdomain takeover waiting to happen.

---

## 5. Worth doing, not urgent

- [ ] Point the `README.md` "Live" link at `https://efrain-galvis.info` — it
      still shows the old `github.io` URL.
- [ ] If chat ever needs formatted replies, use a fixed, sanitised component
      allowlist. Never assemble an HTML string from model output.
- [ ] Re-check this list whenever the Railway agent gains a tool, a data
      source, or a new endpoint.
