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

Violating any of the above will corrupt the deployment pipeline and break the live application.

---

## ✅ APPROVED ARCHITECTURE (READ-ONLY — DO NOT CHANGE)

| Layer     | Technology              | Hosting              |
|-----------|-------------------------|----------------------|
| Frontend  | HTML / CSS / JavaScript | Cloudflare Pages     |
| Backend   | Google Apps Script      | Google's GAS Runtime |

No other layers exist. No other layers should be introduced.

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
