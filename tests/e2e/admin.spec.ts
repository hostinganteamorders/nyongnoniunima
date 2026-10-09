import { test, expect } from '@playwright/test'

test.describe('Admin', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: /nyong noni unima/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('should not appear in homepage navigation', async ({ page }) => {
    await page.goto('/')
    const adminLinks = page.getByRole('link', { name: /admin/i })
    await expect(adminLinks).toHaveCount(0)
  })

  test('unauthenticated /admin stays on page with inline prompt or dashboard', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin$/)
    await expect(
      page.getByRole('heading', { name: /dashboard|silakan login/i }),
    ).toBeVisible()
  })

  test('auth-gated pages show login prompt instead of empty state (regression)', async ({ page }) => {
    await page.goto('/admin/gallery')
    await expect(page.getByRole('heading', { name: /silakan login/i })).toBeVisible()
    await expect(page.getByText('Belum ada foto')).toHaveCount(0)
  })

  test('current titleholder edit modal uses text URL field with upload (regression)', async ({ page }) => {
    await page.goto('/admin/current-titleholders')
    await expect(page.getByRole('heading', { name: /current titleholder|titleholder/i }).first()).toBeVisible()

    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('button').first().click()

    await expect(page.getByRole('heading', { name: /edit titleholder/i })).toBeVisible()

    const photoUrl = page.locator('input[placeholder="/images/... atau https://..."]')
    await expect(photoUrl).toBeVisible()
    await expect(photoUrl).toHaveAttribute('type', 'text')

    await expect(page.locator('input[type="file"]')).toBeVisible()

    const preview = page.locator('img[alt="Pratinjau foto"]')
    await expect(preview).toBeVisible()
    const src = await preview.getAttribute('src')
    expect(src).toMatch(/^(\/images\/|https?:\/\/)/)

    // Regresi: nilai path relatif tidak lagi memblokir submit native validation,
    // dan pesan kejujuran muncul untuk tamu (belum login).
    await page.getByRole('button', { name: /^simpan$/i }).click()
    await expect(
      page.getByText(/silakan login terlebih dahulu|gagal menyimpan data|data berhasil diperbarui/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('upload without login shows honest login message (regression)', async ({ page }) => {
    await page.goto('/admin/current-titleholders')

    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('button').first().click()
    await expect(page.getByRole('heading', { name: /edit titleholder/i })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'uji-upload.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    })

    await expect(page.getByText(/silakan login terlebih dahulu/i)).toBeVisible()
  })
})
