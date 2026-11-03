import { type APIRequestContext, expect, type Page, test } from '@playwright/test'

const OFFICE_TIME_ZONE = 'Asia/Ho_Chi_Minh'

/** Random day 100–3099 days ahead, so that a rerun against a reused server does not meet the bookings of the previous run. */
const FRESH_BASE_DAYS = 100 + Math.floor(Math.random() * 3000)

/** A future office date (YYYY-MM-DD) that no other test uses; each test passes its own `offset`, so they never share a day. */
function freshOfficeDate(offset: number): string {
  const days = FRESH_BASE_DAYS + offset
  return new Intl.DateTimeFormat('en-CA', { timeZone: OFFICE_TIME_ZONE }).format(new Date(Date.now() + days * 86_400_000))
}

/** "Mon 2 Nov 2026" */
function displayDate(date: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      .formatToParts(new Date(`${date}T00:00:00Z`))
      .map((part) => [part.type, part.value]),
  )
  return `${parts.weekday} ${parts.day} ${parts.month.slice(0, 3)} ${parts.year}`
}

/** UTC instant of an office date and time (the office is UTC+7 without daylight saving). */
const instant = (date: string, time: string): string => new Date(`${date}T${time}:00+07:00`).toISOString().replace('.000Z', 'Z')

/** Books a room directly through the API as Chi Le, as "another user" would. */
async function bookAsChiLe(request: APIRequestContext, room: string, date: string, start: string, end: string) {
  const rooms: { id: number; name: string }[] = await (await request.get('/api/rooms')).json()
  const users: { id: number; name: string }[] = await (await request.get('/api/users')).json()
  const response = await request.post('/api/bookings', {
    headers: { 'X-User-Id': String(users.find((user) => user.name === 'Chi Le')!.id) },
    data: { room_id: rooms.find((r) => r.name === room)!.id, title: `Other ${Date.now()}`, start_at: instant(date, start), end_at: instant(date, end) },
  })
  expect(response.status()).toBe(201)
}

async function openForm(page: Page, room: string) {
  await page.goto('/')
  await page
    .getByTestId('room-card')
    .filter({ has: page.getByRole('heading', { name: room, exact: true }) })
    .getByRole('button', { name: 'Book' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Book a room' })).toBeVisible()
}

async function fillForm(page: Page, values: { date?: string; start: string; end: string; title?: string }) {
  if (values.date) await page.getByLabel('Date', { exact: true }).fill(values.date)
  await page.getByLabel('Start', { exact: true }).fill(values.start)
  await page.getByLabel('End', { exact: true }).fill(values.end)
  if (values.title) await page.getByLabel('Title', { exact: true }).fill(values.title)
}

test.describe('double booking', () => {
  test('AC-11, AC-12: an overlapping booking shows the API error and keeps the form; a free time then books', async ({ page, request }) => {
    const date = freshOfficeDate(0)
    await bookAsChiLe(request, 'Ha Long', date, '09:00', '10:00')
    const title = `Sprint planning ${Date.now()}`

    await openForm(page, 'Ha Long')
    await fillForm(page, { date, start: '09:00', end: '10:00', title })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(page.getByRole('alert')).toHaveText(
      `Ha Long is already booked from 09:00 to 10:00 on ${displayDate(date)}. Choose another time or another room.`,
    )
    await expect(page.getByRole('heading', { level: 1, name: 'Book a room' })).toBeVisible()
    await expect(page.getByLabel('Room').locator('option:checked')).toHaveText('Ha Long · up to 12 people')
    await expect(page.getByLabel('Date', { exact: true })).toHaveValue(date)
    await expect(page.getByLabel('Start', { exact: true })).toHaveValue('09:00')
    await expect(page.getByLabel('End', { exact: true })).toHaveValue('10:00')
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(title)
    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByRole('complementary').getByText(/^Already booked: 09:00–10:00$/)).toBeVisible()

    await fillForm(page, { start: '10:00', end: '11:00' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(`Booked Ha Long, ${displayDate(date)}, 10:00–11:00.`)
  })

  test('AC-13: after a 409 the side panel reloads and shows the booking made meanwhile', async ({ page, request }) => {
    const date = freshOfficeDate(1)
    await bookAsChiLe(request, 'Ha Long', date, '09:00', '10:00')
    await bookAsChiLe(request, 'Ha Long', date, '14:00', '15:30')

    await openForm(page, 'Ha Long')
    await page.getByLabel('Date', { exact: true }).fill(date)
    const aside = page.getByRole('complementary')
    await expect(aside.getByText('Already booked: 09:00–10:00, 14:00–15:30')).toBeVisible()

    await bookAsChiLe(request, 'Ha Long', date, '11:00', '12:00')
    await fillForm(page, { start: '11:00', end: '12:00', title: `Too late ${Date.now()}` })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(page.getByRole('alert')).toHaveText(
      `Ha Long is already booked from 11:00 to 12:00 on ${displayDate(date)}. Choose another time or another room.`,
    )
    await expect(aside.getByText('Already booked: 09:00–10:00, 11:00–12:00, 14:00–15:30')).toBeVisible()
    await expect(aside.getByText('Busy 11:00–12:00')).toBeAttached()
  })
})
