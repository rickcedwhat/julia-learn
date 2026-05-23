import { test, expect, type Route } from '@playwright/test'
import path from 'path'

const GEMINI_URL = '**/generativelanguage.googleapis.com/**'
const SUPABASE_URL = '**/supabase.co/**'

// ── Mock payloads ─────────────────────────────────────────────────────────────

const MOCK_VISION_RESPONSE = {
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          components: [
            { name: 'Black Beans', weight_g: null, calories: 130, protein_g: 8, fat_g: 0.5, carbs_g: 23, fiber_g: 6, sugar_g: 1 },
          ],
          totals: { calories: 130, protein_g: 8, fat_g: 0.5, carbs_g: 23, fiber_g: 6, sugar_g: 1 },
          message: 'I can see a Black Beans nutrition label. Adding it to your meal.',
          ready_to_log: false,
          suggested_name: 'Black Beans',
        }),
      }],
    },
  }],
}

const MOCK_ARRAY_RESPONSE = {
  candidates: [{ content: { parts: [{ text: '[]' }] } }],
}

// ── Route helpers ─────────────────────────────────────────────────────────────

/**
 * Gemini handler: first call = vision WorkingMeal, subsequent = empty array
 * (covers inferAiTags + inferMetaTags calls during library save).
 */
function makeGeminiHandler() {
  let callCount = 0
  return async (route: Route) => {
    callCount++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(callCount === 1 ? MOCK_VISION_RESPONSE : MOCK_ARRAY_RESPONSE),
    })
  }
}

/**
 * Default Supabase handler:
 *   GET  /labels → [] (no existing label)
 *   POST /labels → [{ id: 'test-label-id' }] (insert success)
 *   Other writes  → empty success
 *   Other reads   → continue
 */
async function defaultSupabaseHandler(route: Route) {
  const method = route.request().method()
  const url = route.request().url()

  if (method === 'GET' && url.includes('/labels')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  } else if (method === 'POST' && url.includes('/labels')) {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'test-label-id' }]),
    })
  } else if (['POST', 'PATCH', 'DELETE'].includes(method)) {
    await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
  } else {
    await route.continue()
  }
}

const TEST_IMAGE = path.join(__dirname, '../src/assets/test-labels/black-beans.jpg')

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Vision label flow', () => {
  test('staging and sending a label image shows macro card', async ({ page }) => {
    await page.route(GEMINI_URL, makeGeminiHandler())
    await page.route(SUPABASE_URL, defaultSupabaseHandler)

    await page.goto('/')

    // Stage the image via the hidden file input (works without clicking camera button)
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE)
    // Confirm thumbnail appears before sending
    await expect(page.locator('img[alt="Attachment 1"]')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('130')).toBeVisible()
    await expect(page.getByText('8')).toBeVisible()
  })

  test('saving label macros to library shows success', async ({ page }) => {
    await page.route(GEMINI_URL, makeGeminiHandler())
    await page.route(SUPABASE_URL, defaultSupabaseHandler)

    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE)
    await expect(page.locator('img[alt="Attachment 1"]')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })

    await page.getByText('Save to Library').click()
    const nameInput = page.getByPlaceholder('Name this label…')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Black Beans')

    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Saved as Black Beans!')).toBeVisible({ timeout: 8000 })
  })

  test('saving with a duplicate name shows conflict resolution', async ({ page }) => {
    await page.route(GEMINI_URL, makeGeminiHandler())

    await page.route(SUPABASE_URL, async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      if (method === 'GET' && url.includes('/labels')) {
        // Simulate an existing v1 label to trigger conflict UI
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'existing-id', version: 1 }]),
        })
      } else if (method === 'POST' && url.includes('/labels')) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'new-label-id' }]),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE)
    await expect(page.locator('img[alt="Attachment 1"]')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })

    await page.getByText('Save to Library').click()
    await page.getByPlaceholder('Name this label…').fill('Black Beans')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText(/already exists/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Save as new version' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save as new label' })).toBeVisible()

    await page.getByRole('button', { name: 'Save as new version' }).click()
    await expect(page.getByText('Saved as Black Beans!')).toBeVisible({ timeout: 8000 })
  })
})
