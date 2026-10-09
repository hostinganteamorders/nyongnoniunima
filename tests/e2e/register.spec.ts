import { test, expect } from '@playwright/test'

test.describe('Registration Page', () => {
  test('should display multi-step form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /pendaftaran/i })).toBeVisible()
  })

  test('should display step indicator', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText(/data diri/i).first()).toBeVisible()
    await expect(page.getByText(/alamat/i).first()).toBeVisible()
  })

  test('should have next and previous buttons', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('button', { name: /selanjutnya/i })).toBeVisible()
  })

  test('shows confirmation step with review before submitting (regression: premature submit)', async ({ page }) => {
    await page.goto('/register')

    // Langkah 0
    await page.fill('#full_name', 'Tes Konfirmasi Playwright')
    await page.fill('#email', `tes-konfirmasi-${Date.now()}@example.com`)
    await page.fill('#phone', '081234567890')
    await page.fill('#place_of_birth', 'Manado')
    await page.fill('#date_of_birth', '2004-01-01')
    await page.selectOption('#gender', 'Laki-laki')
    await page.fill('#nim', '20999999')
    await page.selectOption('#faculty', { index: 1 })
    await page.waitForTimeout(400)
    const prodi = await page.$$eval('#study_program option', (os) => Array.from(os).map((o) => (o as HTMLOptionElement).value).filter(Boolean))
    expect(prodi.length).toBeGreaterThan(0)
    await page.selectOption('#study_program', prodi[0])
    await page.fill('#semester', '5')
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

    // Langkah 2 → Konfirmasi (regresi: tombol Selanjutnya tidak boleh memicu submit prematur)
    await page.fill('#essay', 'Ini adalah esai motivasi uji coba untuk memastikan sistem pendaftaran berjalan baik dan lancar sekali.')
    await page.check('#consent')
    await page.getByRole('button', { name: /selanjutnya/i }).click()
    await expect(page.getByRole('heading', { name: /konfirmasi/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /kirim pendaftaran/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /mengirim/i })).toHaveCount(0)
    await expect(page.getByText('Tes Konfirmasi Playwright')).toBeVisible()
  })
})
