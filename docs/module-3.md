# 📅 Module 3: The Ghostwriter (Prompt Engineering)

*Concepts: [System Prompts](/glossary#system-prompt), Context Windows, and Temperature.*

## Objective
Keep the [LLM](/glossary#llm-large-language-model) from "[hallucinating](/glossary#hallucination)" (making up fake calories).

## Before You Start: Get Your Gemini API Key

The "Brain" of our app is Google's [Gemini](/glossary#gemini). Before we can start prompting the AI, it needs an [API Key](/glossary#api-key) — like a password that lets your app connect to it.

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with the shared account.
3. Click on **"Get API Key"** on the left sidebar.
4. Copy the key (it looks like a long string of random letters).
5. In Antigravity, create a new file in your project called `.env` and paste the key there:
   ```
   GEMINI_API_KEY=your_key_here
   ```

::: warning
Never share your `.env` file or upload it to GitHub! The `.gitignore` is already set up to keep it safe.
:::

<details>
<summary>💡 What is an API Key?</summary>

An [API](/glossary#api-application-programming-interface) key is like a password that lets your app talk to an external service (in this case, Google's Gemini AI). Each key is unique to you. If someone else gets your key, they could use up your credits or access your data — that's why we keep it in `.env` and never commit it to Git.

</details>

## Task
Practice "[Few-Shot Prompting](/glossary#few-shot-prompting)." We will give the AI 3 examples of a label and see if it can do the 4th one perfectly.

Paste this into the Antigravity chat (use the **copy** button on the block):

```text
I want to extract data from nutrition labels into JSON format. Here are 3 examples of the input text and the correct output:

Example 1: Calories 200, Pro 15g, Fat 5g -> {"calories": 200, "protein": 15, "fat": 5}
Example 2: Cal 150 - Protein 10g - Total Carbohydrate 20g -> {"calories": 150, "protein": 10, "carbs": 20}
Example 3: Energy 300kcal | Fat 10g | Sugars 5g -> {"calories": 300, "fat": 10, "sugar": 5}

Now, extract this one exactly like the examples: Calories: 450. Total Fat 20 g. Dietary Fiber 5g. Protein: 30g.
```

## Lesson
How to talk to an AI so it stays on track and doesn't get "distracted."

---
*See the [Glossary](/glossary) for unfamiliar terms.*
