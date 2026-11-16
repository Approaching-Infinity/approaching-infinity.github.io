# Public Ask the Show release

Owner explicitly requests registration, backend and publication, three free questions per person, unchanged shared cap, real answers/citations verified. Existing worktree/Relay client7cdda43 is the base. Execute inline with test-first checks and one fresh review of this release; ordinary deployment and live qualification are already authorized.

## Delivery

1. Persistent anonymous visitor allowance: three attempted AI questions/day, signed browser identity, restart-safe idempotency and one concurrent action. Anonymous identity is bypassable; do not claim verified people. Keep exact questions/answers out of server storage. Store hashed visitor/network identifiers and bounded accounting metadata.
2. Dedicated Node backend on existing VPS. Fixed private Relay path/app credential only; no provider keys, retries, inference queue or direct fallback. Conservative $0.03 reservation/question and $0.25 application monthly sublimit INSIDE existing Relay pool, not another spending allowance. Known usage settles conservatively at current native prices; unknown cost retains the reservation. Never reset existing Relay holds/accounting. A zero-usage scope response needs no AI allowance.
3. Public branded page at /ask-the-show/, resources/navigation entry, three static decision challenges usable without inference. Accurate privacy/source labels. Only approved public notes and six selected transcript candidates in server corpus, no internal source metadata. Signed visitor ID held locally; no login/email required. CORS limited to the website, backend binds loopback behind existing HTTPS reverse proxy.
4. Test allowance/restart/day reset, idempotency, budget stop, bad origins/input, invalid citations, failed inference and public response privacy. Actual Relay enrollment remains its owner's protected release; do not reuse another app identity. Review, test/build, deploy backend and static site, then browser-check actual generated answers/citations/challenges and exhausted allowance. Record actual Relay usage/cost and exact live boundaries. Preserve all unrelated services and prepare scoped rollback.

## Operating choices

- Three/day is enforced per anonymous browser. Additional per-network and shared admission limits protect the small pilot; no claim of strong identity enforcement.
- The website-specific $0.25/month sublimit protects the existing apps while quality/traffic are unmeasured; it cannot enlarge the shared $5/month cap.
- Unknown/interrupted work consumes a conservative reservation until operator reconciliation. Repeated request IDs never make another model call, including after process restart.
- Existing crm.limitlesslp.com HTTPS host can serve a narrowly namespaced API path; website stays on GitHub Pages. Reuse owned infrastructure, isolate files/state/credentials, no new domain/subscription. Public Relay listener is prohibited.
- Publication authorization persists. Only a concrete security/access/contract decision not covered by that scope should return to the user.
