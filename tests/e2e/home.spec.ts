import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should display the hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /nyong noni/i }).first()).toBeVisible()
  })

  test('should display navigation links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /tentang/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /finalis/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /galeri/i }).first()).toBeVisible()
  })

  test('should have register button', async ({ page }) => {
    await page.goto('/')
    const registerBtn = page.getByRole('link', { name: /daftar sekarang/i })
    await expect(registerBtn.first()).toBeVisible()
  })

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /tentang/i }).first().click()
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('heading', { name: /tentang nyong noni/i }).first()).toBeVisible()
  })
})
