# 🥗 Project: Nutrition Label PWA - Learning Roadmap

Welcome! This project is designed to take you from "I don't remember how to code" to "I just built a functional AI app." We aren't going to focus on memorizing syntax; we are focusing on **AI Orchestration.**

## 🎯 The Goal
Build a mobile-friendly app that uses AI to analyze food labels and meal photos, saving them to a personal library for easy macro tracking.

---

## 📅 Module 1: The Architect (Defining the Specs)
*Concepts: Product Ownership, Scope, and Clarity.*
- **Objective:** Understand that an AI is only as good as the instructions it receives.
- **Task:** Read the [App Spec](/app-spec). We will "Interrogate the Spec." If you were testing this, what's the first thing that would break?
- **Lesson:** In AI dev, the "Requirement Doc" IS the code. If the spec is fuzzy, the app will be buggy.

## 📅 Module 2: The Engine ([Antigravity](/glossary#antigravity) & [Gemini](/glossary#gemini))
*Concepts: [IDEs](/glossary#ide-integrated-development-environment), [API Keys](/glossary#api-key), and Environment Setup.*
- **Objective:** Get your tools talking to each other.
- **Task:** Follow the [Setup Guide](/setup-guide) to connect Antigravity to the Gemini API.
- **Lesson:** Learn where the "brain" of your app lives and how to securely give it power.

## 📅 Module 3: The Ghostwriter (Prompt Engineering)
*Concepts: [System Prompts](/glossary#system-prompt), Context Windows, and Temperature.*
- **Objective:** Keep the LLM from "hallucinating" (making up fake calories).
- **Task:** Practice "Few-Shot Prompting." We will give the AI 3 examples of a label and see if it can do the 4th one perfectly.
- **Lesson:** How to talk to an AI so it stays on track and doesn't get "distracted."

## 📅 Module 4: The Safety Net (QA & Regressions)
*Concepts: [Playwright](/glossary#playwright), Automated Testing, and Edge Cases.*
- **Objective:** Use your QA background to make the app "Bulletproof."
- **Task:** Use Antigravity to write a Playwright test that clicks the "Save" button and checks if the data actually appeared in the database.
- **Lesson:** AI moves fast; tests make sure it doesn't break things while moving.

## 📅 Module 5: The Launch ([PWA](/glossary#pwa-progressive-web-app) & [Deployment](/glossary#deploy))
*Concepts: Hosting, [Service Workers](/glossary#service-worker), and "Installable" Apps.*
- **Objective:** Get the app on your actual phone.
- **Task:** Deploy to Vercel and "Add to Home Screen."
- **Lesson:** Understanding how a website becomes an "App."