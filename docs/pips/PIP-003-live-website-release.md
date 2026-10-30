# PIP-003 · October 30 website release

Status: release preparation verified; deployment pending. Owner explicitly approved updating the live website after reviewing the preview. Contact recipients confirmed service@limitlesslp.com and msison@limitlesslp.com.

Scope: publish the coherent site front door and free first financial-literacy resource; patch inherited dependency advisories; retain truthful inactive collection until real routing is ready. No newsletter campaign, support payment or event is activated.

Changes: Astro7.4.4, minimal content-config/Zod migration, Node22.23.4 pins; public resource labels updated; first-resource progress wording; optional FormSubmit adapter and matching privacy text; public CI variable wiring. Hosted endpoints remain unset.

Verification: fresh locked Node22.23.4 install, six behavior tests, 45-page production and46-page review builds, generated-output checks, independent release review, zero npm audit findings. Migration retained content across all45routes before editorial-label changes. Final rebuilt production and Linux CI must pass before merge.

Default production contains no demo banner/loopback collection, internal appendix or support checkout. Contact is a direct email fallback to the existing team inboxes. Form activation remains separate from website publication: new provider terms/processing approval, service mailbox verification, activation and observed delivery to both intended recipients.

Rollback: if production routes/resources fail or private/demo material appears, revert this release merge commit through a normal Git revert and redeploy the previous main baseline67d72cf. Do not rewrite shared history. Disable hosted form approval variables immediately if routing or privacy checks fail.

Post-deploy: verify the GitHub Pages workflow at the deployed commit, read homepage, contact, article and worksheet on the public domain, and record exact URLs/status. Website release does not establish form delivery, subscriptions, revenue or mission outcomes.
