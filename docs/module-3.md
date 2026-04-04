# 📅 Module 3: The Ghostwriter (Prompts + Gemini)

*Concepts: [System Prompts](/glossary#system-prompt), [Few-Shot Prompting](/glossary#few-shot-prompting), [Temperature](/glossary#temperature), [Gemini](/glossary#gemini).*

::: tip Copyable prompts
Chat prompts use **code blocks** with a **copy** icon. Paste them into Antigravity.
:::

## Before you start

You should have the **Vite + React + TypeScript** app from [Module 2](/module-2) running out of `app/`. You do **not** need a perfect UI—just a real project folder where env vars and API calls belong.

We introduce the **Gemini API key here**, not in Module 2, so you are wiring the “brain” into something that already looks like your product.

## Objective

Practice **prompt engineering** so the model returns **structured, trustworthy** nutrition data—and **connect Gemini** to your app’s environment the right way (secrets in `.env`, not in Git).

## Task 1: Add your Gemini API key (for `app/`)

The app will read API keys from environment files. With **Vite**, variable names **exposed to browser code** must start with `VITE_`. Your AI may suggest `VITE_GEMINI_API_KEY` or a small server layer—follow the pattern it recommends, but **never commit** the key.

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with the **shared account** your instructor provided.
3. Use **Get API Key**, create or select a key, and copy it.
4. In Antigravity, create **`app/.env`** (or `app/.env.local` if the AI prefers) and add the key in the format your scaffold uses, for example:

   ```bash
   VITE_GEMINI_API_KEY=paste_your_key_here
   ```

5. Restart `npm run dev` in `app/` after changing env files.

::: warning
Do not paste keys into chat, screenshots, or GitHub. Root `.gitignore` already ignores `.env` files—keep it that way.
:::

<details>
<summary>💡 What is an API Key?</summary>

An [API](/glossary#api-application-programming-interface) key lets your app talk to Google’s Gemini API. Treat it like a password.

</details>

## Task 2: Few-shot practice (in Antigravity chat first)

Keep the [LLM](/glossary#llm-large-language-model) from [hallucinating](/glossary#hallucination) nutrition numbers by giving **concrete examples** in the prompt.

Paste this into the Antigravity chat (use the **copy** button on the block):

```text
I want to extract data from nutrition labels into JSON format. Here are 3 examples of the input text and the correct output:

Example 1: Calories 200, Pro 15g, Fat 5g -> {"calories": 200, "protein": 15, "fat": 5}
Example 2: Cal 150 - Protein 10g - Total Carbohydrate 20g -> {"calories": 150, "protein": 10, "carbs": 20}
Example 3: Energy 300kcal | Fat 10g | Sugars 5g -> {"calories": 300, "fat": 10, "sugar": 5}

Now, extract this one exactly like the examples: Calories: 450. Total Fat 20 g. Dietary Fiber 5g. Protein: 30g.
```

## Task 3: Wire Gemini into the app (guided)

Paste this so the AI implements **one** thin path: UI → Gemini → structured output (even if it only logs to the console or a debug panel at first).

```text
My Nutrition Label app lives in `app/` (Vite + React + TS). I have a Gemini API key in `app/.env` using the VITE_ prefix pattern. Open `docs/app-spec.md` section 4.A (Label Capture) for the fields we need (calories, protein, fat, carbs, fiber, sugar).

Add the smallest possible feature: e.g. a text area where I paste fake label text, a button "Extract with Gemini", and display the JSON result (or errors) on screen. Reuse the few-shot idea from my last exercise in the prompt you send to Gemini. Use low [Temperature](/glossary#temperature) for extraction. Walk me through any packages to install and files you create.
```

::: tip
If the AI suggests `@google/generative-ai` or fetch to a backend, say yes to whatever matches your instructor’s expectations—the goal is **one working call** you can see, not the final architecture.
:::

## Lesson

**Scaffold first, then secrets and prompts**—otherwise you are configuring a “brain” with nowhere for it to live. Few-shot examples and low temperature are how you keep macro math from drifting.

---

*See the [Glossary](/glossary) for unfamiliar terms.*
