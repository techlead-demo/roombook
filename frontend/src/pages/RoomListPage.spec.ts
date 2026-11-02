import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAvailability, fetchRooms } from '@/api/rooms'
import type { Room } from '@/api/types'
import RoomListPage from './RoomListPage.vue'

vi.mock('@/api/rooms')

const ROOMS: Room[] = [
  { id: 4, name: 'Da Lat', capacity: 4, equipment: ['WHITEBOARD'], active: true },
  { id: 1, name: 'Ha Long', capacity: 12, equipment: ['TV'], active: true },
]

describe('RoomListPage', () => {
  beforeEach(() => {
    // Mon 2 Nov 2026 08:07 office time
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T01:07:00Z'))
    vi.mocked(fetchRooms).mockResolvedValue(ROOMS)
    vi.mocked(fetchAvailability).mockResolvedValue({
      date: '2026-11-02',
      time_zone: 'Asia/Ho_Chi_Minh',
      day_start: '2026-11-01T17:00:00Z',
      day_end: '2026-11-02T17:00:00Z',
      rooms: [{ room_id: 1, busy: [{ start_at: '2026-11-02T04:00:00Z', end_at: '2026-11-02T05:00:00Z' }] }],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('AC-1: every room card has a "Book" button that asks to book that room', async () => {
    const wrapper = mount(RoomListPage)
    await flushPromises()

    const cards = wrapper.findAll('[data-testid="room-card"]')
    expect(cards.map((card) => card.get('button').text())).toEqual(['Book', 'Book'])
    await cards[1].get('button').trigger('click')
    expect(wrapper.emitted('book')).toEqual([[1]])
  })

  it('AC-6: shows the success message above the list', async () => {
    const wrapper = mount(RoomListPage, { props: { successMessage: 'Booked Ha Long, Mon 2 Nov 2026, 11:00–12:00.' } })
    await flushPromises()

    const message = wrapper.get('[role="status"]')
    expect(message.text()).toBe('Booked Ha Long, Mon 2 Nov 2026, 11:00–12:00.')
    expect(message.classes()).toContain('alert-success')
  })

  it('AC-7: shows the new booking as a busy block on the room timeline', async () => {
    const wrapper = mount(RoomListPage)
    await flushPromises()

    const haLong = wrapper.findAll('[data-testid="room-card"]')[1]
    expect(haLong.findAll('.busy').map((block) => block.text())).toEqual(['Busy 11:00–12:00'])
  })
})
