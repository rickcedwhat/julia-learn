import { test, expect, type Route } from '@playwright/test'
import path from 'path'

const GEMINI_URL = '**/generativelanguage.googleapis.com/**'
const SUPABASE_URL = '**/supabase.co/**'

// ── Mock payloads ─────────────────────────────────────────────────────────────

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
        }),
      }],
    },
  }],
}

/** inferAiTags expects a JSON array of tag strings back */
const MOCK_AI_TAGS_RESPONSE = {
  candidates: [{
    content: {
      parts: [{ text: '[]' }],
    },
  }],
}

// ── Route helpers ─────────────────────────────────────────────────────────────

/**
 * Returns a Gemini route handler. First call = OCR response.
 * Subsequent calls (inferAiTags) = empty tags array.
 */
function makeGeminiHandler() {
  let callCount = 0
  return async (route: Route) => {
    callCount++
    const body = callCount === 1 ? MOCK_OCR_RESPONSE : MOCK_AI_TAGS_RESPONSE
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }
}

/**
 * Default Supabase handler:
 *   GET  /labels → [] (no existing label, no conflict)
 *   POST /labels → [{ id: 'test-label-id' }] (insert success)
 *   Other writes  → empty success (avoid real DB writes)
 *   Reads         → pass through
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

test.describe('OCR label flow', () => {
  test('uploading a label image shows macro card', async ({ page }) => {
    await page.route(GEMINI_URL, makeGeminiHandler())
    await page.route(SUPABASE_URL, defaultSupabaseHandler)

    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE)

    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('130')).toBeVisible()
    await expect(page.getByText('8')).toBeVisible()
  })

  // ── Issue #35 ────────────────────────────────────────────────────────────────

  test('#35: saving scanned label to library shows success', async ({ page }) => {
    await page.route(GEMINI_URL, makeGeminiHandler())
    await page.route(SUPABASE_URL, defaultSupabaseHandler)

    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE)

    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })

    // Open the name input
    await page.getByText('Save to Library').click()
    const nameInput = page.getByPlaceholder('Name this label…')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Black Beans')

    // Submit
    await page.getByRole('button', { name: 'Save' }).click()

    // Success state
    await expect(page.getByText('Saved as Black Beans!')).toBeVisible({ timeout: 8000 })
  })

  test('#35: saving with a duplicate name shows conflict resolution', async ({ page }) => {
    let geminiCalls = 0
    await page.route(GEMINI_URL, async (route) => {
      geminiCalls++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(geminiCalls === 1 ? MOCK_OCR_RESPONSE : MOCK_AI_TAGS_RESPONSE),
      })
    })

    await page.route(SUPABASE_URL, async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      if (method === 'GET' && url.includes('/labels')) {
        // Return an existing v1 label to trigger the conflict UI
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
    await expect(page.getByText('Meal totals')).toBeVisible({ timeout: 10000 })

    await page.getByText('Save to Library').click()
    await page.getByPlaceholder('Name this label…').fill('Black Beans')
    await page.getByRole('button', { name: 'Save' }).click()

    // Conflict UI
    await expect(page.getByText(/already exists/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Save as new version' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save as new label' })).toBeVisible()

    // Resolve as new version
    await page.getByRole('button', { name: 'Save as new version' }).click()
    await expect(page.getByText('Saved as Black Beans!')).toBeVisible({ timeout: 8000 })
  })
})
