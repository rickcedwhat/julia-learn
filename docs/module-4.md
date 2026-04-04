# 📅 Module 4: The Safety Net (QA & Regressions)

*Concepts: [Playwright](/glossary#playwright), Automated Testing, and Edge Cases.*

::: tip Copyable prompts
Chat prompts use **code blocks** with a **copy** icon. Paste them into Antigravity.
:::

## Objective
Use your QA background to make the app "Bulletproof."

## Before you start

You should have a running UI in **`app/`** from [Module 2](/module-2) and (ideally) some save/list flow from [Module 3](/module-3) or your own iteration. Playwright installs **into the app project** (under `app/`), not into the Learning Portal root—unless your AI sets up a monorepo test package, keep it simple.

## Task

Paste this into the Antigravity chat:

```text
My Nutrition Label app is the Vite + React project in `app/`. Install Playwright there (devDependency, config, npm script if helpful). Write one End-to-End test that opens the app, exercises the main happy path you have so far—e.g. fill or paste label data, trigger Save to Library (or the closest button you implemented), and assert the new item shows up in the Library list or UI. If we do not have a database yet, assert on what the UI actually shows (local state or list). Adapt selectors to my real components.
```

## Lesson
AI moves fast; tests make sure it doesn't break things while moving.

---
*See the [Glossary](/glossary) for unfamiliar terms.*
