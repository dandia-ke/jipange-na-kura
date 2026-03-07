import { test, expect } from '@playwright/test'

test.describe('Planner — manual location flow', () => {
  test('selecting county populates constituency dropdown', async ({ page }) => {
    await page.goto('/planner')
    await page.getByRole('button', { name: /Enter Manually|Ingiza Mwenyewe/i }).click()

    const countySelect = page.locator('select').first()
    await countySelect.selectOption({ label: 'Nairobi' })

    const constSelect = page.locator('select').nth(1)
    await expect(constSelect).toBeEnabled()
    const options = await constSelect.locator('option').allTextContents()
    expect(options.some(o => o.includes('Westlands'))).toBe(true)
  })

  test('selecting constituency populates ward dropdown', async ({ page }) => {
    await page.goto('/planner')
    await page.getByRole('button', { name: /Enter Manually|Ingiza Mwenyewe/i }).click()

    await page.locator('select').first().selectOption({ label: 'Nairobi' })
    await page.locator('select').nth(1).selectOption({ label: 'Westlands' })

    const wardSelect = page.locator('select').nth(2)
    await expect(wardSelect).toBeEnabled()
    const options = await wardSelect.locator('option').allTextContents()
    expect(options.length).toBeGreaterThan(1)
  })

  test('completing location selection enables Next button', async ({ page }) => {
    await page.goto('/planner')
    await page.getByRole('button', { name: /Enter Manually|Ingiza Mwenyewe/i }).click()

    await page.locator('select').first().selectOption({ label: 'Nairobi' })
    await page.locator('select').nth(1).selectOption({ label: 'Westlands' })
    const wardSelect = page.locator('select').nth(2)
    const firstWard = await wardSelect.locator('option').nth(1).textContent()
    await wardSelect.selectOption({ label: firstWard! })

    const nextBtn = page.getByRole('button', { name: /Next|Endelea/i })
    await expect(nextBtn).toBeEnabled()
  })
})
