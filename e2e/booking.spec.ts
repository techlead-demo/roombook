import { expect, type Page, test } from '@playwright/test'

const OFFICE_TIME_ZONE = 'Asia/Ho_Chi_Minh'

/** Office calendar date (YYYY-MM-DD) `days` days from today. */
function officeDate(days = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: OFFICE_TIME_ZONE }).format(new Date(Date.now() + days * 86_400_000))
}

/** Minutes since office midnight now. */
function officeMinutesNow(): number {
  const [hour, minute] = new Intl.DateTimeFormat('en-GB', { timeZone: OFFICE_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date())
    .split(':')
    .map(Number)
  return hour * 60 + minute
}

const hhmm = (minutes: number): string => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** "Mon 2 Nov 2026" */
function displayDate(date: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      .formatToParts(new Date(`${date}T00:00:00Z`))
      .map((part) => [part.type, part.value]),
  )
  return `${parts.weekday} ${parts.day} ${parts.month.slice(0, 3)} ${parts.year}`
}

function roomCard(page: Page, name: string) {
  return page.getByTestId('room-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

async function openForm(page: Page, room: string) {
  await page.goto('/')
  await roomCard(page, room).getByRole('button', { name: 'Book' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Book a room' })).toBeVisible()
}

async function fillForm(page: Page, values: { date?: string; start: string; end: string; title: string }) {
  if (values.date) await page.getByLabel('Date', { exact: true }).fill(values.date)
  await page.getByLabel('Start', { exact: true }).fill(values.start)
  await page.getByLabel('End', { exact: true }).fill(values.end)
  await page.getByLabel('Title', { exact: true }).fill(values.title)
}

test.describe('booking a room', () => {
  test('AC-1, AC-3, AC-5: "Book" opens the form for that room with today and its availability', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('room-card').getByRole('button', { name: 'Book' })).toHaveCount(6)

    await roomCard(page, 'Ha Long').getByRole('button', { name: 'Book' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Book a room' })).toBeVisible()
    await expect(page.getByLabel('Room').locator('option:checked')).toHaveText('Ha Long · up to 12 people')
    await expect(page.getByLabel('Date', { exact: true })).toHaveValue(officeDate())
    await expect(page.getByLabel('Start', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('End', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('')
    await expect(page.getByText('Times are office time (Asia/Ho_Chi_Minh), in 15-minute steps.')).toBeVisible()

    // Sample bookings for today: Ha Long 09:00–10:00 and 14:00–15:30
    const aside = page.getByRole('complementary')
    await expect(aside.getByRole('heading', { name: `Ha Long · ${displayDate(officeDate())}` })).toBeVisible()
    await expect(aside.getByText(/^Already booked: .*09:00–10:00.*14:00–15:30/)).toBeVisible()
    await expect(aside.getByText('Busy 09:00–10:00')).toBeAttached()
  })

  test('AC-2, AC-4: the room select lists active rooms by name and the side panel follows room and date', async ({ page }) => {
    await openForm(page, 'Ha Long')

    const options = page.getByLabel('Room').locator('option')
    await expect(options.first()).toHaveText('Da Lat · up to 4 people')
    await expect(options.last()).toHaveText('Sa Pa · up to 2 people')

    const date = officeDate(40)
    await page.getByLabel('Date', { exact: true }).fill(date)
    const aside = page.getByRole('complementary')
    await expect(aside.getByRole('heading', { name: `Ha Long · ${displayDate(date)}` })).toBeVisible()
    await expect(aside.getByText('No bookings on this day.')).toBeVisible()

    await page.getByLabel('Room').selectOption({ label: 'Hue · up to 6 people' })
    await expect(aside.getByRole('heading', { name: `Hue · ${displayDate(date)}` })).toBeVisible()
  })

  test('AC-6: booking a room returns to the room list with the success message', async ({ page }) => {
    const date = officeDate(1)
    await openForm(page, 'Phu Quoc')
    await fillForm(page, { date, start: '11:00', end: '12:00', title: `Sprint planning ${Date.now()}` })

    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(`Booked Phu Quoc, ${displayDate(date)}, 11:00–12:00.`)
  })

  test("AC-7: a booking for today shows up in today's availability", async ({ page, request }) => {
    // Sa Pa has no sample bookings; busy slots (e.g. from a retry or a reused server) are skipped, as BR-12 rejects overlaps
    const rooms = await (await request.get('/api/rooms')).json()
    const saPaId = rooms.find((room: { name: string }) => room.name === 'Sa Pa').id
    const busyToday = async (): Promise<{ start_at: string; end_at: string }[]> =>
      (await (await request.get(`/api/rooms/availability?date=${officeDate()}`)).json()).rooms.find(
        (room: { room_id: number }) => room.room_id === saPaId,
      ).busy
    const instantOf = (minutes: number) => new Date(`${officeDate()}T${hhmm(minutes)}:00+07:00`).getTime()
    const before = await busyToday()
    let start = Math.ceil((officeMinutesNow() + 1) / 15) * 15 + 15
    while (before.some((interval) => Date.parse(interval.start_at) < instantOf(start + 15) && Date.parse(interval.end_at) > instantOf(start))) {
      start += 15
    }
    test.skip(start + 15 > 23 * 60 + 45, 'no free 15-minute slot left today in office time')
    const end = start + 15

    await openForm(page, 'Sa Pa')
    await fillForm(page, { start: hhmm(start), end: hhmm(end), title: `Today ${Date.now()}` })
    await page.getByRole('button', { name: 'Book room' }).click()
    await expect(page.getByRole('status')).toContainText(`Booked Sa Pa, ${displayDate(officeDate())}, ${hhmm(start)}–${hhmm(end)}.`)

    if (start >= 8 * 60 && end <= 18 * 60) {
      await expect(roomCard(page, 'Sa Pa').getByText(`Busy ${hhmm(start)}–${hhmm(end)}`)).toBeAttached()
    }
    const busy = await busyToday()
    const officeTime = (instant: string) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: OFFICE_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant))
    expect(busy.map((interval) => `${officeTime(interval.start_at)}–${officeTime(interval.end_at)}`)).toContain(`${hhmm(start)}–${hhmm(end)}`)
    expect(busy.every((interval) => interval.start_at.endsWith(':00Z'))).toBe(true)
  })

  test('AC-8: a booking for another day shows in the side panel for that day, not on the room list', async ({ page }) => {
    const date = officeDate(3)
    await openForm(page, 'Sa Pa')
    await fillForm(page, { date, start: '09:00', end: '10:00', title: `Planning ${Date.now()}` })
    await page.getByRole('button', { name: 'Book room' }).click()
    await expect(page.getByRole('status')).toBeVisible()

    await expect(roomCard(page, 'Sa Pa').getByText('Busy 09:00–10:00')).toHaveCount(0)

    await roomCard(page, 'Sa Pa').getByRole('button', { name: 'Book' }).click()
    await page.getByLabel('Date', { exact: true }).fill(date)
    await expect(page.getByRole('complementary').getByText(/^Already booked: 09:00–10:00/)).toBeVisible()
  })

  test('AC-10: Cancel returns to the room list without a message', async ({ page }) => {
    await openForm(page, 'Da Lat')
    await page.getByLabel('Title', { exact: true }).fill('Not booked')

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('AC-11, AC-13: shows validation errors under the field and keeps the inputs', async ({ page }) => {
    let posted = false
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/bookings')) posted = true
    })
    await openForm(page, 'Da Lat')

    await fillForm(page, { date: officeDate(2), start: '09:10', end: '10:00', title: 'Steps' })
    await page.getByRole('button', { name: 'Book room' }).click()
    await expect(page.getByText('Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45.')).toBeVisible()
    await expect(page.getByLabel('Start', { exact: true })).toHaveValue('09:10')

    // Yesterday is in the past at any time of day
    await fillForm(page, { date: officeDate(-1), start: '09:00', end: '10:00', title: 'Past' })
    await page.getByRole('button', { name: 'Book room' }).click()
    await expect(page.getByText('Start is in the past. Choose a later time.')).toBeVisible()
    expect(posted).toBe(false)
  })

  test('AC-16, AC-17: a failing API shows an error above the form; the button is disabled while sending', async ({ page }) => {
    let release: () => void = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/bookings', async (route) => {
      await released
      await route.fulfill({ status: 500, contentType: 'application/problem+json', body: '{"status":500,"title":"Internal Server Error"}' })
    })
    await openForm(page, 'Da Lat')
    await fillForm(page, { date: officeDate(2), start: '11:00', end: '12:00', title: 'Fails' })

    const button = page.getByRole('button', { name: 'Book room' })
    await button.click()
    await expect(button).toBeDisabled()
    release()

    await expect(page.getByRole('alert')).toHaveText('Could not book the room. Try again later.')
    await expect(button).toBeEnabled()
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Fails')
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})
