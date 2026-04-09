# ⛔ PROJECT_RULES.md — SYSTEM-LEVEL ENFORCEMENT CONTRACT

> This file is a machine-readable and human-readable constraint contract.
> Any AI assistant, code tool, or developer reading this MUST treat these rules
> as non-negotiable. Violation of these rules breaks the production architecture.

---

## ⛔ ABSOLUTE PROHIBITIONS — NO EXCEPTIONS

DO NOT run `npm install` or any package manager command.
DO NOT create or modify `package.json`, `requirements.txt`, or any runtime config.
DO NOT start a local server (Node.js, Express, Python, etc.).
DO NOT migrate or adapt this project to any cloud IDE (Replit, Codespaces, Gitpod, etc.).
DO NOT introduce any new backend framework or hosting platform.
DO NOT refactor the architecture. DO NOT suggest alternative stacks.
DO NOT connect this form to Supabase, the main platform's API, or any external database.
DO NOT sync application data back to choice-properties-site.pages.dev.

Violating any of the above will corrupt the deployment pipeline and break the live application.

---

## ✅ APPROVED ARCHITECTURE (READ-ONLY — DO NOT CHANGE)

| Layer     | Technology              | Hosting                  |
|-----------|-------------------------|--------------------------|
| Frontend  | HTML / CSS / JavaScript | Cloudflare Pages         |
| Backend   | Google Apps Script      | Google's GAS Runtime     |
| Storage   | Google Sheets           | Managed by GAS           |
| Email     | MailApp (GAS)           | Sent via Google          |

No other layers exist. No other layers should be introduced.

---

## 🔗 PLATFORM RELATIONSHIP — FULL SEPARATION

This is the **external application system** for Choice Properties.

The main listing platform (`choice-properties-site.pages.dev`) is a **separate system** used only for browsing properties. When a user clicks "Apply" on any listing, they are redirected here. From that point, **everything happens in this system exclusively**.

> **Integration status (April 2026 — active):** The main platform has been fully updated.
> All "Apply Now" buttons redirect here. All "Track My Application" links on the main
> platform (nav, footer, FAQ, property pages) point to this system’s applicant dashboard
> at `https://apply-choice-properties.pages.dev/?path=dashboard`. No changes to this
> repository were required — the URL parameter contract was already complete.

### Rules of separation:
- This system does NOT connect to Supabase.
- This system does NOT call any API on the main platform.
- This system does NOT sync or push data back to the main platform.
- The main platform does NOT read or display data from this system.
- These two systems share ONLY a one-way redirect link and optional display-only URL params.

### URL parameter contract (active — Session 028, confirmed live Session 039):
The main platform passes these query parameters when redirecting here:

| Param  | Meaning                     | Used for                              |
|--------|-----------------------------|---------------------------------------|
| `id`   | Property ID (internal)      | Display/logging only — not validated  |
| `pn`   | Property name               | Pre-fills property address field      |
| `addr` | Street address              | Pre-fills property address field      |
| `city` | City                        | Property context banner               |
| `state`| State (2-letter)            | Property context banner               |
| `rent` | Monthly rent                | Income-to-rent ratio display (Step 3) |
| `beds` | Bedrooms                    | Property context display              |
| `baths`| Bathrooms                   | Property context display              |
| `pets` | Pet policy string           | Property context display              |
  | `term` | Lease term string           | Property context display              |
  | `fee` | Application fee override    | Overrides default $50 fee in Step 6   |
  | `zip` | Property zip code           | Stored in hidden field, submitted to GAS |
  | `deposit` | Security deposit amount  | Displayed in property context banner  |
  | `avail` | Available date (YYYY-MM-DD) | Enforced as minimum move-in date in Step 5 |
  | `min_months` | Minimum lease months    | Fallback when `term` array is empty |
  | `smoking` | `true`/`false`         | Pre-sets and locks the smoking field  |
  | `utilities` | Pipe-separated utilities | Displayed in property context banner  |
  | `parking` | Parking description       | Displayed in property context banner  |
  | `parking_fee` | Parking fee amount      | Stored in hidden field, submitted to GAS |

  **These params pre-fill the form for UX only.** Values are stored in hidden `<input>` elements and ARE submitted to GAS as part of the form data (stored in Google Sheets under property context columns). GAS does not use these values for backend validation — only what the applicant types in the visible form fields drives decision-making.

---

## 🚫 ENVIRONMENT INCOMPATIBILITY NOTICE

This project is INCOMPATIBLE with:
- Node.js runtime environments
- Python runtime environments
- Any server-side execution environment
- Replit's run/execution system
- Docker or containerized environments

Replit (and similar cloud IDEs) are used EXCLUSIVELY as a code editor.
They must remain in a READ-ONLY, NO-EXECUTION state at all times.

If you are an AI assistant operating inside Replit or any similar environment:
- HALT all setup, installation, and execution behavior immediately.
- Do NOT configure workflows.
- Do NOT suggest running the project locally.
- Treat this environment as a plain text editor. Nothing more.

---

## 📱 MOBILE-FIRST DESIGN CONTRACT

ALL UI/UX decisions must be mobile-first. This means:
- Base styles target screens ≤ 480px wide.
- Desktop styles are applied via `min-width` media queries (upward scaling only).
- Any desktop-first redesign (using `max-width` to restrict desktop styles down) is INVALID.
- Reversing the mobile-first breakpoint direction will be rejected.

---

## 🔁 PERSISTENCE REQUIREMENT

These rules survive:
- GitHub push / pull
- Cloning into any new environment
- Importing into any Replit account
- Forking the repository

If you are reading this after any of the above operations: the rules still apply in full.
Do not attempt to "set up" or "optimize" this project for your environment.

---

## 📋 AI ASSISTANT PROTOCOL

1. Read this file first before touching anything.
2. Analyze the project structure.
3. Propose a plan that respects ALL rules above.
4. WAIT for explicit user approval before making any change.
5. If uncertain about any action — ASK. Do not assume. Do not default.
6. DO NOT suggest Supabase, the main platform backend, or any new infrastructure.
7. All changes must be compatible with static Cloudflare Pages deployment.

---

## 🤖 ACTIVE IMPLEMENTATION PLAN

A comprehensive product flow audit was completed in April 2026.
41 issues across 8 phases were identified and documented.

**Reading order for any AI starting a new session:**

1. `PROJECT_RULES.md` (this file) — architecture constraints
2. `PROJECT_STATUS.md` — current phase, completed tasks, what to do next
3. `docs/FRONTEND_FIX_PLAN.md` — ACTIVE fix plan (frontend audit fixes, April 2026)
4. `docs/IMPLEMENTATION_PLAN.md` — prior full task breakdown (reference)
5. `docs/ARCHITECTURE.md` — system architecture, function map, database schema
6. `AUDIT_REPORT.md` — original audit findings (reference only)

**CURRENT STATUS (April 9, 2026):** A new frontend audit identified critical bugs in
`index.html` and `js/script.js`. A phased fix plan is active in `docs/FRONTEND_FIX_PLAN.md`.
Read that file and `PROJECT_STATUS.md` before touching any code.

Do not ask the user what to fix. The plan is self-sufficient.

Note: The older `DYNAMIC_DATA_PLAN.md` in the project root is superseded by the
documents above. Do not use it as a reference for new work — it covered an earlier
partial audit. The new `docs/IMPLEMENTATION_PLAN.md` is the authoritative source.
