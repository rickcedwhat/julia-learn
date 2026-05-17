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
        jsonb computed_macros
        text kickoff_export
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

    USER ||--o{ RECIPE : "creates"
    USER ||--o{ BATCH : "cooks"
    USER ||--o{ LABEL : "saves"
    USER ||--o{ MEAL : "logs"
    RECIPE ||--o{ BATCH : "yields"
    MEAL ||--o{ MEAL_COMPONENT : "contains"
    MEAL_COMPONENT }o--|| LABEL : "references"
    MEAL_COMPONENT }o--o| BATCH : "portions from"
```

---

## 2. Chat Flow (Working Meal → Log / Save)

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

    G --> H[Render Visual Macro Card\nCalories · Protein · Fat\nCarbs · Fiber · Sugar]
    H --> I{Density checks}
    I -->|protein ≥ cal × 0.05| J[✅ Protein badge]
    I -->|fiber ≥ cal × 0.015| K[✅ Fiber badge]
    I -->|targets missed| L[⚠️ Warning badge]

    J & K & L --> M{User action}
    M -->|Save to Library| N[Prompt for name → save Label]
    M -->|Log meal| O[Save Meal + generate Kickoff export string]
    M -->|Keep editing| C
```

---

## 3. Recipe → Batch → Portion Flow

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
    M1 --> E1[📋 Kickoff export]
    M2 --> E2[📋 Kickoff export]
```

> **Physical labeling convention:** Write the marker color on the ziploc bag in real life, select the same color in-app. Batches of the same recipe are unambiguous at a glance.

---

## 4. Auto-Tag System

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

> **Note on tag taxonomy:** The specific tags, thresholds, icons, and colors above are proposals — see issue #25 to finalize before implementation.

---

## 5. Label Origin Types

| Origin | How it's created | Trust level |
|---|---|---|
| `verified_label` | Photo of nutrition facts panel → Gemini OCR | Highest — direct from packaging |
| `user_generated` | User builds a recipe from other labels | Medium — math is exact, ingredients are user-chosen |
| `ai_estimated` | No photo available; Gemini estimates from item name | Lowest — useful as fallback, flagged visually |
