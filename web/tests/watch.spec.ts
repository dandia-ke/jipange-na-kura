import { test, expect } from '@playwright/test'

test.describe('Watch page', () => {
  test('loads and shows countdown', async ({ page }) => {
    await page.goto('/watch')
    await expect(page.getByText(/Days until Election Day|Siku hadi/i)).toBeVisible()
  })

  test('report form requires consent before submit', async ({ page }) => {
    await page.goto('/watch')
    await page.getByRole('button', { name: /Submit a Report|Wasilisha Ripoti/i }).first().click()

    const submitBtn = page.getByRole('button', { name: /Submit Report|Tuma Ripoti/i })
    await expect(submitBtn).toBeDisabled()

    await page.getByLabel(/I confirm/i).check()
    // Still disabled without required fields filled — confirms consent alone isn't enough
    await expect(submitBtn).toBeDisabled()
  })
})
