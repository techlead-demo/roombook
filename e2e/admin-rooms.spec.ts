import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Each test works on its own new room so the seed rooms stay untouched for other tests.
function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`
}

async function createRoomViaApi(request: APIRequestContext, name: string, capacity = 5): Promise<number> {
  const response = await request.post('/api/admin/rooms', {
    headers: { 'X-User-Id': '1' },
    data: { name, capacity, equipment: ['TV'] },
  })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: number }).id
}

async function actAs(page: Page, userName: string): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Acting as').selectOption({ label: userName })
}

function adminRow(page: Page, name: string) {
  return page.getByTestId('admin-room-row').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

test.describe('manage rooms', () => {
  // Rooms cannot be deleted: take this file's rooms out of service so other tests see only the seed rooms as active.
  test.afterEach(async ({ request }) => {
    const response = await request.get('/api/admin/rooms', { headers: { 'X-User-Id': '1' } })
    const rooms = (await response.json()) as { id: number; name: string; active: boolean }[]
    for (const room of rooms.filter((candidate) => candidate.active && candidate.name.startsWith('E2E '))) {
      await request.post(`/api/admin/rooms/${room.id}/deactivate`, { headers: { 'X-User-Id': '1' } })
    }
  })

  test('AC-1, AC-4, AC-6, AC-7: an admin adds a room that then appears on the room list', async ({ page }) => {
    const name = uniqueName('E2E Added')
    await actAs(page, 'An Nguyen (admin)')

    await page.getByRole('link', { name: 'Manage rooms' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Manage rooms' })).toBeVisible()
    await expect(adminRow(page, 'Ha Long').getByText('Up to 12 people')).toBeVisible()
    await expect(adminRow(page, 'Ha Long').getByText('In service', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Add room' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Add room' })).toBeVisible()
    await page.getByLabel('Name').fill(`  ${name}  `)
    await page.getByLabel('Capacity').fill('10')
    await page.getByLabel('TV').check()
    await page.getByLabel('Whiteboard').check()
    await page.getByRole('button', { name: 'Save room' }).click()

    await expect(page.getByRole('status')).toHaveText(`Added ${name}.`)
    const row = adminRow(page, name)
    await expect(row.getByText('Up to 10 people')).toBeVisible()
    await expect(row.locator('.chip')).toHaveText(['TV', 'Whiteboard'])

    await page.getByRole('link', { name: 'RoomBook' }).click()
    const card = page.getByTestId('room-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
    await expect(card.getByText('Up to 10 people')).toBeVisible()

    await card.getByRole('button', { name: 'Book' }).click()
    await expect(page.getByLabel('Room').locator('option:checked')).toHaveText(`${name} · up to 10 people`)
  })

  test('AC-1, AC-2: an employee has no link and no access', async ({ page }) => {
    await actAs(page, 'Binh Tran')
    await expect(page.getByRole('link', { name: 'Manage rooms' })).toHaveCount(0)

    await page.goto('/admin/rooms')
    await expect(page.getByRole('alert')).toHaveText('Only admins can manage rooms.')
    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(page.getByTestId('admin-room-row')).toHaveCount(0)

    await page.goto('/admin/rooms/new')
    await expect(page.getByRole('alert')).toHaveText('Only admins can manage rooms.')
  })

  test('AC-9, AC-10, AC-12, AC-13, AC-14: an admin edits a room with validation', async ({ page, request }) => {
    const name = uniqueName('E2E Edit')
    await createRoomViaApi(request, name, 6)
    await actAs(page, 'An Nguyen (admin)')
    await page.goto('/admin/rooms')

    await adminRow(page, name).getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Edit room' })).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveValue(name)
    await expect(page.getByLabel('Capacity')).toHaveValue('6')
    await expect(page.getByLabel('TV')).toBeChecked()
    await expect(page.getByLabel('Video conference')).not.toBeChecked()

    await page.getByLabel('Name').fill('   ')
    await page.getByLabel('Capacity').fill('101')
    await page.getByRole('button', { name: 'Save room' }).click()
    await expect(page.getByText('Enter a name.')).toBeVisible()
    await expect(page.getByText('Enter a whole number from 1 to 100.')).toBeVisible()

    await page.getByLabel('Name').fill(' HA LONG ')
    await page.getByLabel('Capacity').fill('8')
    await page.getByRole('button', { name: 'Save room' }).click()
    await expect(page.getByText('A room with this name already exists.')).toBeVisible()

    const renamed = `${name} Garden`
    await page.getByLabel('Name').fill(renamed)
    await page.getByLabel('TV').uncheck()
    await page.getByLabel('Video conference').check()
    await page.getByRole('button', { name: 'Save room' }).click()

    await expect(page.getByRole('status')).toHaveText(`Saved ${renamed}.`)
    await expect(adminRow(page, renamed).getByText('Up to 8 people')).toBeVisible()
    await expect(adminRow(page, renamed).locator('.chip')).toHaveText(['Video conference'])
  })

  test('AC-8: Cancel leaves the room unchanged', async ({ page, request }) => {
    const name = uniqueName('E2E Cancel')
    await createRoomViaApi(request, name, 6)
    await actAs(page, 'An Nguyen (admin)')
    await page.goto('/admin/rooms')

    await adminRow(page, name).getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('Capacity').fill('9')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Manage rooms' })).toBeVisible()
    await expect(adminRow(page, name).getByText('Up to 6 people')).toBeVisible()
  })

  test('AC-17, AC-18, AC-20, AC-21, AC-22: an admin takes a room out of service and puts it back', async ({ page, request }) => {
    const name = uniqueName('E2E Service')
    await createRoomViaApi(request, name)
    await actAs(page, 'An Nguyen (admin)')
    await page.goto('/admin/rooms')
    const row = adminRow(page, name)

    await row.getByRole('button', { name: 'Take out of service' }).click()
    const dialog = row.getByRole('alertdialog')
    await expect(dialog).toContainText(`Take ${name} out of service? It has no upcoming bookings.`)
    await dialog.getByRole('button', { name: 'Keep in service' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(row.getByText('In service', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: 'Take out of service' }).click()
    await dialog.getByRole('button', { name: 'Take out of service' }).click()
    await expect(page.getByRole('status')).toHaveText(`${name} is out of service. No bookings cancelled.`)
    await expect(row.getByText('Out of service', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'RoomBook' }).click()
    await expect(page.getByTestId('room-card').first()).toBeVisible()
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0)
    await page.getByTestId('room-card').first().getByRole('button', { name: 'Book' }).click()
    await expect(page.getByLabel('Room').locator('option').first()).toBeAttached()
    await expect(page.getByLabel('Room').locator('option', { hasText: name })).toHaveCount(0)

    await page.getByRole('link', { name: 'Manage rooms' }).click()
    await row.getByRole('button', { name: 'Put back in service' }).click()
    await expect(page.getByRole('status')).toHaveText(`${name} is back in service.`)
    await expect(row.getByText('In service', { exact: true })).toBeVisible()
    await expect(row.getByRole('button', { name: 'Take out of service' })).toBeVisible()

    await page.getByRole('link', { name: 'RoomBook' }).click()
    const card = page.getByTestId('room-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
    await card.getByRole('button', { name: 'Book' }).click()
    await expect(page.getByLabel('Room').locator('option:checked')).toHaveText(`${name} · up to 5 people`)
  })
})
