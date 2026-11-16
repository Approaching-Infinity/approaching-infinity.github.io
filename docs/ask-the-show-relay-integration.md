# Ask the Show: Relay integration boundary

**Prepared and tested locally; not publicly deployed.** The owner authorizes public Ask the Show through existing Relay, without a new provider key/subscription or a separate spending pool.

## Prepared client

- `prototype/ask-the-show/relay.mjs`: server-only fixed private native endpoint, `gpt-4o-mini`, protected per-app token reader, durable pre-POST attempt journal, mandatory deadline plus caller cancellation, bounded ASCII request/response and exact native usage/model validation.
- `prototype/ask-the-show/model.mjs`: source-grounded generation reused by local and Relay transports. Selection keys and final citation IDs are validated inside the generation pipeline, independent of HTTP callers. Citation validity does not establish factual entailment.
- `prototype/ask-the-show/relay-policy.example.toml`: proposed `approaching_infinity` identity and `episode_selection` / `archive_answer` features under `archive_question` operation group. No deployed config or secret.
- `tests/ask-the-show-relay.test.mjs`: fabricated transport, restart/replay, uncertainty, refusals, timeout, credential safety, output validation and reservation bounds. No real credentials/provider requests.

The local `npm run ask:show` server still uses Ollama. No environment variable silently switches it to a remote provider.

## Dedicated Relay enrollment required

Relay's current private runtime authorizes CRM, Axiom and Ambient only. Do not reuse those app tokens or an operator identity. Its protected bootstrap/recovery currently permits a fixed service set; app enrollment must be added through the Relay owner's scoped reviewed release, with current ledger/holds and existing identities preserved. Do not append a secret ad hoc to bypass recovery validation or hotpatch the active owner's task.

The example's per-request reservation cap is $0.015, shared operation cap $0.03. Both remain below the existing shared monthly ceiling; neither creates a second budget. The actual pure Relay parser accepted fabricated selection/answer payloads. Expected answer cost remains unbenchmarked for this model; parser reservations are upper bounds, not invoices.

## Public backend and release checks required

Deploy the app backend on existing approved hosting with private Relay connectivity. Keep the Relay listener private. The static GitHub Pages frontend cannot hold an app secret or enforce monetary controls. Do not tunnel the Mac or expose local Ollama.

The backend must persist visitor allowance (two AI questions/day), enforce an application sublimit inside the shared pool, rate/concurrency/input/output limits, preserve one action ID across both rounds, and fail closed on Relay stops. Anonymous allowances are bypassable, so Relay's central reservations and cap remain the final spend backstop. Challenges without AI should remain usable when generation is unavailable.

Verify source labels/external-show credits, privacy copy, actual cited answers and unsupported questions, quota/budget/failure paths and responsive UI against the deployed backend. Until then, no public AI release or zero-cash-cost claim is supported.

## Subscription credits

The owner selected the existing organization and its included Business benefit was linked and verified as an available grant on November16. Financial details and credential-provenance evidence remain outside this public repository. This is separate from the pending app enrollment and real model qualification. Never add recharge, increase the shared pool or create a direct provider bypass because credits exist. Credit exhaustion or uncertainty must produce a stop under the chosen funding controls, not an assumed free continuation.
