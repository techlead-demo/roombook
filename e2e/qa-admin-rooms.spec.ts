import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// QA cases for RMB-4 (specs/RMB-4/test-cases.md). Each test works on its own "E2E QA …" room; the seed rooms
// are never changed.

const ADMIN = { 'X-User-Id': '1' }
const OFFICE_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function uniqueName(prefix: string): string {
  return `E2E QA ${prefix} ${Date.now().toString(36)}`
}

/** Office calendar date (YYYY-MM-DD) `days` days from today. */
function officeDate(days: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: OFFICE_TIME_ZONE }).format(new Date(Date.now() + days * 86_400_000))
}

/** UTC instant of an office wall-clock time (UTC+7, no DST). */
function utc(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString().replace('.000Z', 'Z')
}

async function createRoom(request: APIRequestContext, name: string): Promise<number> {
  const response = await request.post('/api/admin/rooms', { headers: ADMIN, data: { name, capacity: 4, equipment: [] } })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: number }).id
}

async function book(request: APIRequestContext, roomId: number, date: string, start: string, end: string) {
  return request.post('/api/bookings', {
    headers: { 'X-User-Id': '2' },
    data: { room_id: roomId, title: `QA ${start}`, start_at: utc(date, start), end_at: utc(date, end) },
  })
}

async function actAs(page: Page, userName: string): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Acting as').selectOption({ label: userName })
}

function adminRow(page: Page, name: string) {
  return page.getByTestId('admin-room-row').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

test.describe('QA RMB-4 manage rooms', () => {
  test.afterEach(async ({ request }) => {
    const response = await request.get('/api/admin/rooms', { headers: ADMIN })
    const rooms = (await response.json()) as { id: number; name: string; active: boolean }[]
    for (const room of rooms.filter((candidate) => candidate.active && candidate.name.startsWith('E2E '))) {
      await request.post(`/api/admin/rooms/${room.id}/deactivate`, { headers: ADMIN })
    }
  })

  test('TC-23, TC-24, TC-27, TC-28 (AC-17, AC-18, AC-21, AC-22): upcoming bookings are counted, cancelled and not restored', async ({ page, request }) => {
    const name = uniqueName('Bookings')
    const roomId = await createRoom(request, name)
    const tomorrow = officeDate(1)
    expect((await book(request, roomId, tomorrow, '09:00', '10:00')).status()).toBe(201)
    expect((await book(request, roomId, tomorrow, '10:00', '11:00')).status()).toBe(201)

    await actAs(page, 'An Nguyen (admin)')
    await page.getByRole('link', { name: 'Manage rooms' }).click()
    const row = adminRow(page, name)
    await row.getByRole('button', { name: 'Take out of service' }).click()
    const dialog = row.getByRole('alertdialog')
    await expect(dialog).toHaveText(
      new RegExp(`Take ${name} out of service\\? 2 upcoming bookings will be cancelled\\. Past and ongoing bookings are kept\\.`),
    )
    await dialog.getByRole('button', { name: 'Take out of service' }).click()
    await expect(page.getByRole('status')).toHaveText(`${name} is out of service. 2 bookings cancelled.`)
    await expect(row.getByText('Out of service', { exact: true })).toBeVisible()
    await expect(row.getByRole('button', { name: 'Put back in service' })).toBeVisible()

    // AC-21: hidden from availability and not bookable
    const availability = await request.get(`/api/rooms/availability?date=${tomorrow}`)
    const ids = ((await availability.json()) as { rooms: { room_id: number }[] }).rooms.map((r) => r.room_id)
    expect(ids).not.toContain(roomId)
    const rejected = await book(request, roomId, tomorrow, '13:00', '14:00')
    expect(rejected.status()).toBe(404)
    expect(((await rejected.json()) as { detail: string }).detail).toBe(`Room ${roomId} not found.`)

    // AC-22: back in service, cancelled bookings are not restored
    await row.getByRole('button', { name: 'Put back in service' }).click()
    await expect(page.getByRole('status')).toHaveText(`${name} is back in service.`)
    const after = await request.get(`/api/rooms/availability?date=${tomorrow}`)
    const room = ((await after.json()) as { rooms: { room_id: number; busy: unknown[] }[] }).rooms.find((r) => r.room_id === roomId)
    expect(room?.busy).toEqual([])
    expect((await book(request, roomId, tomorrow, '13:00', '14:00')).status()).toBe(201)
  })

  test('TC-5 (AC-1, AC-2): switching to an employee on Manage rooms and on the room form', async ({ page, request }) => {
    const name = uniqueName('Switch')
    const roomId = await createRoom(request, name)
    await actAs(page, 'An Nguyen (admin)')

    await page.getByRole('link', { name: 'Manage rooms' }).click()
    await expect(adminRow(page, name)).toBeVisible()
    await page.getByLabel('Acting as').selectOption({ label: 'Binh Tran' })
    await expect(page.getByRole('alert')).toHaveText('Only admins can manage rooms.')
    await expect(page.getByTestId('admin-room-row')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Manage rooms' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Add room' })).toHaveCount(0)

    await page.getByLabel('Acting as').selectOption({ label: 'An Nguyen (admin)' })
    await page.goto(`/admin/rooms/${roomId}/edit`)
    await expect(page.getByLabel('Name')).toHaveValue(name)
    await page.getByLabel('Acting as').selectOption({ label: 'Binh Tran' })
    await expect(page.getByRole('alert')).toHaveText('Only admins can manage rooms.')
    await expect(page.getByLabel('Name')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save room' })).toHaveCount(0)
  })

  test('TC-4 (AC-2): an employee opening the edit form by URL sees only the alert', async ({ page, request }) => {
    const roomId = await createRoom(request, uniqueName('Url'))
    await actAs(page, 'Binh Tran')

    await page.goto(`/admin/rooms/${roomId}/edit`)
    await expect(page.getByRole('alert')).toHaveText('Only admins can manage rooms.')
    await expect(page.getByRole('heading', { name: 'Edit room' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save room' })).toHaveCount(0)
  })

  test('TC-36, TC-21 (AC-15): success message disappears after leaving; room without equipment has no chips', async ({ page }) => {
    const name = uniqueName('Notice')
    await actAs(page, 'An Nguyen (admin)')
    await page.goto('/admin/rooms/new')
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Capacity').fill('1')
    await page.getByRole('button', { name: 'Save room' }).click()
    await expect(page.getByRole('status')).toHaveText(`Added ${name}.`)
    await expect(adminRow(page, name).getByText('Up to 1 people')).toBeVisible()
    await expect(adminRow(page, name).locator('.chip')).toHaveCount(0)

    await page.getByRole('link', { name: 'RoomBook' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    await page.getByRole('link', { name: 'Manage rooms' }).click()
    await expect(adminRow(page, name)).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('TC-12 (AC-8): Cancel on the Add room form stores nothing', async ({ page, request }) => {
    const name = uniqueName('Cancelled')
    await actAs(page, 'An Nguyen (admin)')
    await page.goto('/admin/rooms/new')
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Capacity').fill('5')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Manage rooms' })).toBeVisible()
    await expect(page.getByTestId('admin-room-row').first()).toBeVisible()
    await expect(adminRow(page, name)).toHaveCount(0)
    const rooms = (await (await request.get('/api/admin/rooms', { headers: ADMIN })).json()) as { name: string }[]
    expect(rooms.map((r) => r.name)).not.toContain(name)
  })
})
