# 🥗 Project: Nutrition Label PWA - Learning Roadmap

Welcome! This project is designed to take you from "I don't remember how to code" to "I just built a functional AI app." We aren't going to focus on memorizing syntax; we are focusing on **AI Orchestration.**

**How this site is organized:** deep setup, Git, and the Learning Portal itself live in the [Setup Guide](/setup-guide). **Modules** mostly advance the **real app in `app/`**—scaffold, AI, tests, ship—without repeating those basics.

## 🎯 The Goal
Build a mobile-friendly app that uses AI to analyze food labels and meal photos, saving them to a personal library for easy macro tracking.

---

## 📅 Module 1: The Architect (Defining the Specs)
*Concepts: Product Ownership, Scope, and Clarity.*
- **Objective:** Understand that an AI is only as good as the instructions it receives.
- **Task:** Read the [App Spec](/app-spec). Interrogate the spec with AI and collaborate on updates (for example restaurant or custom items). Copy-paste prompts and full steps: [Module 1](/module-1).
- **Git & sync:** If you edited `docs/app-spec.md` locally, it will not show on GitHub until you **commit and push** — that is how your instructor sees your real progress. When the instructor updates the curriculum, you **pull/merge** from their repo. Use the AI prompts on [Module 1](/module-1) and the [Setup Guide](/setup-guide).
- **Lesson:** In AI dev, the "Requirement Doc" IS the code. If the spec is fuzzy, the app will be buggy.

## 📅 Module 2: The Scaffold (React + Vite in `app/`)
*Concepts: Vite, [React](/glossary#react), [TypeScript](/glossary#typescript), Tailwind, layout.*
- **Objective:** Turn the spec into a runnable **app shell** in `app/`—not more setup lessons.
- **Task:** After the [Setup Guide](/setup-guide), scaffold Vite + React + TS + Tailwind, run `npm run dev` from `app/`, shape Chat/Library placeholders to match the spec: [Module 2](/module-2).
- **Lesson:** The portal lives in `docs/`; the product you ship lives in `app/`.

## 📅 Module 3: The Ghostwriter (Prompts + [Gemini](/glossary#gemini))
*Concepts: [System Prompts](/glossary#system-prompt), [Few-Shot Prompting](/glossary#few-shot-prompting), [Temperature](/glossary#temperature), [API Keys](/glossary#api-key).*
- **Objective:** Keep the [LLM](/glossary#llm-large-language-model) from "[hallucinating](/glossary#hallucination)" and wire **Gemini** into the app you already started.
- **Task:** Add `app/.env` keying, practice few-shot extraction in chat, then one minimal “extract label” path in the UI: [Module 3](/module-3).
- **Lesson:** Scaffold first; then secrets and prompts have somewhere to land.

## 📅 Module 4: The Safety Net (QA & Regressions)
*Concepts: [Playwright](/glossary#playwright), Automated Testing, and Edge Cases.*
- **Objective:** Use your QA background to make the app "Bulletproof."
- **Task:** Add [Playwright](/glossary#playwright) in **`app/`** and cover a critical path (e.g. save flow and list): [Module 4](/module-4).
- **Lesson:** AI moves fast; tests make sure it doesn't break things while moving.

## 📅 Module 5: The Launch ([PWA](/glossary#pwa-progressive-web-app) & [Deployment](/glossary#deploy))
*Concepts: Hosting, [Service Workers](/glossary#service-worker), and "Installable" Apps.*
- **Objective:** Get the app on your actual phone.
- **Task:** [Deploy](/glossary#deploy) the **`app/`** build to [Vercel](/glossary#vercel) and set up Add to Home Screen: [Module 5](/module-5).
- **Lesson:** Understanding how a website becomes an "App."
