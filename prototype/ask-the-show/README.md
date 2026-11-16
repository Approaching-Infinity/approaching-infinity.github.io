# Ask the Show · private on-device prototype

Owner-authorized private prototype, November16,2026. Nothing here is a public Astro route. The owner subsequently authorized public deployment using **existing Relay only**. Public deployment is pending the dedicated Relay app registration and public backend; the local prototype remains the working experience.

## Run locally

Requires Node22.23.4+ and the existing Ollama installation/weights. No npm dependencies or model downloads are required by the prototype itself.

```sh
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 ollama serve
```

In a second terminal from the repository:

```sh
npm run ask:show
```

Open http://127.0.0.1:4360/. Stop either process with Ctrl-C in its own terminal. The Mac must remain awake with both services running. This is not an internet-accessible preview and the Mac is not proposed as a public production server.

The default model is the already-installed `qwen3-vl:30b-a3b-instruct`. Initial answer-format failures led to short enumerated source keys and constrained response states; Qwen then handled source selection and unsupported questions more reliably in comparison. `ASK_SHOW_MODEL=gemma3:4b` selects the smaller existing model, whose trial produced some speaker-attribution and formatting errors. The local launch never downloads a model or loads a cloud credential. Ollama is started separately with cloud disabled.

## Existing Relay integration: locally tested, not activated

`relay.mjs` is a server-only client for the existing private Relay service, using a dedicated app credential supplied by the server. It does not use or create a provider key. Both episode selection and cited answers use Relay's native chat protocol under one operation, with stable per-round request IDs durably recorded before sending. Refusals, pending responses, uncertain usage and interrupted requests stop without automatic retries, direct-provider calls or local-model fallback.

`relay-policy.example.toml` is a proposed additive app policy, not a deployed configuration. Its $0.015 request / $0.03 operation ceilings are conservative reservations inside the existing shared $5 monthly pool, not an extra allowance. The request reserve accommodates Relay's native framing bound; it is not the expected price of an answer. Current dated prices expire in Relay itself, and expired prices must continue to stop dispatch.

The client's fabricated transport tests and actual Relay pure-parser checks do not prove live provider quality, app enrollment, credited API funding, a public visitor quota or public availability. The private HTTP server still selects local Ollama. The public backend must supply a protected app token, persistent operation identity/journal and visitor/global controls; no browser may receive a service/operator/provider credential. See `docs/superpowers/plans/2026-11-16-ask-the-show-relay.md` and the dated private `relay-owner-handoff.md` for the remaining activation boundary.

The optional `ASK_SHOW_EVIDENCE_PATH` points to the private `candidate-evidence.json` researched for this project. Default path: `~/Documents/ChatGPT/Approaching Infinity/reports/ask-the-show-2026-11-16/candidate-evidence.json`. Missing evidence fails startup rather than silently claiming transcript coverage. The38 publisher-note files are read from `src/content/episodes`. The private source bundle stays outside this repository.

## What is functional

- Real local AI episode selection, followed by a separate source-grounded answer call. A valid source ID resolves to an exact corpus passage; invalid or empty citations fail closed. Model citation validation is not proof of factual truth or entailment.
- Topic coverage across38 episode/appearance summaries, plus six candidate transcript passages. Published summaries, unverified transcript/clip clocks and external-show credits remain distinct. No private introductory calls or internal notes are ingested.
- Three original fictional decision challenges with immediate editorial explanations, sources and a real AI follow-up path.
- Bounded follow-up context kept in browser memory, clear/copy actions, responsive layout and visible loading/stop/failure states.
- Aggregate local token/time counts in ignored `prototype/.local/usage.json`. Questions and answers are not stored by the application. Operational model/server logs may still contain metadata; this is not a claim of absolute confidentiality.

## Cost and limits

Actual external API charges: **$0**. Existing hardware, electricity and operator time are unmeasured. Questions/source passages are processed on this Mac, with no paid provider connected.

The cost panel projects the recorded local token counts at a hypothetical GPT-5.6 Luna standard short-context reference rate of $0.20/million input and $1.20/million output, checkedNovember16,2026. This is a sizing illustration, not an OpenAI request, validated cloud-model benchmark, or an invoice. Tokenizers, context/cache behavior, reasoning, retries and hosting change real costs. Official source: https://developers.openai.com/api/docs/models/gpt-5.6-luna .

Requests are serial, input is limited to1,000characters and three prior exchanges, and each server run allows100model-backed attempts. Host/Origin checks and a static-file allowlist protect the loopback prototype; there is no remote access, user account or public authentication scheme. Source-selection and answer-generation tokens are both counted. Interrupted/unavailable calls with missing usage are labeled rather than recorded as zero-token successes.

Justin asked about a public free allowance. Proposed release pattern: two free AI questions per anonymous visitor per day, browser-only challenges available without inference, a return-later message after the allowance and an independently enforced application-wide monetary ceiling. A browser/cookie allowance is bypassable; a server-wide cap is the budget backstop. This pattern is **not activated** by the private prototype. Publication is authorized, pending the secure Relay backend, budget enforcement, abuse controls, privacy copy and deployment testing. Stripe/paid tiers remain outside this task.

## Verification

```sh
node --test tests/ask-the-show.test.mjs
npm test
npm run build
```

The build must have no `/prototype/` or `/ask-the-show/` route and must not contain private transcript files. Node tests exercise real source extraction, cross-topic retrieval, citation rejection, model-concurrency controls, HTTP origin/host rejection, input limits and cost arithmetic. Live model evaluations and CUA desktop/mobile evidence are separate from deterministic tests; see the dated private research report for results and limits.
