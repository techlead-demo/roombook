import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBooking } from '@/api/bookings'
import { ApiError } from '@/api/http'
import { fetchAvailability, fetchRooms } from '@/api/rooms'
import type { Availability, Booking, Room } from '@/api/types'
import BookingFormPage from './BookingFormPage.vue'

vi.mock('@/api/rooms')
vi.mock('@/api/bookings')

const ROOMS: Room[] = [
  { id: 4, name: 'Da Lat', capacity: 4, equipment: ['WHITEBOARD'], active: true },
  { id: 1, name: 'Ha Long', capacity: 12, equipment: ['TV'], active: true },
  { id: 3, name: 'Hoi An', capacity: 8, equipment: [], active: true },
  { id: 2, name: 'Hue', capacity: 6, equipment: [], active: true },
  { id: 5, name: 'Phu Quoc', capacity: 20, equipment: [], active: true },
  { id: 6, name: 'Sa Pa', capacity: 2, equipment: [], active: true },
]

function availability(date: string, rooms: Availability['rooms']): Availability {
  return { date, time_zone: 'Asia/Ho_Chi_Minh', day_start: '', day_end: '', rooms }
}

const AVAILABILITY: Record<string, Availability> = {
  '2026-11-02': availability('2026-11-02', [
    {
      room_id: 1,
      busy: [
        { start_at: '2026-11-02T02:00:00Z', end_at: '2026-11-02T03:00:00Z' },
        { start_at: '2026-11-02T07:00:00Z', end_at: '2026-11-02T08:30:00Z' },
      ],
    },
  ]),
  '2026-11-03': availability('2026-11-03', [
    { room_id: 1, busy: [] },
    { room_id: 2, busy: [{ start_at: '2026-11-03T03:00:00Z', end_at: '2026-11-03T04:30:00Z' }] },
  ]),
}

const BOOKING: Booking = {
  id: 10,
  room_id: 1,
  user_id: 2,
  title: 'Sprint planning',
  start_at: '2026-11-02T04:00:00Z',
  end_at: '2026-11-02T05:00:00Z',
  created_at: '2026-11-02T01:07:00Z',
}

async function mountForm() {
  const wrapper = mount(BookingFormPage, { props: { roomId: 1 } })
  await flushPromises()
  return wrapper
}

async function fill(wrapper: Awaited<ReturnType<typeof mountForm>>, values: Record<string, string>) {
  for (const [id, value] of Object.entries(values)) await wrapper.get(`#booking-${id}`).setValue(value)
}

describe('BookingFormPage', () => {
  beforeEach(() => {
    // Mon 2 Nov 2026 08:07 office time
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T01:07:00Z'))
    vi.mocked(fetchRooms).mockResolvedValue(ROOMS)
    vi.mocked(fetchAvailability).mockImplementation(async (date) => AVAILABILITY[date] ?? availability(date, []))
    vi.mocked(createBooking).mockResolvedValue(BOOKING)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('AC-1: opens with the room preselected, today as date and empty start, end and title', async () => {
    const wrapper = await mountForm()

    expect(wrapper.get('h1').text()).toBe('Book a room')
    const select = wrapper.get<HTMLSelectElement>('#booking-room').element
    expect(select.options[select.selectedIndex].text).toBe('Ha Long · up to 12 people')
    expect(wrapper.get<HTMLInputElement>('#booking-date').element.value).toBe('2026-11-02')
    expect(wrapper.get<HTMLInputElement>('#booking-start').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('#booking-end').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('#booking-title').element.value).toBe('')
  })

  it('AC-2: lists every active room as "<name> · up to <capacity> people" in API order (by name)', async () => {
    const wrapper = await mountForm()

    const options = wrapper.findAll('#booking-room option').map((option) => option.text())
    expect(options).toEqual([
      'Da Lat · up to 4 people',
      'Ha Long · up to 12 people',
      'Hoi An · up to 8 people',
      'Hue · up to 6 people',
      'Phu Quoc · up to 20 people',
      'Sa Pa · up to 2 people',
    ])
  })

  it("AC-3: shows the room's bookings of the chosen date beside the form", async () => {
    const wrapper = await mountForm()

    const aside = wrapper.get('aside')
    expect(aside.get('h2').text()).toBe('Ha Long · Mon 2 Nov 2026')
    expect(aside.text()).toContain('Already booked: 09:00–10:00, 14:00–15:30')
    expect(aside.findAll('.busy').map((block) => block.text())).toEqual(['Busy 09:00–10:00', 'Busy 14:00–15:30'])
  })

  it('AC-4: follows the chosen date and room', async () => {
    const wrapper = await mountForm()

    await wrapper.get('#booking-date').setValue('2026-11-03')
    await flushPromises()
    const aside = wrapper.get('aside')
    expect(aside.get('h2').text()).toBe('Ha Long · Tue 3 Nov 2026')
    expect(aside.text()).toContain('No bookings on this day.')
    expect(aside.findAll('.busy')).toHaveLength(0)

    await wrapper.get('#booking-room').setValue(2)
    await flushPromises()
    expect(aside.get('h2').text()).toBe('Hue · Tue 3 Nov 2026')
    expect(aside.text()).toContain('Already booked: 10:00–11:30')
  })

  it('shows "Could not load availability." when availability fails, and the form stays usable', async () => {
    vi.mocked(fetchAvailability).mockRejectedValue(new Error('offline'))
    const wrapper = await mountForm()

    expect(wrapper.get('aside').text()).toContain('Could not load availability.')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('AC-5: shows the office time hint below start and end', async () => {
    const wrapper = await mountForm()

    expect(wrapper.get('.hint').text()).toBe('Times are office time (Asia/Ho_Chi_Minh), in 15-minute steps.')
  })

  it('AC-6: sends the office times as UTC instants and reports the booking', async () => {
    const wrapper = await mountForm()
    await fill(wrapper, { start: '11:00', end: '12:00', title: 'Sprint planning' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createBooking).toHaveBeenCalledWith({
      room_id: 1,
      title: 'Sprint planning',
      start_at: '2026-11-02T04:00:00Z',
      end_at: '2026-11-02T05:00:00Z',
    })
    expect(wrapper.emitted('booked')).toEqual([['Booked Ha Long, Mon 2 Nov 2026, 11:00–12:00.']])
  })

  it('AC-9: sends the title without leading and trailing spaces', async () => {
    const wrapper = await mountForm()
    await fill(wrapper, { start: '11:00', end: '12:00', title: '  Retro  ' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(vi.mocked(createBooking).mock.calls[0][0].title).toBe('Retro')
  })

  it('AC-10: Cancel goes back without booking', async () => {
    const wrapper = await mountForm()
    await fill(wrapper, { start: '11:00', end: '12:00', title: 'Sprint planning' })

    await wrapper.get('button[type="button"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('AC-11: shows the step error under Start, keeps the inputs and sends no request', async () => {
    const wrapper = await mountForm()
    await fill(wrapper, { start: '09:10', end: '10:00', title: 'Sprint planning' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const startField = wrapper.get('#booking-start').element.closest('.field') as HTMLElement
    expect(startField.classList).toContain('invalid')
    expect(startField.textContent).toContain('Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45.')
    expect(wrapper.get<HTMLInputElement>('#booking-start').element.value).toBe('09:10')
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('AC-12, AC-13, AC-14: shows each validation error under its field', async () => {
    const wrapper = await mountForm()
    await fill(wrapper, { start: '08:00', end: '08:00', title: '   ' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const errorOf = (id: string) => (wrapper.get(`#booking-${id}`).element.closest('.field') as HTMLElement).querySelector('.field-error')?.textContent
    expect(errorOf('start')).toBe('Start is in the past. Choose a later time.')
    expect(errorOf('end')).toBe('End must be after start.')
    expect(errorOf('title')).toBe('Enter a title.')
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('AC-13: books with start 08:15 at 08:07 after the past-start error', async () => {
    const wrapper = await mountForm()
    await fill(wrapper, { start: '08:00', end: '09:00', title: 'Stand-up' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#booking-start-error').text()).toBe('Start is in the past. Choose a later time.')
    expect(createBooking).not.toHaveBeenCalled()

    await fill(wrapper, { start: '08:15' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('#booking-start-error').exists()).toBe(false)
    expect(createBooking).toHaveBeenCalledWith({
      room_id: 1,
      title: 'Stand-up',
      start_at: '2026-11-02T01:15:00Z',
      end_at: '2026-11-02T02:00:00Z',
    })
    expect(wrapper.emitted('booked')).toHaveLength(1)
  })

  it('AC-15: keeps only the first 100 characters of the title', async () => {
    const wrapper = await mountForm()
    const input = wrapper.get<HTMLInputElement>('#booking-title')

    expect(input.attributes('maxlength')).toBe('100')
    await input.setValue('x'.repeat(120))
    expect(input.element.value).toHaveLength(100)
  })

  it('AC-16: shows the ProblemDetail detail above the form and keeps the inputs', async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError(401, { status: 401, title: 'Unauthorized', detail: 'Unknown user' }))
    const wrapper = await mountForm()
    await fill(wrapper, { start: '11:00', end: '12:00', title: 'Sprint planning' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('form .alert-danger').text()).toBe('Unknown user')
    expect(wrapper.get<HTMLInputElement>('#booking-title').element.value).toBe('Sprint planning')
    expect(wrapper.emitted('booked')).toBeUndefined()
  })

  it('AC-16: shows the generic error when the failure has no detail', async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError(500, null))
    const wrapper = await mountForm()
    await fill(wrapper, { start: '11:00', end: '12:00', title: 'Sprint planning' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('form .alert-danger').text()).toBe('Could not book the room. Try again later.')
    expect(wrapper.emitted('booked')).toBeUndefined()
  })

  it('AC-17: disables "Book room" while the request is in progress', async () => {
    let resolve: (booking: Booking) => void = () => {}
    vi.mocked(createBooking).mockReturnValue(new Promise((r) => (resolve = r)))
    const wrapper = await mountForm()
    await fill(wrapper, { start: '11:00', end: '12:00', title: 'Sprint planning' })

    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(createBooking).toHaveBeenCalledTimes(1)

    resolve(BOOKING)
    await flushPromises()
    expect(wrapper.emitted('booked')).toHaveLength(1)
  })
})
