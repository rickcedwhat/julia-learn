import { test, expect } from '@playwright/test'

const GEMINI_URL = '**/generativelanguage.googleapis.com/**'
const SUPABASE_URL = '**/supabase.co/**'

const MOCK_MEAL_RESPONSE = {
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          components: [
            { name: 'Grilled chicken', weight_g: 200, calories: 330, protein_g: 62, fat_g: 7, carbs_g: 0, fiber_g: 0, sugar_g: 0 },
            { name: 'Brown rice', weight_g: 100, calories: 216, protein_g: 5, fat_g: 2, carbs_g: 45, fiber_g: 4, sugar_g: 0 },
          ],
          totals: { calories: 546, protein_g: 67, fat_g: 9, carbs_g: 45, fiber_g: 4, sugar_g: 0 },
          message: 'Got it! 200g grilled chicken and 100g brown rice.',
          ready_to_log: false,
          suggested_name: null,
        })
      }]
    }
  }]
}

// ── ready_to_log mock ─────────────────────────────────────────────────────────

const MOCK_READY_TO_LOG_RESPONSE = {
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          components: [
            { name: 'Grilled chicken', weight_g: 200, calories: 330, protein_g: 62, fat_g: 7, carbs_g: 0, fiber_g: 0, sugar_g: 0 },
            { name: 'Brown rice', weight_g: 100, calories: 216, protein_g: 5, fat_g: 2, carbs_g: 45, fiber_g: 4, sugar_g: 0 },
          ],
          totals: { calories: 546, protein_g: 67, fat_g: 9, carbs_g: 45, fiber_g: 4, sugar_g: 0 },
          message: "All set! Ready to log your chicken rice bowl?",
          ready_to_log: true,
          suggested_name: 'Chicken Rice Bowl',
        }),
      }],
    },
  }],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Chat meal tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(GEMINI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MEAL_RESPONSE),
      })
    })
  })

  test('typing a meal shows a macro card', async ({ page }) => {
    await page.goto('/')

    const input = page.locator('textarea').last()
    await input.fill('I had 200g of grilled chicken and 100g of brown rice')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for macro card
    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('546')).toBeVisible()  // calories
    await expect(page.getByText('67')).toBeVisible()    // protein (truncated)
  })

  test('macro card shows pass badge for high-protein meal', async ({ page }) => {
    await page.goto('/')

    const input = page.locator('textarea').last()
    await input.fill('I had 200g of grilled chicken and 100g of brown rice')
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    // High protein meal should show at least one pass badge
    await expect(page.locator('text=✓').first()).toBeVisible()
  })
})

// ── Issue #36 — Log meal via chat ─────────────────────────────────────────────

test.describe('#36 Log meal via chat', () => {
  test('ready_to_log response shows SaveWidget with suggested name', async ({ page }) => {
    await page.route(GEMINI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_READY_TO_LOG_RESPONSE),
      })
    })
    // Block Supabase writes; reads pass through
    await page.route(SUPABASE_URL, async (route) => {
      if (['POST', 'PATCH', 'DELETE'].includes(route.request().method())) {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
      } else {
        await route.continue()
      }
    })

    await page.goto('/')

    const input = page.locator('textarea').last()
    await input.fill("200g chicken, 100g rice — that's everything")
    await page.getByRole('button', { name: 'Send' }).click()

    // SaveWidget should appear
    await expect(page.getByText('Log this meal?')).toBeVisible({ timeout: 10000 })

    // Suggested name should be pre-filled
    await expect(page.getByDisplayValue('Chicken Rice Bowl')).toBeVisible()
  })

  test('#36: clicking Log Meal logs the meal and shows confirmation', async ({ page }) => {
    await page.route(GEMINI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_READY_TO_LOG_RESPONSE),
      })
    })
    await page.route(SUPABASE_URL, async (route) => {
      if (['POST', 'PATCH', 'DELETE'].includes(route.request().method())) {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
      } else {
        await route.continue()
      }
    })

    await page.goto('/')

    const input = page.locator('textarea').last()
    await input.fill("200g chicken, 100g rice — that's everything")
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Log this meal?')).toBeVisible({ timeout: 10000 })

    // Submit with the pre-filled name
    await page.getByRole('button', { name: 'Log Meal' }).click()

    // Confirmation message in the chat thread
    await expect(page.getByText(/Meal logged!/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Chicken Rice Bowl/)).toBeVisible()
  })

  test('#36: dismissing SaveWidget with Keep Editing hides it', async ({ page }) => {
    await page.route(GEMINI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_READY_TO_LOG_RESPONSE),
      })
    })

    await page.goto('/')

    const input = page.locator('textarea').last()
    await input.fill("200g chicken, 100g rice — that's everything")
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Log this meal?')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Keep Editing' }).click()

    // SaveWidget should be gone; chat input still available
    await expect(page.getByText('Log this meal?')).not.toBeVisible()
    await expect(page.locator('textarea').last()).toBeVisible()
  })
})
