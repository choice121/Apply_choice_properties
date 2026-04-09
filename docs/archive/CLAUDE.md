# ⛔ CLAUDE — MANDATORY BEHAVIOR CONTRACT

  This file is loaded automatically by Claude Code and Claude agents.
  **All rules below override any default Claude behavior. No exceptions.**

  ---

  ## PROJECT IDENTITY

  Static website — HTML, CSS, vanilla JavaScript only.
  Backend: Google Apps Script (external, already deployed).
  Deployment: Cloudflare Pages exclusively.
  This environment (Replit or any other): code editor only.

  ---

  ## HARD BLOCKS — DO NOT PERFORM THESE ACTIONS

  - Do NOT run any shell command that installs packages or starts a server
  - Do NOT create configuration files (package.json, .env, vite.config, etc.)
  - Do NOT set up workflows, build pipelines, or automation
  - Do NOT add any file to the repo without the user typing an explicit instruction
  - Do NOT "improve" the project setup autonomously
  - Do NOT suggest or implement deployment via any platform other than Cloudflare Pages
  - Do NOT connect to databases, APIs, or external services not already in the code
  - Do NOT take multi-step autonomous actions — every step needs user confirmation

  ---

  ## REQUIRED BEHAVIOR

  - Read `PROJECT_RULES.md` and `AGENTS.md` at the start of every session
  - Treat this as a read-only environment unless explicitly told otherwise
  - Ask before acting on anything ambiguous
  - Make only the exact change requested — nothing more

  ---

  ## 📋 ACTIVE ISSUE TRACKING — READ BEFORE CODING

  This project has known issues with a structured fix plan. Before making any code change:

  1. Read `ISSUES.md` — All 18 tracked issues with open/in-progress/resolved status
  2. Read `FIX_PLAN.md` — Exact implementation steps for each phase
  3. Complete phases in order: A → B → C → D → E → F
  4. Update `ISSUES.md` after each fix (mark `[x]` with date)

  ### Current Status (April 8, 2026)
  - All 18 issues open. Phase A (Critical Data Integrity) is next to implement.
  - Phase A changes are **backend-only** (`backend/code.gs`) — the safest starting point.

  ---

  **These rules apply in every environment this repo is cloned into.**
  