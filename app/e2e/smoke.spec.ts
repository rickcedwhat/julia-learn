import { test, expect } from '@playwright/test'

test('page loads and shows header', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Julia')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Library' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Recipes' })).toBeVisible()
})

test('library page loads', async ({ page }) => {
  await page.goto('/library')
  // Either shows labels or empty state
  await expect(page).toHaveURL('/library')
  await expect(page.getByText('Julia')).toBeVisible()
})

test('settings page loads', async ({ page }) => {
  await page.goto('/settings')
  await expect(page).toHaveURL('/settings')
})
