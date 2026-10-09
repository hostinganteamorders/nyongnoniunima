import { test, expect } from '@playwright/test'

test.describe('About Page', () => {
  test('should display about content', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { name: /tentang nyong noni/i })).toBeVisible()
  })

  test('should display vision and mission', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { name: /^visi$/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^misi$/i }).first()).toBeVisible()
  })

  test('should show founding year narrative (regression: milestone list removed)', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByText(/didirikan pada tahun 2007/i)).toBeVisible()
  })
})
