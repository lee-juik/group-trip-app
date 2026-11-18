@AGENTS.md

## Skills to use until launch (출시까지 알아서 쓰는 스킬)

The owner wants Claude to pick and use the right skill on its own whenever a
task matches, without being asked. Say in one line which skill you used.

This is an original app (not a clone), so the Replica skills in
`.claude/skills/` are used in "own app" mode: skip any step that needs an
"original" app's recon map or parity score, put their working files under
`docs/launch/` instead of `replica/`, and treat competitor apps (e.g. other
group-trip / split-the-bill apps) as the "original" only for review research.

| When | Skill |
| --- | --- |
| Changing colours, fonts, spacing, or the "too childish" redesign | `replica-design` (tokens + `contrast.py` WCAG check), plus `emil-design-eng` / `web-design-guidelines` / `frontend-design` if available |
| After a feature or fix, before merging | `replica-test` (test plan, Playwright e2e against demo mode, bug report S1–S4), plus `code-review` |
| Auth, Supabase tables/RLS, storage, payments | `replica-backend` security checklist (keep AGENTS.md DB rules: small migrations, no DROP/DELETE) |
| "What do users hate about similar apps", feature ideas | `replica-entrepreneur` (real, linked review quotes only) |
| App name, logo, palette, voice | `replica-brand` |
| Landing page, pricing, App Store / Play listing | `replica-launch` (`listing.py` lints store limits) |
| Going live, own domain, store builds | `replica-deploy` preflight, plus `deploy-checklist`; EAS for store builds |
| Screens a11y | `accessibility-review` |

Replica skills: MIT, from github.com/Jakeschincariol/replica-skill
(commit 77c9436), license in `.claude/skills/REPLICA-LICENSE`. Not copied on
purpose: replica-recon, -architect, -build, -diff (they only make sense when
cloning someone else's app).
