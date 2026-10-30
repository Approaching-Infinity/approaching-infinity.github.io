# Dependency release review — October 30, 2026

**Locally verified; not pushed or deployed by this workstream.** The owner approved live website preparation after reviewing the local preview. This security update removes every vulnerability currently reported by npm for the locked dependency tree; provider activation, inbox delivery, newsletter consent and production acceptance remain separate work.

## Baseline and scope

Local base `44c0c3d` includes the approved local front door. Current `origin/main` was checked read-only and remains `67d72cf187b56f82774278e866d284cdc54de7be`, with no intervening main drift. The original development checkout was not edited.

Before remediation, npm reported 13 vulnerable dependency entries: 1 critical, 11 high and 1 low. The critical [Astro AVIF image optimization advisory](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) requires untrusted AVIF processing and identifies Astro 7.2.8/Sharp 0.35.4 as the fix. Even though this static site does not accept uploads or use that optimization path, the approved production release now receives the patched framework rather than retaining the vulnerable tree.

The current primary [Astro 7.4.4 release](https://github.com/withastro/astro/releases/tag/astro%407.4.4) and npm package metadata were checked October 30. Astro's published engine minimum is Node 22.23.4.

## Changes

- Pin Astro **5.18.2 → 7.4.4** exactly and regenerate `package-lock.json`, without dependency overrides or forced subdependency incompatibilities.
- Patched transitive versions include **Sharp 0.35.5**, **Vite 8.3.5**, **Zod 4.6.7**, **devalue 6.0.3**, **SVGO 4.1.0**, **PostCSS 8.5.32**, **nanoid 3.3.20**, **smol-toml 1.9.1** and **source-map-js 1.2.2**. The old esbuild/js-yaml/zod-to-ts paths disappear from this tree. No unrelated application features were added.
- Follow the official [v6 migration guide](https://docs.astro.build/en/guides/upgrade-to/v6/): move `src/content/config.ts` to `src/content.config.ts` and import Zod from `astro/zod`. The existing glob loader, IDs, schemas, source episodes and rendering API otherwise remain intact.
- Follow the official [v7 migration guide](https://docs.astro.build/en/guides/upgrade-to/v7/): keep its default Markdown pipeline, since this site has no remark/rehype plugins; explicitly set `compressHTML: true` to preserve the previous HTML whitespace behavior.
- Add `.node-version` **22.23.4** and `engines.node >=22.23.4`; pin PR verification, deployment and RSS sync workflows to **22.23.4** consistently.
- The deployment workflow also includes **root-owned, owner-approved public form environment-variable wiring**. No secret is embedded. This workstream did not choose or activate a provider, alter recipients or test delivery.

## Verification

Under **Node v22.23.4**: fresh `npm ci`, all **six** form/config behavior tests, production build (**45 pages**), local review build (**46 pages**) and generated-output checks pass. `npm audit` reports **0** vulnerabilities at every severity. `git diff --check` passes.

A pre-label migration comparison checked normalized main-content text and table-row counts for all 45 production routes against the Astro 5 build: **zero differences**, no added/removed routes. This includes every episode/appearance, the article's fictional example and both worksheet tables. Generated-output checks still verify review forms/banner/support, production support exclusion, canonical URLs, no contact enrollment, and no private editorial appendix.

Actual local browser readback after migration confirms the resource heading, updated public label, resource table, print-button colors and working client script. Live site/deployment evidence is not claimed by these local checks. Linux CI still must run on the eventual approved release; local validation does not execute the Linux native compiler binaries.

## Approved resource label preparation

The owner approved publishing the resource through the live website update. Public article, worksheet and index therefore remove **Review Draft** and retain the accurate **Updated October 30, 2026** label. The article's unavailable feedback route remains explicitly unavailable. No **Published** claim or actual publication timestamp is fabricated before deployment readback. Internal editorial source reports remain historical draft evidence and were not changed.

## Residual limits

Zero reported vulnerabilities reflects the current npm advisory database and this exact lockfile, not a security certification. Future dependency updates still require checks. Hosted contact routing, provider-side spam/error/From/Reply-To controls, actual dual inbox receipt, newsletter consent/unsubscribe/suppression and existing Stripe readiness are outside this remediation and remain separately verified by the lead. No push, merge, PR, deployment, test email, subscription or payment occurred here.
