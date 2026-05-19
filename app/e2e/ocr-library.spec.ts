import { test, expect } from '@playwright/test'
import path from 'path'

const GEMINI_URL = '**/generativelanguage.googleapis.com/**'
const SUPABASE_URL = '**/supabase.co/**'

const MOCK_OCR_RESPONSE = {
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          calories: 130,
          protein_g: 8,
          fat_g: 0.5,
          carbs_g: 23,
          fiber_g: 6,
          sugar_g: 1,
        })
      }]
    }
  }]
}

test.describe('OCR label flow', () => {
  test('uploading a label image shows macro card', async ({ page }) => {
    // Mock Gemini
    await page.route(GEMINI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_OCR_RESPONSE),
      })
    })

    // Mock Supabase inserts so we don't write to real DB
    await page.route(SUPABASE_URL, async (route) => {
      const method = route.request().method()
      if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/')

    // Find the hidden file input and upload the test label image
    const fileInput = page.locator('input[type="file"]')
    const testImagePath = path.join(__dirname, '../src/assets/test-labels/black-beans.jpg')
    await fileInput.setInputFiles(testImagePath)

    // Wait for macro card to appear with OCR results
    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('130')).toBeVisible()  // calories
    await expect(page.getByText('8')).toBeVisible()    // protein
  })
})
