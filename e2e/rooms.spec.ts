import { expect, test } from '@playwright/test'

test.describe('room list', () => {
  test("shows every active room with today's availability", async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    const cards = page.getByTestId('room-card')
    await expect(cards).toHaveCount(6)
    await expect(cards.first().getByRole('heading', { level: 2 })).toHaveText('Da Lat')

    // Sample bookings for today: Ha Long is busy 09:00–10:00 office time
    const haLong = cards.filter({ has: page.getByRole('heading', { name: 'Ha Long' }) })
    await expect(haLong.getByText('Busy 09:00–10:00')).toBeAttached()
  })

  test('lets the user pick who they are acting as', async ({ page }) => {
    await page.goto('/')

    const picker = page.getByLabel('Acting as')
    await expect(picker.locator('option')).toHaveCount(6)
    await picker.selectOption({ label: 'Chi Le' })
    await page.reload()
    await expect(picker.locator('option:checked')).toHaveText('Chi Le')
  })
})
