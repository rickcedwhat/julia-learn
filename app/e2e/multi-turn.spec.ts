import { test, expect } from '@playwright/test'

const GEMINI_URL = '**/generativelanguage.googleapis.com/**'

// ── Mock payloads ─────────────────────────────────────────────────────────────

const MOCK_ORANGE_CHICKEN = {
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          components: [
            { name: 'Orange Chicken', weight_g: 161, calories: 490, protein_g: 26, fat_g: 16, carbs_g: 61, fiber_g: 2, sugar_g: 19 },
          ],
          totals: { calories: 490, protein_g: 26, fat_g: 16, carbs_g: 61, fiber_g: 2, sugar_g: 19 },
          message: 'Got it! Orange Chicken from Panda Express — 490 kcal.',
          ready_to_log: false,
          suggested_name: 'Orange Chicken',
        }),
      }],
    },
  }],
}

const MOCK_ORANGE_CHICKEN_AND_BROCCOLI = {
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          components: [
            { name: 'Orange Chicken', weight_g: 161, calories: 490, protein_g: 26, fat_g: 16, carbs_g: 61, fiber_g: 2, sugar_g: 19 },
            { name: 'Broccoli', weight_g: 153, calories: 80, protein_g: 4, fat_g: 3, carbs_g: 8, fiber_g: 3, sugar_g: 2 },
          ],
          totals: { calories: 570, protein_g: 30, fat_g: 19, carbs_g: 69, fiber_g: 5, sugar_g: 21 },
          message: 'Added broccoli! Your meal now totals 570 kcal.',
          ready_to_log: false,
          suggested_name: 'Orange Chicken & Broccoli',
        }),
      }],
    },
  }],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Multi-turn meal accumulation', () => {
  test('calories increase when adding food in a second turn', async ({ page }) => {
    let callCount = 0
    await page.route(GEMINI_URL, async (route) => {
      callCount++
      const body = callCount === 1 ? MOCK_ORANGE_CHICKEN : MOCK_ORANGE_CHICKEN_AND_BROCCOLI
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    })

    await page.goto('/')

    // Turn 1 — orange chicken only
    const textarea = page.locator('textarea').last()
    await textarea.fill('Orange chicken from Panda Express')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('490')).toBeVisible()

    // Turn 2 — add broccoli; total should grow
    await textarea.fill('also a side of broccoli')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('570')).toBeVisible({ timeout: 10000 })
  })

  test('second Gemini call includes structured meal JSON from first turn', async ({ page }) => {
    let capturedSecondBody: Record<string, unknown> | null = null
    let callCount = 0

    await page.route(GEMINI_URL, async (route) => {
      callCount++
      if (callCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ORANGE_CHICKEN),
        })
      } else {
        if (callCount === 2) {
          capturedSecondBody = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ORANGE_CHICKEN_AND_BROCCOLI),
        })
      }
    })

    await page.goto('/')

    const textarea = page.locator('textarea').last()
    await textarea.fill('Orange chicken from Panda Express')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })

    await textarea.fill('also a side of broccoli')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('570')).toBeVisible({ timeout: 10000 })

    // Verify the second request carried the first meal's full JSON in history
    type Content = { role: string; parts: Array<{ text: string }> }
    const contents = (capturedSecondBody?.contents ?? []) as Content[]
    const modelTurns = contents.filter((c) => c.role === 'model')
    expect(modelTurns.length).toBeGreaterThan(0)
    const lastModelText = modelTurns[modelTurns.length - 1]?.parts?.[0]?.text ?? ''
    expect(lastModelText).toContain('Orange Chicken')
    expect(lastModelText).toContain('490')
  })
})
