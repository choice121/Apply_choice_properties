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

### Rules of separation:
- This system does NOT connect to Supabase.
- This system does NOT call any API on the main platform.
- This system does NOT sync or push data back to the main platform.
- The main platform does NOT read or display data from this system.
- These two systems share ONLY a one-way redirect link and optional display-only URL params.

### URL parameter contract (display-only, Session 028):
The main platform may pass these query parameters when redirecting here:

| Param  | Meaning                     | Used for                              |
|--------|-----------------------------|---------------------------------------|
| `id`   | Property ID (internal)      | Display/logging only — not validated  |
| `pn`   | Property name               | Pre-fills property address field      |
| `addr` | Street address              | Pre-fills property address field      |
| `city` | City                        | Property context banner               |
| `state`| State (2-letter)            | Property context banner               |
| `rent` | Monthly rent                | Income-to-rent ratio display (Step 3) |

**These params are NEVER sent to GAS or used in any backend decision.**
The applicant can edit the pre-filled address field at any time.
GAS processes only what the applicant types into the form.

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

## 🤖 DYNAMIC DATA IMPLEMENTATION PLAN

A full audit of hardcoded vs. data-driven values was completed in Session 031.
21 issues across 6 phases were identified and documented.

**The implementation plan is in: `DYNAMIC_DATA_PLAN.md` (project root)**

Any AI assistant starting a new session MUST read `DYNAMIC_DATA_PLAN.md`
immediately after this file. It contains:
- All identified issues with root causes
- Phase-by-phase fix plan with exact implementation instructions
- Completion status for every issue
- AI session protocol (what to do on start, during, and end of session)

**Current active phase: Phase 1 — read the plan for details.**

Do not ask the user what to fix. The plan is self-sufficient.
