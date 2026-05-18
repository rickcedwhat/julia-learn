# OCR Test Labels

Real nutrition label photos for testing Gemini Vision OCR accuracy.
From a batch meal: Turkey Taco Bowl with Maduros.

## Labels

### `maduros.jpg` — Fried Maduros (Sweet Plantains)
**Serving:** 3 pieces (92g) · ~7 servings per container

| Field | Expected |
|---|---|
| Calories | 160 |
| Protein | 1g |
| Fat | 3g |
| Total Carbs | 31g |
| Fiber | 1g |
| Sugar | 26g |

---

### `black-beans.jpg` — Goya Black Beans
**Serving:** ½ cup (122g) · ~3.5 servings per container

| Field | Expected |
|---|---|
| Calories | 130 |
| Protein | 8g |
| Fat | 0.5g |
| Total Carbs | 23g |
| Fiber | 6g |
| Sugar | 1g |

---

### `taco-seasoning.png` — Siete Taco Seasoning
**Serving:** 2 tsp (5g) · ~7 servings per container

| Field | Expected |
|---|---|
| Calories | 15 |
| Protein | 1g |
| Fat | 0g |
| Total Carbs | 3g |
| Fiber | 1g |
| Sugar | 1g |

---

## Batch Recipe (no label: 93/7 Ground Turkey)

Full recipe used in testing:
- 3 lbs 93/7 Ground Turkey (USDA estimated: ~163 kcal / 19g protein / 9.4g fat per 100g raw)
- 2 pouches Siete Taco Seasoning
- 3 cans Goya Black Beans
- 36 pieces Fried Maduros

## How to use

Drop an image into the chat camera button and verify the OCR result matches the expected values above.
