import { test, expect } from '@playwright/test'

const GEMINI_URL = '**/generativelanguage.googleapis.com/**'

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
    await input.press('Enter')

    // Wait for macro card
    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('546')).toBeVisible()  // calories
    await expect(page.getByText('67')).toBeVisible()    // protein (truncated)
  })

  test('macro card shows pass badge for high-protein meal', async ({ page }) => {
    await page.goto('/')

    const input = page.locator('textarea').last()
    await input.fill('I had 200g of grilled chicken and 100g of brown rice')
    await input.press('Enter')

    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    // High protein meal should show at least one pass badge
    await expect(page.locator('text=✓').first()).toBeVisible()
  })
})
