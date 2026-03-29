# 📑 App Specification: Nutrition Label PWA

::: tip 📖 New to a term?
Check the [Glossary](/glossary) any time you see an unfamiliar word.
:::

## 1. Project Vision

A "Deconstructed Meal Tracker" that treats nutrition like an engineering problem. Instead of a database of generic items, this app focuses on **User-Verified Labels** and **Recursive Batches** (ingredients making meals, which become ingredients for future meals).

---

## 2. Core Logic: The Recursive Component Model

Every item in the app is a **Component**.

| Type | Example |
|------|---------|
| **Ingredient** | A single item (e.g., 1 slice of bread) |
| **Batch** | A collection of ingredients (e.g., a tray of Lasagna) |
| **Meal** | A specific portion of a batch or a collection of ingredients (e.g., 400g of the Lasagna batch) |

### Label Origins

| Origin | Description |
|--------|-------------|
| **Verified Label** (`verified_label`) | Data pulled directly from a store-bought nutrition facts photo |
| **User Generated** (`user_generated`) | A recipe or batch created by combining other labels |
| **AI Estimated** (`ai_estimated`) | A fallback when no label is available, using visual estimation |

---

## 3. The Math (Density Checks)

The app must automatically validate every meal against "Nutritional Density" targets. These are calculated based on the total calories of the specific meal.

| Target | Formula | Example (500 cal meal) |
|--------|---------|----------------------|
| **Protein** | Total Calories × 0.05 | 25g |
| **Fiber** | Total Calories × 0.015 | 7.5g |

---

## 4. Functional Requirements

### A. Label Capture & OCR

- Use the [Gemini](/glossary#gemini) 1.5 Flash [API](/glossary#api-application-programming-interface) to "read" nutrition label photos.
- Extract: **Calories, Protein, Fat, Total Carbs, Fiber, and Sugar.**
- Allow the user to "Save to Library" with a custom name.

### B. Chat-First Interface

- All interactions happen via a chat window.
- The AI maintains a "Working Memory" of the current meal.
- Users can correct the AI (e.g., "Actually, I had 200g of chicken, not 150g").
- The AI updates a **Visual Card** in the chat after every change.

### C. The Library & Search

- Store all saved labels in a searchable list.
- **Fuzzy Search:** Typing "Lasgna" should still find "Lasagna."
- **Versioning:** If a user makes a new batch of a saved recipe, save it as a new version with the current date.

### D. Custom Export ("Kickoff App")

- A button on every finalized meal card.
- Copies a plain-text string to the clipboard in this format:
  ```
  LOG | [Meal Name] | [Time] | [Calories] | [Protein] | [Carbs] | [Sugar] | [Fat] | [Fiber]
  ```

---

## 5. Technical Stack

| Tool | Purpose |
|------|---------|
| [React](/glossary#react) with [TypeScript](/glossary#typescript) | Frontend framework |
| Tailwind CSS | Styling (Mobile-First) |
| Supabase (PostgreSQL) | Database for component storage |
| [Gemini](/glossary#gemini) 1.5 Flash API | AI-powered label reading |
| Vite-PWA plugin | Offline-ready, "installable" mobile experience |
| [Playwright](/glossary#playwright) | End-to-End (E2E) testing |

---

## 6. UI/UX Principles

- **Clean Cards:** Nutritional data should be displayed in scannable tables.
- **Vertical Summaries:** Total meal data must be in a 2-column vertical table for mobile screenshotting.
- **Transparency:** Never hide the math. Show how a batch's macros were scaled down to the individual portion size.
- **The "Janitor":** A library view that allows users to "Protect" important labels and "Batch Delete" old or experimental ones.

---

## 7. Security & Privacy

- **OAuth:** Google Login via Supabase.
- **[Environment Variables](/glossary#environment-variable):** All [API Keys](/glossary#api-key) (Gemini, Supabase) must be stored in a `.env` file and never committed to GitHub.
