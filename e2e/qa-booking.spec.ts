import { expect, type Page, test } from '@playwright/test'

// QA cases for RMB-1 (specs/RMB-1/test-cases.md). Ha Long is never booked for today here, so its sample
// bookings (09:00–10:00, 14:00–15:30) stay as they are.

const OFFICE_TIME_ZONE = 'Asia/Ho_Chi_Minh'

/** Office calendar date (YYYY-MM-DD) `days` days from today. */
function officeDate(days = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: OFFICE_TIME_ZONE }).format(new Date(Date.now() + days * 86_400_000))
}

/** "Mon 2 Nov 2026" */
function displayDate(date: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      .formatToParts(new Date(`${date}T00:00:00Z`))
      .map((part) => [part.type, part.value]),
  )
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`
}

/** UTC instant of an office wall-clock time (the office zone is UTC+7 without DST). */
function utc(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString().replace('.000Z', 'Z')
}

function roomCard(page: Page, name: string) {
  return page.getByTestId('room-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

async function openForm(page: Page, room: string) {
  await page.goto('/')
  await roomCard(page, room).getByRole('button', { name: 'Book' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Book a room' })).toBeVisible()
}

/** Counts POST /api/bookings requests sent by the page. */
function countPosts(page: Page): () => number {
  let count = 0
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/bookings')) count++
  })
  return () => count
}

const field = (page: Page, label: string) => page.locator('.field').filter({ has: page.getByLabel(label, { exact: true }) })

async function fill(page: Page, values: { date?: string; start?: string; end?: string; title?: string }) {
  if (values.date !== undefined) await page.getByLabel('Date', { exact: true }).fill(values.date)
  if (values.start !== undefined) await page.getByLabel('Start', { exact: true }).fill(values.start)
  if (values.end !== undefined) await page.getByLabel('End', { exact: true }).fill(values.end)
  if (values.title !== undefined) await page.getByLabel('Title', { exact: true }).fill(values.title)
}

test.describe('QA RMB-1 booking a room', () => {
  test('TC-1 (AC-1): every card has "Book"; Ha Long opens the form with today and empty fields', async ({ page }) => {
    await page.goto('/')
    const cards = page.getByTestId('room-card')
    await expect(cards).toHaveCount(6)
    for (let i = 0; i < 6; i++) await expect(cards.nth(i).getByRole('button', { name: 'Book', exact: true })).toBeVisible()

    await roomCard(page, 'Ha Long').getByRole('button', { name: 'Book' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Book a room' })).toBeVisible()
    await expect(page.getByLabel('Room').locator('option:checked')).toHaveText('Ha Long · up to 12 people')
    await expect(page.getByLabel('Date', { exact: true })).toHaveValue(officeDate())
    await expect(page.getByLabel('Start', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('End', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('')
  })

  test('TC-2 (AC-2): the room select lists all active rooms A–Z with capacity', async ({ page }) => {
    await openForm(page, 'Ha Long')
    await expect(page.getByLabel('Room').locator('option')).toHaveText([
      'Da Lat · up to 4 people',
      'Ha Long · up to 12 people',
      'Hoi An · up to 8 people',
      'Hue · up to 6 people',
      'Phu Quoc · up to 20 people',
      'Sa Pa · up to 2 people',
    ])
  })

  test("TC-3 (AC-3): the side panel shows Ha Long's bookings of today with two busy blocks", async ({ page }) => {
    await openForm(page, 'Ha Long')
    const aside = page.getByRole('complementary')
    await expect(aside.getByRole('heading', { name: `Ha Long · ${displayDate(officeDate())}`, exact: true })).toBeVisible()
    await expect(aside.getByText('Already booked: 09:00–10:00, 14:00–15:30', { exact: true })).toBeVisible()
    await expect(aside.locator('.busy')).toHaveCount(2)
    await expect(aside.getByText('Busy 09:00–10:00')).toBeAttached()
    await expect(aside.getByText('Busy 14:00–15:30')).toBeAttached()
    // 08:00–18:00 scale
    await expect(aside.getByText('08', { exact: true })).toBeAttached()
    await expect(aside.getByText('18', { exact: true })).toBeAttached()
  })

  test('TC-4 (AC-4): the side panel follows the date and the room', async ({ page }) => {
    await openForm(page, 'Ha Long')
    const aside = page.getByRole('complementary')
    const date = officeDate(45)

    await fill(page, { date })
    await expect(aside.getByRole('heading', { name: `Ha Long · ${displayDate(date)}`, exact: true })).toBeVisible()
    await expect(aside.getByText('No bookings on this day.', { exact: true })).toBeVisible()
    await expect(aside.locator('.busy')).toHaveCount(0)

    await page.getByLabel('Room').selectOption({ label: 'Hue · up to 6 people' })
    await expect(aside.getByRole('heading', { name: `Hue · ${displayDate(date)}`, exact: true })).toBeVisible()

    // Hue's bookings of a day that has some (today's sample bookings 08:30–09:00 and 16:00–17:00)
    await fill(page, { date: officeDate() })
    await expect(aside.getByRole('heading', { name: `Hue · ${displayDate(officeDate())}`, exact: true })).toBeVisible()
    await expect(aside.getByText(/^Already booked: .*08:30–09:00.*16:00–17:00/)).toBeVisible()
  })

  test('TC-5 (AC-5): the time hint is shown below Start and End', async ({ page }) => {
    await openForm(page, 'Ha Long')
    const hint = page.getByText('Times are office time (Asia/Ho_Chi_Minh), in 15-minute steps.', { exact: true })
    await expect(hint).toBeVisible()
    const hintBox = await hint.boundingBox()
    const endBox = await page.getByLabel('End', { exact: true }).boundingBox()
    expect(hintBox!.y).toBeGreaterThan(endBox!.y)
  })

  test('TC-6 (AC-6, AC-8): booking Ha Long on another day stores UTC instants, shows the message and the side panel', async ({
    page,
    request,
  }) => {
    const date = officeDate(9)
    const title = `Sprint planning ${Date.now()}`
    await openForm(page, 'Ha Long')
    await fill(page, { date, start: '11:00', end: '12:00', title })
    const posted = page.waitForRequest((req) => req.method() === 'POST' && req.url().includes('/api/bookings'))

    await page.getByRole('button', { name: 'Book room' }).click()

    const body = (await posted).postDataJSON()
    expect(body).toMatchObject({ title, start_at: utc(date, '11:00'), end_at: utc(date, '12:00') })
    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    const message = page.getByRole('status')
    await expect(message).toHaveText(`Booked Ha Long, ${displayDate(date)}, 11:00–12:00.`)
    await expect(message).toHaveClass(/alert-success/)
    // Above the list
    const messageBox = await message.boundingBox()
    const firstCard = await page.getByTestId('room-card').first().boundingBox()
    expect(messageBox!.y).toBeLessThan(firstCard!.y)

    const rooms = await (await request.get('/api/rooms')).json()
    const haLongId = rooms.find((room: { name: string }) => room.name === 'Ha Long').id
    const availability = await (await request.get(`/api/rooms/availability?date=${date}`)).json()
    const busy = availability.rooms.find((room: { room_id: number }) => room.room_id === haLongId).busy
    expect(busy).toContainEqual({ start_at: utc(date, '11:00'), end_at: utc(date, '12:00') })

    // AC-8: not on today's room list ...
    await expect(roomCard(page, 'Ha Long').locator('.busy')).toHaveCount(2)
    await expect(roomCard(page, 'Ha Long').getByText('Busy 11:00–12:00')).toHaveCount(0)
    // ... but in the side panel for that day
    await roomCard(page, 'Ha Long').getByRole('button', { name: 'Book' }).click()
    await fill(page, { date })
    await expect(page.getByRole('complementary').getByText('Already booked: 11:00–12:00', { exact: true })).toBeVisible()
  })

  test('TC-11 (AC-10): Cancel shows the room list and sends no booking', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '10:00', end: '11:00', title: 'Cancelled' })

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
    expect(posts()).toBe(0)
  })

  test('TC-12 (AC-11): a start of 09:10 shows the step error under Start and keeps the inputs', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '09:10', end: '10:00', title: 'Steps' })
    await page.getByRole('button', { name: 'Book room' }).click()

    const start = field(page, 'Start')
    await expect(start).toHaveClass(/invalid/)
    await expect(start.locator('.field-error')).toHaveText('Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45.')
    await expect(field(page, 'End').locator('.field-error')).toHaveCount(0)
    await expect(page.getByLabel('Start', { exact: true })).toHaveValue('09:10')
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Steps')
    expect(posts()).toBe(0)
  })

  test('TC-13 (AC-11): an end of 10:05 shows the step error under End', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '09:00', end: '10:05', title: 'Steps' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(field(page, 'End').locator('.field-error')).toHaveText('Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45.')
    await expect(field(page, 'Start').locator('.field-error')).toHaveCount(0)
    expect(posts()).toBe(0)
  })

  test('TC-14 (AC-12): an end equal to the start shows "End must be after start."', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '11:00', end: '11:00', title: 'Zero' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(field(page, 'End').locator('.field-error')).toHaveText('End must be after start.')
    expect(posts()).toBe(0)
  })

  test('TC-15 (AC-12): an end before the start shows "End must be after start."', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '11:00', end: '10:45', title: 'Backwards' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(field(page, 'End').locator('.field-error')).toHaveText('End must be after start.')
    expect(posts()).toBe(0)
  })

  test('TC-16 (AC-13): a start earlier today shows "Start is in the past. Choose a later time."', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    // 00:00 today is in the past at any time of day after midnight
    await fill(page, { start: '00:00', end: '00:15', title: 'Past' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(field(page, 'Start').locator('.field-error')).toHaveText('Start is in the past. Choose a later time.')
    await expect(page.getByLabel('Date', { exact: true })).toHaveValue(officeDate())
    expect(posts()).toBe(0)
  })

  test('TC-18 (AC-14): empty date, start, end and title each show their message', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    await fill(page, { date: '' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(field(page, 'Date').locator('.field-error')).toHaveText('Choose a date.')
    await expect(field(page, 'Start').locator('.field-error')).toHaveText('Choose a start time.')
    await expect(field(page, 'End').locator('.field-error')).toHaveText('Choose an end time.')
    await expect(field(page, 'Title').locator('.field-error')).toHaveText('Enter a title.')
    expect(posts()).toBe(0)
  })

  test('TC-19 (AC-14): a title of only spaces shows "Enter a title."', async ({ page }) => {
    const posts = countPosts(page)
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '09:00', end: '10:00', title: '     ' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(field(page, 'Title').locator('.field-error')).toHaveText('Enter a title.')
    expect(posts()).toBe(0)
  })

  test('TC-20 (AC-15): typing more than 100 characters keeps only the first 100', async ({ page }) => {
    await openForm(page, 'Hue')
    const text = `${'a'.repeat(100)}bcdefghij`
    const title = page.getByLabel('Title', { exact: true })
    await title.pressSequentially(text)
    await expect(title).toHaveValue('a'.repeat(100))
  })

  test('TC-21 (AC-16): an API rejection shows its ProblemDetail detail above the form', async ({ page }) => {
    await page.route('**/api/bookings', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: '{"status":401,"title":"Unauthorized","detail":"Unknown user"}',
      }),
    )
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '09:00', end: '10:00', title: 'Rejected' })
    await page.getByRole('button', { name: 'Book room' }).click()

    const alert = page.locator('form .alert-danger')
    await expect(alert).toHaveText('Unknown user')
    await expect(page.getByRole('heading', { level: 1, name: 'Book a room' })).toBeVisible()
    await expect(page.getByLabel('Start', { exact: true })).toHaveValue('09:00')
    await expect(page.getByLabel('End', { exact: true })).toHaveValue('10:00')
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Rejected')
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('TC-22 (AC-16): a 500 without detail shows the generic error text', async ({ page }) => {
    await page.route('**/api/bookings', (route) => route.fulfill({ status: 500, body: '' }))
    await openForm(page, 'Hue')
    await fill(page, { date: officeDate(5), start: '09:00', end: '10:00', title: 'Broken' })
    await page.getByRole('button', { name: 'Book room' }).click()

    await expect(page.locator('form .alert-danger')).toHaveText('Could not book the room. Try again later.')
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Broken')
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('TC-23 (AC-17): a double click while the request runs creates one booking', async ({ page }) => {
    const posts = countPosts(page)
    let release: () => void = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/bookings', async (route) => {
      await released
      await route.continue()
    })
    const date = officeDate(11)
    await openForm(page, 'Hue')
    await fill(page, { date, start: '13:00', end: '13:30', title: `Once ${Date.now()}` })

    const button = page.getByRole('button', { name: 'Book room' })
    await button.dblclick()
    await expect(button).toBeDisabled()
    release()

    await expect(page.getByRole('status')).toHaveText(`Booked Hue, ${displayDate(date)}, 13:00–13:30.`)
    expect(posts()).toBe(1)
  })

  test('TC-39: the success message disappears when the user leaves the room list', async ({ page }) => {
    const date = officeDate(12)
    await openForm(page, 'Da Lat')
    await fill(page, { date, start: '15:00', end: '15:15', title: `Leave ${Date.now()}` })
    await page.getByRole('button', { name: 'Book room' }).click()
    await expect(page.getByRole('status')).toBeVisible()

    await roomCard(page, 'Da Lat').getByRole('button', { name: 'Book' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})
