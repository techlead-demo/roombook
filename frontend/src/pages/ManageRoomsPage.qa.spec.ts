import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deactivateRoom, fetchAdminRooms } from '@/api/adminRooms'
import { ApiError } from '@/api/http'
import { useNoticeStore } from '@/stores/notice'
import { actAs, seedAdminRooms, testRouter } from '@/testing/fixtures'
import ManageRoomsPage from './ManageRoomsPage.vue'

// QA cases for RMB-4 (specs/RMB-4/test-cases.md)

vi.mock('@/api/adminRooms')

async function mountPage(): Promise<VueWrapper> {
  const router = testRouter({ 'manage-rooms': ManageRoomsPage })
  await router.push('/admin/rooms')
  const wrapper = mount(ManageRoomsPage, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

function row(wrapper: VueWrapper, name: string) {
  const found = wrapper.findAll('[data-testid="admin-room-row"]').find((candidate) => candidate.get('h2').text() === name)
  if (!found) throw new Error(`No row for ${name}`)
  return found
}

function button(container: Pick<VueWrapper, 'findAll'>, text: string) {
  const found = container.findAll('button').find((candidate) => candidate.text() === text)
  if (!found) throw new Error(`No button "${text}"`)
  return found
}

describe('QA RMB-4 ManageRoomsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(fetchAdminRooms).mockResolvedValue(seedAdminRooms())
    actAs(1)
  })

  it('TC-36: the success message is gone when the screen is opened again', async () => {
    useNoticeStore().set('Added Nha Trang.')
    const first = await mountPage()
    expect(first.get('[role="status"]').text()).toBe('Added Nha Trang.')
    first.unmount()

    const second = await mountPage()
    expect(second.find('[role="status"]').exists()).toBe(false)
  })

  it('TC-23 (AC-17): confirmation for a room with exactly one upcoming booking', async () => {
    const wrapper = await mountPage()
    await button(row(wrapper, 'Hue'), 'Take out of service').trigger('click')
    await flushPromises()

    expect(row(wrapper, 'Hue').get('[role="alertdialog"]').text()).toContain(
      'Take Hue out of service? 1 upcoming booking will be cancelled. Past and ongoing bookings are kept.',
    )
    expect(row(wrapper, 'Ha Long').find('[role="alertdialog"]').exists()).toBe(false)
  })

  it.each([
    [1, 'Hue is out of service. 1 booking cancelled.'],
    [0, 'Hue is out of service. No bookings cancelled.'],
  ])('TC-24 (AC-18): success message with %i cancelled bookings', async (cancelled, message) => {
    const hue = seedAdminRooms()[3]
    vi.mocked(deactivateRoom).mockResolvedValue({ room: { ...hue, active: false, upcoming_bookings: 0 }, cancelled_bookings: cancelled })
    const wrapper = await mountPage()
    await button(row(wrapper, 'Hue'), 'Take out of service').trigger('click')
    await flushPromises()
    await button(row(wrapper, 'Hue').get('[role="alertdialog"]'), 'Take out of service').trigger('click')
    await flushPromises()

    expect(deactivateRoom).toHaveBeenCalledWith(3)
    expect(wrapper.get('[role="status"]').text()).toBe(message)
    expect(row(wrapper, 'Hue').classes()).toContain('out-of-service')
  })

  it('TC-29 (AC-23): an error replaces the earlier success message; other rows keep their status', async () => {
    useNoticeStore().set('Added Nha Trang.')
    vi.mocked(deactivateRoom).mockRejectedValue(new ApiError(500, null))
    const wrapper = await mountPage()
    await button(row(wrapper, 'Ha Long'), 'Take out of service').trigger('click')
    await flushPromises()
    await button(row(wrapper, 'Ha Long').get('[role="alertdialog"]'), 'Take out of service').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toBe('Could not change the room. Try again later.')
    expect(wrapper.findAll('.status').map((chip) => chip.text())).toEqual(Array(6).fill('In service'))
  })
})
