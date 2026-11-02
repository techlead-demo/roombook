import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createBooking } from '@/api/bookings'
import { fetchAvailability, fetchRooms } from '@/api/rooms'
import type { Room } from '@/api/types'
import { fetchUsers } from '@/api/users'
import App from './App.vue'
import { createAppRouter } from './router'

vi.mock('@/api/rooms')
vi.mock('@/api/bookings')
vi.mock('@/api/users')

const ROOMS: Room[] = [
  { id: 4, name: 'Da Lat', capacity: 4, equipment: [], active: true },
  { id: 1, name: 'Ha Long', capacity: 12, equipment: ['TV'], active: true },
]

async function mountApp(path = '/') {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('App routing', () => {
  beforeEach(() => {
    // Mon 2 Nov 2026 08:07 office time
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T01:07:00Z'))
    vi.mocked(fetchUsers).mockResolvedValue([])
    vi.mocked(fetchRooms).mockResolvedValue(ROOMS)
    vi.mocked(fetchAvailability).mockImplementation(async (date) => ({ date, time_zone: 'Asia/Ho_Chi_Minh', day_start: '', day_end: '', rooms: [] }))
    vi.mocked(createBooking).mockResolvedValue({
      id: 10,
      room_id: 1,
      user_id: 2,
      title: 'Sprint planning',
      start_at: '2026-11-02T04:00:00Z',
      end_at: '2026-11-02T05:00:00Z',
      created_at: '2026-11-02T01:07:00Z',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('AC-1, AC-6: "Book" opens /book/<room id>; booking returns to the room list with the message until it is left', async () => {
    const { wrapper, router } = await mountApp()

    await wrapper.findAll('[data-testid="room-card"]')[1].get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/book/1')
    expect(wrapper.get('h1').text()).toBe('Book a room')

    await wrapper.get('#booking-start').setValue('11:00')
    await wrapper.get('#booking-end').setValue('12:00')
    await wrapper.get('#booking-title').setValue('Sprint planning')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('rooms')
    expect(wrapper.get('[role="status"]').text()).toBe('Booked Ha Long, Mon 2 Nov 2026, 11:00–12:00.')

    await wrapper.findAll('[data-testid="room-card"]')[0].get('button').trigger('click')
    await flushPromises()
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('rooms')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('AC-10: Cancel returns to the room list without a message', async () => {
    const { wrapper, router } = await mountApp('/book/4')

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('rooms')
    expect(wrapper.get('h1').text()).toBe('Rooms')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('sends unknown paths to the room list', async () => {
    const { router } = await mountApp('/book/abc')

    expect(router.currentRoute.value.name).toBe('rooms')
  })
})
