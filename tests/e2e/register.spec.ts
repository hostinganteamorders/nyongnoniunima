import { test, expect } from '@playwright/test'

test.describe('Registration Page (closed)', () => {
  test('shows Coming Soon instead of the form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /pendaftaran/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /coming soon/i })).toBeVisible()
    await expect(page.getByText(/pendaftaran nyong noni unima saat ini sedang ditutup/i)).toBeVisible()
  })

  test('does not render the multi-step form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('#full_name')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /selanjutnya/i })).toHaveCount(0)
  })

  test('provides a way back to the homepage', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('link', { name: /kembali ke beranda/i }).click()
    await expect(page).toHaveURL('/')
  })
})

// The multi-step registration flow is covered here but only runs when registration
// is open (flag `registration_open` = true). It self-skips while registration is
// closed so the suite stays green without mutating shared state across parallel tests.
test.describe('Registration Form (requires open registration)', () => {
  test('shows confirmation step with review before submitting', async ({ page }) => {
    await page.goto('/register')

    // Wait for the page to settle: either the Coming Soon card or the form renders.
    const comingSoon = page.getByRole('heading', { name: /coming soon/i })
    const fullNameField = page.locator('#full_name')
    await comingSoon.or(fullNameField).first().waitFor({ state: 'visible', timeout: 15_000 })

    if (await comingSoon.isVisible()) {
      test.skip(true, 'Registration is currently closed; form flow runs when reopened.')
    }

    // Langkah 0
    await page.fill('#full_name', 'Tes Konfirmasi Playwright')
    await page.fill('#email', `tes-konfirmasi-${Date.now()}@example.com`)
    await page.fill('#phone', '081234567890')
    await page.fill('#place_of_birth', 'Manado')
    await page.fill('#date_of_birth', '2004-01-01')
    await page.selectOption('#gender', 'Laki-laki')
    await page.fill('#nim', '20999999')
    await page.selectOption('#faculty', { index: 1 })
    await expect
      .poll(
        async () =>
          page.$$eval('#study_program option', (os) =>
            Array.from(os).map((o) => (o as HTMLOptionElement).value).filter(Boolean),
          ),
        { timeout: 10_000 },
      )
      .not.toEqual([])
    const prodi = await page.$$eval('#study_program option', (os) => Array.from(os).map((o) => (o as HTMLOptionElement).value).filter(Boolean))
    expect(prodi.length).toBeGreaterThan(0)
    await page.selectOption('#study_program', prodi[0])
    await page.fill('#semester', '4')
    await page.fill('#ipk', '3.5')
    await page.getByRole('button', { name: /selanjutnya/i }).click()
    await expect(page.getByRole('heading', { name: /alamat & fisik/i })).toBeVisible()

    // Langkah 1
    await page.fill('#address', 'Jalan Uji Coba Nomor 1, Kelurahan Verification')
    await page.fill('#city', 'Manado')
    await page.fill('#province', 'Sulawesi Utara')
    await page.fill('#height_cm', '170')
    await page.fill('#weight_kg', '60')
    await page.fill('#occupation', 'Mahasiswa')
    await page.fill('#education', 'SMA')
    await page.getByRole('button', { name: /selanjutnya/i }).click()
    await expect(page.getByRole('heading', { name: /dokumen & esai/i })).toBeVisible()

    // Langkah 2 → Konfirmasi
    await page.fill('#essay', 'Ini adalah esai motivasi uji coba untuk memastikan sistem pendaftaran berjalan baik dan lancar sekali.')
    await page.fill('#foreign_language', 'English')
    await page.check('#consent')
    await page.getByRole('button', { name: /selanjutnya/i }).click()
    await expect(page.getByRole('heading', { name: /konfirmasi/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /kirim pendaftaran/i })).toBeVisible()
    await expect(page.getByText('Tes Konfirmasi Playwright')).toBeVisible()
  })
})
