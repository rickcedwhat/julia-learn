# 📅 Module 2: The Scaffold (Your App in `app/`)

*Concepts: Vite, [React](/glossary#react), [TypeScript](/glossary#typescript), project layout.*

::: tip Copyable prompts
Chat prompts use **code blocks** with a **copy** icon. Paste them into Antigravity.
:::

## Before you start

1. Finish the [Setup Guide](/setup-guide) through **§5 Viewing the Learning Portal** (Antigravity, Git, clone, `npm install`, `npm run docs:dev`).
2. Prefer wrapping **Module 1** first so the [App Spec](/app-spec) matches how you want to build—then you scaffold against that spec.

You will use **two dev servers** on different ports when both run: **this portal** from the repo root (`npm run docs:dev`), and **your nutrition app** from `app/` (`npm run dev` inside `app/` after you create it). That is normal.

## Objective

Create a real, runnable **React + TypeScript** shell in the **`app/`** folder (see the [App Spec](/app-spec) stack)—mobile-first, with placeholder areas for chat and library—so later modules bolt on AI, data, and tests instead of repeating setup lessons.

## Task 1: Scaffold Vite + React + TypeScript + Tailwind

Paste this into the Antigravity chat:

```text
This monorepo already has the Learning Portal at the repo root (`npm run docs:dev`). I need the real Nutrition Label app in the `app/` folder per `docs/app-spec.md` (Technical Stack: React, TypeScript, Vite, Tailwind, mobile-first).

The `app/` folder already exists with a README—set up or merge a Vite + React + TypeScript project there. Add Tailwind the standard way for Vite. Tell me the exact terminal commands (including `cd app` if needed), then implement:

1. `npm run dev` works from inside `app/` and shows a dev URL (note the port—avoid conflicting with the docs server).
2. A simple shell: app title "Nutrition Label", obvious placeholder areas labeled "Chat" and "Library" so I can see the layout on a narrow / mobile-sized viewport.
3. A short comment in README or package.json scripts so Future Me remembers how to start the app.

Do not add Gemini, Supabase, or Playwright yet—just the UI shell and toolchain.
```

## Task 2: Run it yourself

In the Antigravity terminal:

1. From the repo root, you can still run `npm run docs:dev` when you want this portal.
2. In a **second** terminal session, `cd app` (or `cd app` from your clone path), then `npm install` if you have not, then `npm run dev`.

Open the app URL—**you should see your own scaffold**, not just the docs site.

## Task 3: Align layout with the spec

Re-read **§4 Functional Requirements** in the [App Spec](/app-spec) (chat-first, library, cards). Then paste:

```text
Open `docs/app-spec.md` sections 4 (Functional Requirements) and 6 (UI/UX). My app is a fresh Vite+React+TS shell in `app/` with "Chat" and "Library" placeholders. Propose a minimal next tweak to the layout: e.g. a simple "working meal" card area, a list placeholder for the library, and where a future "Save to Library" button would go. Implement small, readable components—no backend, no Gemini yet. Explain what you changed in one short paragraph.
```

::: tip Stuck?
If tooling errors appear (Node version, port in use, Tailwind not applying), paste the **full terminal error** into Antigravity and ask for a fix—same habit you will use when wiring AI later.
:::

## Lesson

The Learning Portal teaches **in `docs/`**; the product you ship lives **in `app/`**. Getting that split clear early saves confusion.

---

*Module 3 adds [Gemini](/glossary#gemini) and prompt craft **after** this shell exists. Setup and Git stay in the [Setup Guide](/setup-guide) and [Module 1](/module-1)—we do not repeat them here.*

*See the [Glossary](/glossary) for unfamiliar terms.*
