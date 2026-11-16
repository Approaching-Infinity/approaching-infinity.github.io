# Ask the Show Private Prototype Implementation Plan

For agentic workers: execute the tasks natively in this session under executing-plans, with one fresh review at the end. Justin explicitly authorized implementation of the reviewed concept on November 16; do not insert another routine planning approval.

**Goal:** A working on-device AI prototype Justin can try, with sourced archive answers, three decision challenges and honest running costs.

**Architecture:** A separate Node HTTP server binds only to 127.0.0.1 and serves a private UI outside Astro's public routes. A searchable corpus combines 38 publisher-note records and explicitly labeled transcript candidates; fixed local Ollama calls synthesize answers into citation-validated structured data. No credentials, cloud calls or public deployment.

**Tech Stack:** Node built-ins and browser JavaScript/CSS; existing Ollama local model qwen3-vl:30b-a3b-instruct, with gemma3:4b available for comparison. No dependency/model downloads.

**Spec:** `/Users/jrjus/Documents/ChatGPT/Approaching Infinity/reports/ask-the-show-2026-11-16/first-version-design.md`, accepted by the November 16 private-prototype build request.

## Global Constraints

- Work in the existing linked worktree. Live website routes and deployment configuration remain unchanged.
- Questions and public research passages stay on this Mac. Ollama cloud disabled; fixed loopback inference URL; no user-selectable model URL.
- No new paid usage, API key, subscription, raw question logs or newsletter collection. Report local hardware/electricity as unmeasured, not free.
- Broad topic discovery from all 38 notes. ASR text and timestamps remain marked unverified; external transcript candidate excluded. Preserve feature credits. Do not pretend quotes are independently verified facts.
- No invented citations, guest impersonation, probability scores, personal investment recommendations or fund solicitations.

## Review Focus

- Unsupported questions and weak lexical matches should yield an evidence gap, not a confident generic answer.
- Conversation follow-ups need context while past answers remain untrusted; do not lose the question on a timeout.
- Local HTTP binding, Host/Origin validation, allowlisted files and request limits must keep sources/configuration private.
- Invalid model citations, truncated JSON, process interruption or model unavailability need explicit recoverable states.
- Cloud projections must be labeled estimates using a different tokenizer, with hosting and reasoning overhead excluded; actual API spend remains zero.

## Task 1: Searchable source evidence and answer contract

Files: `prototype/ask-the-show/corpus.mjs`, `core.mjs`, `challenges.mjs`; `tests/ask-the-show.test.mjs`.

Interfaces: `loadCorpus({episodeDir,evidencePath}) -> {episodes,chunks,coverage}`; `retrieve(corpus,question,history) -> Chunk[]`; `validateAnswer(draft,chunks) -> Answer`; `projectCost(inputTokens,outputTokens) -> number`. Each chunk has stable ID, episode identity/public URL, exact text, source type and optional explicitly unverified transcript clock. `challenges` holds three fictional scenarios, choices, explanatory feedback and allowed evidence IDs.

- [ ] Write and run failing tests for retrieval across finance/AI/veterans, exact evidence provenance, notes-vs-transcript labels, unknown citation rejection and projected cost arithmetic.
- [ ] Implement bounded paragraph search and exact source resolution; exclude boilerplate and private materials. Only our six candidate passages supplement the 38 notes initially, avoiding unreviewed wholesale transcript ingestion.
- [ ] Run tests and commit the independently testable core.

## Task 2: Real local model service and cost accounting

Files: `prototype/ask-the-show/server.mjs`, `model.mjs`; extend tests; `.gitignore` and `package.json`.

Interfaces: `createPrototypeServer({corpus,generate,model,ledger}) -> http.Server`; GET `/api/status`, `/api/challenges`; POST `/api/ask` accepts question <=1000 chars, up to three bounded prior exchanges and optional allowed challenge ID. Model generation returns structured cited points, separately labeled application and follow-up. Usage records tokens, durations and counts, never raw prompts.

- [ ] Write failing HTTP tests for wrong origins/hosts, oversized bodies, unknown routes, invalid citations and in-flight concurrency; local temp ledger only.
- [ ] Implement fixed loopback Ollama inference with 90-second timeout, schema response, short context/output limits, no silent generated-answer fallback, sequential requests and per-process cap. Metrics include failed/invalid responses if model tokens were consumed. No paid adapter is activated.
- [ ] Run core/HTTP suite, real local question trials, record measured token/latency/citation results and commit.

## Task 3: Branded interactive experience and acceptance

Files: `prototype/ask-the-show/index.html`, `app.js`, `style.css`, `README.md`; local evaluation/report files outside the public build.

- [ ] Build a black/red/near-white experience using the existing brand's condensed headings, a prominent input and a readable near-white answer area. Cite by numbered episode chips; allow expanding original passages and copying an answer. Stack at390px, keyboard focus and live status; no decorative motion.
- [ ] Add three interactive fictional challenges with immediate editorial feedback, episode sources and an optional real AI follow-up. Include a clear-cost panel with actual local tokens/latency and hypothetical cloud projections, plus private-source coverage disclosure.
- [ ] Run full npm test and production build; verify no prototype routes or transcript data in production output. Use CUA to test a real answer, citation source, all challenges, follow-up, error handling and390px layout. Save screenshots.
- [ ] Fresh independent whole-change review; fix material issues and run relevant checks. Commit locally and leave the prototype open with a concise cost report. Do not push, merge or deploy.

## Execution record

Baseline: 26 tests pass. Existing linked worktree, detached at published main81b75c8. Existing Ollama local weights verified; loopback service started with cloud disabled. User authorization covers private build/testing; paid activation and public release remain separate. Native execution avoids per-task agent overhead. Keep evidence for the owner; no cleanup that deletes research.
