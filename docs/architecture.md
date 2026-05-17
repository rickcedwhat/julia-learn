# Architecture Diagrams

---

## 1. Data Model (Entity Relationships)

```mermaid
erDiagram
    USER {
        uuid id PK
        text email
        text display_name
    }
    USER_GOALS {
        uuid id PK
        uuid user_id FK
        numeric calories
        numeric protein_g
        numeric fat_g
        numeric carbs_g
        numeric fiber_g
        numeric sugar_g
        timestamptz updated_at
    }
    RECIPE {
        uuid id PK
        uuid user_id FK
        text name
        text notes
        timestamptz created_at
    }
    BATCH {
        uuid id PK
        uuid user_id FK
        uuid recipe_id FK
        text name
        text marker_label
        text marker_color
        decimal total_weight_g
        jsonb total_macros
        timestamptz created_at
    }
    LABEL {
        uuid id PK
        uuid user_id FK
        text name
        text origin
        decimal calories
        decimal protein_g
        decimal fat_g
        decimal carbs_g
        decimal fiber_g
        decimal sugar_g
        text[] tags
        boolean protected
        integer version
        timestamptz created_at
    }
    MEAL {
        uuid id PK
        uuid user_id FK
        text name
        text meal_type
        jsonb computed_macros
        timestamptz logged_at
    }
    MEAL_COMPONENT {
        uuid id PK
        uuid meal_id FK
        uuid label_id FK
        uuid batch_id FK
        decimal weight_g
        decimal scale_factor
    }

    USER ||--o| USER_GOALS : "has"
    USER ||--o{ RECIPE : "creates"
    USER ||--o{ BATCH : "cooks"
    USER ||--o{ LABEL : "saves"
    USER ||--o{ MEAL : "logs"
    RECIPE ||--o{ BATCH : "yields"
    MEAL ||--o{ MEAL_COMPONENT : "contains"
    MEAL_COMPONENT }o--|| LABEL : "references"
    MEAL_COMPONENT }o--o| BATCH : "portions from"
```

> `meal_type` is an enum: `breakfast | lunch | dinner | snack`
> `USER_GOALS` has one row per user (upsert on save). All fields nullable — goals are opt-in per macro.

---

## 2. Chat Flow (Working Meal → Save Widget → Log)

```mermaid
flowchart TD
    A([User opens chat]) --> B[Working Meal: empty]
    B --> C{Message type}

    C -->|Text description| D[Gemini: parse food items + estimate macros]
    C -->|Photo upload| E[Gemini Vision OCR: extract 6 canonical macros]
    C -->|Correction e.g. actually 200g| F[Gemini: update component in working meal]

    D --> G[Update Working Meal State]
    E --> G
    F --> G

    G --> H[Render Macro Card\nCalories · Protein · Fat\nCarbs · Fiber · Sugar]
    H --> I{Density checks}
    I -->|protein ≥ cal × 0.05| J[✅ Protein badge]
    I -->|fiber ≥ cal × 0.015| K[✅ Fiber badge]
    I -->|targets missed| L[⚠️ Warning badge]

    J & K & L --> M{User action}
    M -->|Save to Library| N[Prompt for name → save Label]
    M -->|Done - log this meal| O[Render Save Widget]
    M -->|Keep editing| C

    subgraph WIDGET ["💾 Save Widget (no LLM)"]
        O --> P[Meal name — inline editable]
        O --> Q[Meal type — button group\nBreakfast · Lunch · Dinner · Snack]
        O --> R[Time — time picker\ndefaults to now]
        O --> S[Macro summary — read-only]
    end

    P & Q & R --> T{User confirms}
    T -->|Log Meal| U[Write to meals table]
    T -->|Keep Editing| C

    U --> V[Widget becomes read-only summary\n+ Share button]
    V --> W[Share → copy LOG string to clipboard]
```

> **Key principle:** meal type and time edits inside the Save Widget never go through the LLM. They are direct UI interactions that update local state only.

---

## 3. Daily Log Page

```mermaid
flowchart TD
    PAGE([/log or /log/YYYY-MM-DD]) --> DATE[Date header\n← prev day · today · next day →]
    DATE --> MEALS[Meal list ordered by logged_at]

    MEALS --> M1[Breakfast 08:30\nOatmeal · 420 kcal · 18g protein]
    MEALS --> M2[Lunch 12:45\nChicken + rice · 610 kcal · 52g protein]
    MEALS --> M3[Snack 15:00\nGreek yogurt · 180 kcal · 17g protein]

    M1 & M2 & M3 --> TAP{Tap meal card}
    TAP -->|Expand| DETAIL[Full 6-macro panel\n+ inline edit for type and time\n+ Share button]
    TAP -->|Swipe/long-press| DELETE[Delete with confirmation]

    MEALS --> TOTALS[Daily Totals\nsum of all logged meals]
    TOTALS --> GOALS[Goal progress per macro\ne.g. Protein 87g / 150g\nshown as fraction or progress bar]
    GOALS --> GOALS_LINK[Goals set in /settings]
```

---

## 4. Recipe → Batch → Portion Flow

```mermaid
flowchart LR
    subgraph Library
        R[📄 Recipe\ne.g. Lasagna\nbase ingredient ratios]
    end

    subgraph Active Batches
        B1[🟠 Batch — orange marker\nMay 10 · 1 200 g total\nactual measured macros]
        B2[🟢 Batch — green marker\nMay 17 · 1 350 g total\nactual measured macros]
    end

    subgraph Meals Logged
        M1[Meal portion\n400 g = 33% of orange batch]
        M2[Meal portion\n350 g = 26% of green batch]
    end

    R --> B1
    R --> B2
    B1 --> M1
    B2 --> M2
    M1 --> E1[Daily log]
    M2 --> E2[Daily log]
```

> **Physical labeling convention:** Write the marker color on the ziploc bag in real life, select the same color in-app. Batches of the same recipe are unambiguous at a glance.

---

## 5. Auto-Tag System

```mermaid
flowchart TD
    L([Label or Meal\nmacros available]) --> A{Evaluate tags}

    A --> MATH[Math-derived\nalways deterministic]
    A --> AI[AI-inferred\nGemini call on name + context]

    MATH --> M1{protein ≥ cal × 0.05?}
    MATH --> M2{fiber ≥ cal × 0.015?}
    MATH --> M3{fat ≤ 3 g per 100 cal?}
    MATH --> M4{cal ≥ 400 per 100 g?}
    MATH --> M5{cal ≤ 150 per 100 g?}

    M1 -->|Yes| T1[🏋️ High Protein]
    M2 -->|Yes| T2[🌾 High Fiber]
    M3 -->|Yes| T3[✨ Low Fat]
    M4 -->|Yes| T4[⚡ Calorie Dense]
    M5 -->|Yes| T5[🥗 Low Calorie]

    AI --> T6[🍬 Sweet Tooth]
    AI --> T7[🥩 Savory]
    AI --> T8[😌 Filling]

    T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 --> CAP{Cap at 3 tags\nprioritize math-derived}
    CAP --> OUT[0–3 tags applied\nicon · text · color]
```

> **Note on tag taxonomy:** The specific tags, thresholds, icons, and colors above are proposals — see [#27](https://github.com/rickcedwhat/julia-learn/issues/27) to finalize before implementation.

---

## 6. Label Origin Types

| Origin | How it's created | Trust level |
|---|---|---|
| `verified_label` | Photo of nutrition facts panel → Gemini OCR | Highest — direct from packaging |
| `user_generated` | User builds a recipe from other labels | Medium — math is exact, ingredients are user-chosen |
| `ai_estimated` | No photo available; Gemini estimates from item name | Lowest — useful as fallback, flagged visually |
